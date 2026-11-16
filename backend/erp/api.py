import json
from datetime import date, time
from decimal import Decimal, InvalidOperation
from django.contrib.auth import authenticate, login, logout
from django.core.exceptions import ObjectDoesNotExist
from django.db import IntegrityError, transaction
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler
from .models import AdmitCard, Attendance, AuditEvent, Course, Invoice, Meeting, Notice, Offering, Payment, Registration, Result, Student, Term
from .presenters import notice_data, offering_data, registration_data, result_data, user_data
from .services import attendance_summary, audit, decide_registration, fees_summary, profile, progress, request_registration, results_summary


def exception_handler(exc, context):
    if isinstance(exc, ObjectDoesNotExist):
        exc = NotFound('Record not found.')
    if isinstance(exc, IntegrityError):
        exc = ValidationError('This record already exists or violates a data constraint.')
    response = drf_exception_handler(exc, context)
    if response is not None:
        data = response.data
        if isinstance(data, dict) and 'detail' in data:
            detail = str(data['detail'])
        elif isinstance(data, list):
            detail = ' '.join(map(str, data))
        else:
            detail = '; '.join(f'{k}: {v}' for k, v in data.items())
        response.data = {'detail': detail}
    return response


def csrf_failure(request, reason=''):
    return JsonResponse({'detail': 'CSRF verification failed. Refresh the page and try again.'}, status=403)


@require_GET
@ensure_csrf_cookie
def csrf(request):
    return JsonResponse({'csrfToken': get_token(request)})


@require_POST
@csrf_protect
def sign_in(request):
    # Ordinary Django view: CSRF is required even before a session exists.
    try:
        body = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({'detail': 'Invalid JSON.'}, status=400)
    if not isinstance(body, dict) or not isinstance(body.get('username'), str) or not isinstance(body.get('password'), str):
        return JsonResponse({'detail': 'Username and password are required.'}, status=400)
    # Bounded per-process counter for the local demo. Configure a shared cache
    # and edge rate limiting before running a multi-worker public deployment.
    from django.core.cache import cache
    key = 'login:' + request.META.get('REMOTE_ADDR', 'unknown')
    attempts = cache.get(key, 0)
    if attempts >= 20:
        return JsonResponse({'detail': 'Too many sign-in attempts. Try again in one minute.'}, status=429)
    user = authenticate(request, username=body['username'], password=body['password'])
    if user is None:
        cache.set(key, attempts + 1, 60)
        return JsonResponse({'detail': 'Invalid username or password.'}, status=400)
    cache.delete(key)
    login(request, user)
    return JsonResponse({'user': user_data(user)})


@api_view(['POST'])
def sign_out(request):
    logout(request)
    return Response({'detail': 'Signed out.'})


@api_view(['GET'])
def me(request):
    return Response({'user': user_data(request.user)})


def my_student(request):
    student = getattr(request.user, 'student', None)
    if student is None:
        raise PermissionDenied('This page is available to student accounts.')
    return student


@api_view(['GET'])
def my_profile(request):
    return Response(profile(my_student(request)))


@api_view(['GET'])
def my_progress(request):
    return Response(progress(my_student(request)))


def available_notices():
    return Notice.objects.filter(published_at__lte=timezone.now())


@api_view(['GET'])
def my_dashboard(request):
    student = my_student(request)
    fees = fees_summary(student)
    term = Term.objects.filter(active=True).last()
    return Response({'profile': profile(student), 'progress': progress(student), 'attendance': attendance_summary(student),
                     'gpa_trend': [{'term': s['term'], 'gpa': s['gpa']} for s in results_summary(student)['semesters']],
                     'fees': {k: fees[k] for k in ['total', 'paid', 'outstanding']},
                     'notices': [notice_data(n) for n in available_notices()[:4]], 'current_term': term.name if term else ''})


@api_view(['GET'])
def courses(request):
    student = getattr(request.user, 'student', None)
    return Response([offering_data(o, student) for o in Offering.objects.filter(term__active=True).select_related('course', 'term').order_by('course__code', 'section')])


@api_view(['GET', 'POST'])
def my_registrations(request):
    student = my_student(request)
    if request.method == 'POST':
        offering_id = positive_id(request.data.get('offering_id'))
        registration = request_registration(student, offering_id, request.user)
        return Response(registration_data(registration), status=201)
    return Response([registration_data(r) for r in student.registrations.filter(offering__term__active=True).select_related('student__user', 'offering__course', 'offering__term')])


@api_view(['GET'])
def my_routine(request):
    items = []
    for r in my_student(request).registrations.filter(status='approved', offering__term__active=True).select_related('offering__course'):
        o = r.offering
        for index, schedule in enumerate(o.schedule):
            items.append({'id': f'{o.id}-{index}', 'code': o.course.code, 'title': o.course.title, 'section': o.section, 'instructor': o.instructor, **schedule})
    return Response(items)


