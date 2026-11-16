"""Authoritative academic calculations and transactional registration rules."""
from collections import defaultdict
from decimal import Decimal
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from .models import Attendance, AuditEvent, Course, Offering, Registration, Result, Student


def audit(actor, action, target, detail):
    AuditEvent.objects.create(actor=actor, action=action, target=str(target), detail=detail)


def profile(student):
    return {'student_id': student.student_id, 'name': student.user.get_full_name(), 'email': student.user.email,
            'program': student.curriculum.program if student.curriculum else 'B.Sc. in Computer Science & Engineering',
            'curriculum': str(student.curriculum) if student.curriculum else None, 'batch': student.batch,
            'semester': student.semester, 'advisor': student.advisor, 'phone': student.phone, 'status': student.status}


def _matching(requirements, ordered_courses):
    """Augment course-to-slot matching, inserting earned courses before active.

    Adding an active course may reroute an earned course to another valid slot,
    but cannot evict it. Thus earned completion is maximal and remains maximal
    while the active allocation is expanded around it.
    """
    assignment = {}
    allowed = defaultdict(list)
    for requirement in requirements:
        for course in requirement.courses.all():
            allowed[course.id].append(requirement.id)
    def place(course_id, seen):
        for requirement_id in allowed[course_id]:
            if requirement_id in seen:
                continue
            seen.add(requirement_id)
            previous = assignment.get(requirement_id)
            if previous is None or place(previous, seen):
                assignment[requirement_id] = course_id
                return True
        return False
    for course_id in ordered_courses:
        place(course_id, set())
    return assignment


def progress(student):
    empty = {'available': False, 'required_credits': 0, 'earned_credits': 0, 'in_progress_credits': 0, 'remaining_credits': 0,
             'credit_percentage': 0, 'total_courses': 0, 'completed_courses': 0, 'course_percentage': 0, 'courses': [], 'extra_courses': []}
    if student.curriculum_id is None:
        return empty
    requirements = list(student.curriculum.requirements.prefetch_related('courses').all())
    if not requirements or sum(r.credits for r in requirements) <= 0:
        return empty
    passed = {}
    for result in student.results.filter(published=True, passed=True).select_related('offering__course', 'offering__term').order_by('offering__term__starts_on', 'id'):
        passed[result.offering.course_id] = result
    active = {}
    finalized_offerings = set(student.results.filter(published=True).values_list('offering_id', flat=True))
    for registration in student.registrations.filter(status='approved', offering__term__active=True).select_related('offering__course', 'offering__term').order_by('id'):
        if registration.offering.course_id not in passed and registration.offering_id not in finalized_offerings:
            active[registration.offering.course_id] = registration
    # Specific core requirements are filled before elective slots. Matching can reassign
    # a flexible elective to preserve a course needed by a less flexible requirement.
    requirements.sort(key=lambda r: (r.category != 'core', r.position, r.id))
    allocation = _matching(requirements, [*passed, *active])
    completed = {requirement_id: course_id for requirement_id, course_id in allocation.items() if course_id in passed}
    current = {requirement_id: course_id for requirement_id, course_id in allocation.items() if course_id in active}
    rows = []
    for requirement in requirements:
        course_id = completed.get(requirement.id) or current.get(requirement.id)
        result = passed.get(course_id) if requirement.id in completed else None
        registration = active.get(course_id) if requirement.id in current else None
        course = result.offering.course if result else registration.offering.course if registration else None
        item = result or registration
        rows.append({'id': requirement.id, 'code': course.code if course else requirement.code,
                     'title': course.title if course else requirement.title, 'title_bn': course.title_bn if course else requirement.title_bn,
                     'credits': float(requirement.credits), 'category': requirement.category,
                     'status': 'completed' if result else 'in_progress' if registration else 'remaining',
                     'term': item.offering.term.name if item else None, 'grade': result.grade if result else None})
    allocated = set(completed.values()) | set(current.values())
    extras = []
    for course_id, item in {**active, **passed}.items():
        if course_id not in allocated:
            course = item.offering.course
            extras.append({'id': course.id, 'code': course.code, 'title': course.title, 'title_bn': course.title_bn,
                           'credits': float(course.credits), 'category': 'extra', 'status': 'completed' if course_id in passed else 'in_progress',
                           'term': item.offering.term.name, 'grade': item.grade if course_id in passed else None})
    required = sum(r.credits for r in requirements)
    earned = sum(Decimal(str(r['credits'])) for r in rows if r['status'] == 'completed')
    ongoing = sum(Decimal(str(r['credits'])) for r in rows if r['status'] == 'in_progress')
    return {'available': True, 'required_credits': float(required), 'earned_credits': float(earned), 'in_progress_credits': float(ongoing),
            'remaining_credits': float(required - earned - ongoing), 'credit_percentage': round(float(earned / required * 100), 2),
            'total_courses': len(requirements), 'completed_courses': len(completed), 'course_percentage': round(len(completed) / len(requirements) * 100, 2),
            'courses': rows, 'extra_courses': extras}


def results_summary(student):
    groups = defaultdict(list)
    for result in student.results.filter(published=True).select_related('offering__course', 'offering__term').order_by('offering__term__starts_on', 'offering__course__code'):
        groups[result.offering.term].append(result)
    semesters, all_points, all_credits = [], Decimal('0'), Decimal('0')
    for term, results in groups.items():
        credits = sum((r.credits for r in results), Decimal('0'))
        points = sum((r.credits * r.grade_points for r in results), Decimal('0'))
        semesters.append({'term': term.name, 'gpa': round(float(points / credits), 2) if credits else None, 'credits': float(credits),
                          'results': [{'id': r.id, 'code': r.offering.course.code, 'title': r.offering.course.title,
                                       'credits': float(r.credits), 'grade': r.grade, 'grade_points': float(r.grade_points), 'passed': r.passed} for r in results]})
        all_points += points
        all_credits += credits
    return {'semesters': semesters, 'cgpa': round(float(all_points / all_credits), 2) if all_credits else None}


