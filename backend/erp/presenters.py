from .models import Registration
from .services import registration_error


def user_data(user):
    student = getattr(user, 'student', None)
    return {'id': user.id, 'username': user.username, 'first_name': user.first_name, 'last_name': user.last_name,
            'role': 'admin' if user.is_staff else 'student', 'student_id': student.student_id if student else None}


def offering_data(offering, student=None):
    registration = Registration.objects.filter(student=student, offering=offering).first() if student else None
    reason = registration_error(student, offering, excluding=registration.pk if registration else None) if student else ''
    if registration:
        reason = 'A registration for this section already exists.'
    return {'id': offering.id, 'code': offering.course.code, 'title': offering.course.title, 'title_bn': offering.course.title_bn,
            'credits': float(offering.course.credits), 'term': offering.term.name, 'section': offering.section, 'instructor': offering.instructor,
            'capacity': offering.capacity, 'enrolled': offering.registrations.filter(status='approved').count(),
            'prerequisites': list(offering.course.prerequisites.values_list('code', flat=True)), 'schedule': offering.schedule,
            'eligible': not bool(reason), 'reason': reason, 'registration_status': registration.status if registration else None}


def registration_data(registration, include_student=False):
    row = {'id': registration.id, 'offering': offering_data(registration.offering, registration.student), 'status': registration.status,
           'requested_at': registration.requested_at.isoformat(), 'decision_note': registration.decision_note}
    if include_student:
        row['student'] = {'id': registration.student.id, 'name': registration.student.user.get_full_name(), 'student_id': registration.student.student_id}
    return row


def notice_data(notice):
    return {'id': notice.id, 'title': notice.title, 'title_bn': notice.title_bn, 'body': notice.body, 'body_bn': notice.body_bn,
            'published_at': notice.published_at.isoformat(), 'category': notice.category}


def result_data(result):
    return {'id': result.id, 'student_id': result.student.student_id, 'student_name': result.student.user.get_full_name(),
            'code': result.offering.course.code, 'title': result.offering.course.title, 'term': result.offering.term.name,
            'grade': result.grade, 'grade_points': float(result.grade_points), 'published': result.published}