@api_view(['GET'])
def my_results(request): return Response(results_summary(my_student(request)))


@api_view(['GET'])
def my_attendance(request): return Response(attendance_summary(my_student(request)))


@api_view(['GET'])
def my_fees(request): return Response(fees_summary(my_student(request)))


@api_view(['GET'])
def notices(request): return Response([notice_data(n) for n in available_notices()])


@api_view(['GET'])
def my_admit_card(request):
    student = my_student(request)
    card = student.admit_cards.filter(term__active=True, issued=True).select_related('term').first()
    if card is None:
        return Response({'available': False, 'reason': 'A demonstration admit card has not been issued for this semester.'})
    return Response({'available': True, 'reason': '', 'student': {'name': student.user.get_full_name(), 'student_id': student.student_id, 'program': profile(student)['program']},
                     'term': card.term.name, 'exams': card.exams, 'document_label': 'DEMONSTRATION ONLY — NOT AN OFFICIAL UNIVERSITY DOCUMENT'})


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_overview(request):
    outstanding = sum((fees_summary(s)['outstanding'] for s in Student.objects.all()), 0)
    return Response({'students': Student.objects.count(), 'pending_registrations': Registration.objects.filter(status='pending', offering__term__active=True).count(),
                     'active_offerings': Offering.objects.filter(term__active=True).count(), 'outstanding_fees': outstanding})


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_registrations(request):
    return Response([registration_data(r, True) for r in Registration.objects.filter(offering__term__active=True).select_related('student__user', 'offering__course', 'offering__term')])


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_decision(request, pk):
    note = request.data.get('note', '')
    if not isinstance(note, str) or len(note) > 2000:
        raise ValidationError('Decision note must be text up to 2000 characters.')
    return Response(registration_data(decide_registration(pk, request.data.get('decision'), note, request.user), True))


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_students(request):
    return Response([{'id': s.id, **profile(s)} for s in Student.objects.select_related('user', 'curriculum')])


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_results(request):
    return Response([result_data(r) for r in Result.objects.select_related('student__user', 'offering__course', 'offering__term').order_by('-offering__term__starts_on', 'student__student_id', 'offering__course__code')])


@api_view(['POST'])
@permission_classes([IsAdminUser])
@transaction.atomic
def admin_publish_result(request, pk):
    result = Result.objects.select_for_update().select_related('student__user', 'offering__course', 'offering__term').get(pk=pk)
    if not result.published:
        result.published = True
        result.save(update_fields=['published'])
        audit(request.user, 'result.published', result.pk, f'{result.student.student_id}: {result.offering.course.code}, {result.grade}')
    return Response(result_data(result))


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_setup(request):
    return Response({'courses': [{'id': c.id, 'code': c.code, 'title': c.title, 'credits': float(c.credits)} for c in Course.objects.order_by('code')],
                     'terms': [{'id': t.id, 'name': t.name} for t in Term.objects.order_by('-active', '-starts_on')],
                     'students': [{'id': s.id, 'name': s.user.get_full_name(), 'student_id': s.student_id} for s in Student.objects.select_related('user')]})


def positive_id(value):
    try:
        if isinstance(value, bool): raise ValueError
        result = int(value)
        if result < 1 or str(result) != str(value): raise ValueError
        return result
    except (ValueError, TypeError):
        raise ValidationError('A valid positive record ID is required.')


def text_field(data, field, limit=200):
    value = data.get(field)
    if not isinstance(value, str) or not value.strip() or len(value) > limit:
        raise ValidationError(f'{field} is required and must be text up to {limit} characters.')
    return value.strip()


def money(value):
    try:
        amount = Decimal(str(value))
        if not amount.is_finite() or amount <= 0 or amount > Decimal('9999999999.99') or amount != amount.quantize(Decimal('.01')):
            raise ValueError
        return amount
    except (InvalidOperation, ValueError, TypeError):
        raise ValidationError('Amount must be positive with at most two decimal places.')


def iso_date(value):
    try: return date.fromisoformat(value)
    except (ValueError, TypeError): raise ValidationError('A date in YYYY-MM-DD format is required.')


def validate_schedule(value):
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    if not isinstance(value, list) or not value:
        raise ValidationError('At least one schedule entry is required.')
    for item in value:
        if not isinstance(item, dict) or item.get('day') not in days:
            raise ValidationError('Each meeting needs a valid day.')
        try:
            start, end = time.fromisoformat(item['start']), time.fromisoformat(item['end'])
            if start >= end or not isinstance(item['room'], str) or not item['room'].strip(): raise ValueError
        except (KeyError, ValueError, TypeError):
            raise ValidationError('Each meeting needs valid start/end times and a room.')
        item['start'], item['end'] = start.strftime('%H:%M'), end.strftime('%H:%M')
    return value