def attendance_summary(student):
    items = []
    for registration in student.registrations.filter(status='approved', offering__term__active=True).select_related('offering__course').order_by('offering__course__code'):
        offering = registration.offering
        records = {a.meeting_id: a.status for a in Attendance.objects.filter(student=student, meeting__offering=offering)}
        sessions, present, held, unmarked = [], 0, 0, 0
        for meeting in offering.meetings.filter(cancelled=False, date__lte=timezone.localdate()).order_by('date'):
            status = records.get(meeting.id, 'unmarked')
            sessions.append({'date': meeting.date.isoformat(), 'status': status})
            if status in ['present', 'absent']:
                held += 1
                present += status == 'present'
            elif status == 'unmarked':
                unmarked += 1
        items.append({'offering_id': offering.id, 'code': offering.course.code, 'title': offering.course.title,
                      'present': present, 'held': held, 'unmarked': unmarked, 'percentage': round(present / held * 100, 2) if held else None, 'sessions': sessions})
    return items


def fees_summary(student):
    invoices, total, paid = [], Decimal('0'), Decimal('0')
    for invoice in student.invoices.prefetch_related('payments').all():
        payments = list(invoice.payments.order_by('date', 'id'))
        invoice_paid = sum((p.amount for p in payments), Decimal('0'))
        outstanding = invoice.amount - invoice_paid
        invoices.append({'id': invoice.id, 'reference': invoice.reference, 'description': invoice.description, 'amount': float(invoice.amount),
                         'paid': float(invoice_paid), 'outstanding': float(outstanding), 'due_date': invoice.due_date.isoformat(),
                         'status': 'paid' if not outstanding else 'partial' if invoice_paid else 'unpaid',
                         'payments': [{'id': p.id, 'reference': p.reference, 'amount': float(p.amount), 'date': p.date.isoformat()} for p in payments]})
        total += invoice.amount
        paid += invoice_paid
    return {'total': float(total), 'paid': float(paid), 'outstanding': float(total - paid), 'invoices': invoices}


def registration_error(student, offering, excluding=None):
    today = timezone.localdate()
    if not offering.term.active:
        return 'Registration is unavailable for this semester.'
    if not offering.term.registration_opens <= today <= offering.term.registration_closes:
        return 'Registration is closed.'
    approved = offering.registrations.filter(status='approved')
    if excluding:
        approved = approved.exclude(pk=excluding)
    if approved.count() >= offering.capacity:
        return 'This section has reached capacity.'
    passed = set(student.results.filter(published=True, passed=True).values_list('offering__course_id', flat=True))
    if offering.course_id in passed:
        return 'This course is already completed. Retake registration is outside this demo.'
    missing = list(offering.course.prerequisites.exclude(id__in=passed).values_list('code', flat=True))
    if missing:
        return 'Missing prerequisites: ' + ', '.join(missing) + '.'
    existing = student.registrations.filter(offering__term=offering.term, status__in=['pending', 'approved']).select_related('offering__course')
    if excluding:
        existing = existing.exclude(pk=excluding)
    if existing.filter(offering__course=offering.course).exists():
        return 'A registration for this course already exists.'
    credits = sum((r.offering.course.credits for r in existing), Decimal('0'))
    if credits + offering.course.credits > offering.term.credit_limit:
        return 'Semester credit limit exceeded.'
    for registration in existing:
        for left in registration.offering.schedule:
            for right in offering.schedule:
                if left['day'] == right['day'] and left['start'] < right['end'] and right['start'] < left['end']:
                    return f'Timetable clash with {registration.offering.course.code}.'
    return ''


@transaction.atomic
def request_registration(student, offering_id, actor):
    # All student-term mutations take the student lock, then offering lock. This
    # serializes cross-section credit checks without deadlocking approval paths.
    student = Student.objects.select_for_update().get(pk=student.pk)
    offering = Offering.objects.select_for_update().select_related('course', 'term').get(pk=offering_id)
    if Registration.objects.filter(student=student, offering=offering).exists():
        raise ValidationError('A registration for this section already exists.')
    error = registration_error(student, offering)
    if error:
        raise ValidationError(error)
    registration = Registration.objects.create(student=student, offering=offering)
    audit(actor, 'registration.requested', registration.pk, f'{student.student_id}: {offering.course.code}')
    return registration


@transaction.atomic
def decide_registration(registration_id, decision, note, actor):
    initial = Registration.objects.select_related('student', 'offering').get(pk=registration_id)
    Student.objects.select_for_update().get(pk=initial.student_id)
    Offering.objects.select_for_update().get(pk=initial.offering_id)
    registration = Registration.objects.select_for_update().select_related('student', 'offering__course', 'offering__term').get(pk=registration_id)
    if registration.status != 'pending':
        raise ValidationError('This request has already been decided.')
    if decision not in ['approved', 'rejected']:
        raise ValidationError('Decision must be approved or rejected.')
    if decision == 'approved':
        error = registration_error(registration.student, registration.offering, excluding=registration.pk)
        if error:
            raise ValidationError(error)
    registration.status, registration.decision_note = decision, note
    registration.save(update_fields=['status', 'decision_note'])
    audit(actor, f'registration.{decision}', registration.pk, f'{registration.student.student_id}: {registration.offering.course.code}; {note}')
    return registration