@api_view(['POST'])
@permission_classes([IsAdminUser])
@transaction.atomic
def admin_offerings(request):
    course = Course.objects.get(pk=positive_id(request.data.get('course_id')))
    term = Term.objects.get(pk=positive_id(request.data.get('term_id')))
    offering = Offering.objects.create(course=course, term=term, section=text_field(request.data, 'section', 15),
                                      instructor=text_field(request.data, 'instructor', 120), capacity=positive_id(request.data.get('capacity')),
                                      schedule=validate_schedule(request.data.get('schedule')))
    audit(request.user, 'offering.created', offering.pk, f'{course.code}: {term.name}, {offering.section}')
    return Response(offering_data(offering), status=201)


@api_view(['POST'])
@permission_classes([IsAdminUser])
@transaction.atomic
def admin_attendance(request):
    offering = Offering.objects.select_for_update().get(pk=positive_id(request.data.get('offering_id')))
    meeting_date = iso_date(request.data.get('date'))
    if meeting_date > timezone.localdate(): raise ValidationError('Attendance cannot be recorded for a future class.')
    records = request.data.get('records')
    if not isinstance(records, list): raise ValidationError('records must be a list.')
    cancelled = request.data.get('cancelled', False)
    if not isinstance(cancelled, bool): raise ValidationError('cancelled must be true or false.')
    validated, seen = [], set()
    for row in records:
        if not isinstance(row, dict): raise ValidationError('Attendance rows must be objects.')
        student_id = positive_id(row.get('student_id'))
        if student_id in seen: raise ValidationError('Duplicate student in attendance submission.')
        seen.add(student_id)
        if row.get('status') not in ['present', 'absent', 'excused']: raise ValidationError('Invalid attendance status.')
        if not Registration.objects.filter(student_id=student_id, offering=offering, status='approved').exists():
            raise ValidationError('Attendance can only be recorded for approved students.')
        validated.append((student_id, row['status']))
    meeting, _ = Meeting.objects.update_or_create(offering=offering, date=meeting_date, defaults={'cancelled': cancelled})
    for student_id, status in validated:
        Attendance.objects.update_or_create(student_id=student_id, meeting=meeting, defaults={'status': status})
    audit(request.user, 'attendance.updated', meeting.pk, f'{offering.course.code}: {meeting_date}, {len(validated)} marks, cancelled={cancelled}')
    return Response({'detail': 'Attendance saved.', 'meeting_id': meeting.pk})


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
@transaction.atomic
def admin_invoices(request):
    if request.method == 'GET':
        invoices = []
        for student in Student.objects.select_related('user'):
            invoices.extend({**row, 'student_id': student.student_id, 'student_name': student.user.get_full_name()} for row in fees_summary(student)['invoices'])
        return Response(invoices)
    student = Student.objects.get(pk=positive_id(request.data.get('student_id')))
    invoice = Invoice.objects.create(student=student, reference=text_field(request.data, 'reference', 60), description=text_field(request.data, 'description'),
                                     amount=money(request.data.get('amount')), due_date=iso_date(request.data.get('due_date')))
    audit(request.user, 'invoice.created', invoice.pk, f'{student.student_id}: {invoice.reference}, BDT {invoice.amount}')
    return Response({'id': invoice.id, 'detail': 'Demonstration invoice created.'}, status=201)


@api_view(['POST'])
@permission_classes([IsAdminUser])
@transaction.atomic
def admin_payments(request):
    invoice = Invoice.objects.select_for_update().get(pk=positive_id(request.data.get('invoice_id')))
    amount = money(request.data.get('amount'))
    paid = sum((p.amount for p in invoice.payments.all()), Decimal('0'))
    if amount > invoice.amount - paid: raise ValidationError('Payment exceeds the outstanding invoice balance.')
    payment = Payment.objects.create(invoice=invoice, reference=text_field(request.data, 'reference', 60), amount=amount, date=iso_date(request.data.get('date')))
    audit(request.user, 'payment.recorded', payment.pk, f'{invoice.student.student_id}: {payment.reference}, BDT {payment.amount}')
    return Response({'id': payment.id, 'detail': 'Demonstration payment recorded.'}, status=201)


@api_view(['POST'])
@permission_classes([IsAdminUser])
@transaction.atomic
def admin_notices(request):
    fields = {name: text_field(request.data, name, 10000 if name.startswith('body') else 200) for name in ['title', 'title_bn', 'body', 'body_bn']}
    notice = Notice.objects.create(**fields, category=text_field(request.data, 'category', 40), published_at=timezone.now())
    audit(request.user, 'notice.published', notice.pk, notice.title)
    return Response(notice_data(notice), status=201)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_audit(request):
    return Response([{'id': event.id, 'actor': event.actor.username if event.actor else 'Deleted account', 'action': event.action,
                      'target': event.target, 'detail': event.detail, 'created_at': event.created_at.isoformat()} for event in AuditEvent.objects.select_related('actor')[:200]])
