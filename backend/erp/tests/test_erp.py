from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from decimal import Decimal
from threading import Barrier
import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.db import close_old_connections, transaction
from django.test import Client
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework.exceptions import ValidationError
from erp.models import Attendance, AuditEvent, Course, Curriculum, Invoice, Meeting, Offering, Payment, Registration, Requirement, Result, Student, Term
from erp.services import attendance_summary, decide_registration, fees_summary, progress, request_registration, results_summary


@pytest.fixture
def records(db, settings):
    settings.PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']
    U = get_user_model()
    user = U.objects.create_user('teststudent', password='test-password', first_name='One')
    other = U.objects.create_user('other', password='test-password', first_name='Two')
    admin = U.objects.create_user('testadmin', password='test-password', is_staff=True)
    curriculum = Curriculum.objects.create(name='Test', version='test')
    today = timezone.localdate()
    term = Term.objects.create(name='Current', starts_on=today, registration_opens=today-timedelta(days=1), registration_closes=today+timedelta(days=20), credit_limit=18, active=True)
    past = Term.objects.create(name='Past', starts_on=today-timedelta(days=180), registration_opens=today-timedelta(days=180), registration_closes=today-timedelta(days=160), active=False)
    course = Course.objects.create(code='CSE101', title='Foundations', title_bn='ভিত্তি', credits=3)
    requirement = Requirement.objects.create(curriculum=curriculum, code='CSE101', title='Foundations', title_bn='ভিত্তি', credits=3)
    requirement.courses.add(course)
    student = Student.objects.create(user=user, student_id='TEST-1', curriculum=curriculum)
    second = Student.objects.create(user=other, student_id='TEST-2', curriculum=curriculum)
    schedule = [{'day':'Monday','start':'09:00','end':'10:00','room':'A1'}]
    offering = Offering.objects.create(course=course, term=term, instructor='Teacher', capacity=10, schedule=schedule)
    return {'student':student,'second':second,'user':user,'other':other,'admin':admin,'curriculum':curriculum,'requirement':requirement,'course':course,'offering':offering,'term':term,'past':past}


def api_as(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


def published(records, student=None, course=None, **kwargs):
    course = course or records['course']
    offering, _ = Offering.objects.get_or_create(course=course, term=records['past'], section=kwargs.pop('section','A'), defaults={'instructor':'Teacher','capacity':30,'schedule':[]})
    return Result.objects.create(student=student or records['student'], offering=offering, grade=kwargs.pop('grade','A'), grade_points=kwargs.pop('grade_points',Decimal('3.75')), published=kwargs.pop('published',True), passed=kwargs.pop('passed',True), **kwargs)


def test_csrf_required_before_login(records):
    client = Client(enforce_csrf_checks=True)
    payload = {'username':'teststudent','password':'test-password'}
    response = client.post('/api/v1/auth/login/', payload, content_type='application/json')
    assert response.status_code == 403
    token = client.get('/api/v1/auth/csrf/').json()['csrfToken']
    response = client.post('/api/v1/auth/login/', payload, content_type='application/json', HTTP_X_CSRFTOKEN=token)
    assert response.status_code == 200
    assert response.json()['user']['student_id'] == 'TEST-1'
    # Login rotates CSRF; use the new cookie, then logout also needs a token.
    assert client.post('/api/v1/auth/logout/', {}, content_type='application/json').status_code == 403
    assert client.post('/api/v1/auth/logout/', {}, content_type='application/json', HTTP_X_CSRFTOKEN=client.cookies['csrftoken'].value).status_code == 200


@pytest.mark.parametrize('endpoint', ['me/profile/','me/dashboard/','me/progress/','me/results/','me/fees/','me/attendance/','me/routine/','me/admit-card/','courses/','notices/'])
def test_all_student_data_requires_login(records, endpoint):
    assert APIClient().get('/api/v1/'+endpoint).status_code == 403


@pytest.mark.parametrize('endpoint', ['overview/','registrations/','students/','setup/','results/','audit/'])
def test_student_cannot_access_staff_data(records, endpoint):
    assert api_as(records['user']).get('/api/v1/admin/'+endpoint).status_code == 403


def test_student_identity_derived_from_session(records):
    published(records, student=records['second'])
    Invoice.objects.create(student=records['second'],reference='OTHER-PRIVATE',description='Private',amount=500,due_date=timezone.localdate())
    client = api_as(records['user'])
    assert client.get('/api/v1/me/results/?student_id=TEST-2').json()['semesters'] == []
    assert client.get('/api/v1/me/fees/?student_id=TEST-2').json()['invoices'] == []
    assert client.get('/api/v1/me/profile/?student_id=TEST-2').json()['student_id'] == 'TEST-1'


def test_missing_curriculum_is_not_zero_completion(records):
    student = records['student']; student.curriculum = None; student.save()
    assert progress(student)['available'] is False


def test_zero_progress_and_draft_failed_records(records):
    assert progress(records['student'])['available'] is True
    assert progress(records['student'])['credit_percentage'] == 0
    result = published(records, published=False)
    assert progress(records['student'])['earned_credits'] == 0
    assert results_summary(records['student']) == {'semesters':[], 'cgpa':None}
    result.published, result.passed = True, False; result.save()
    assert progress(records['student'])['earned_credits'] == 0


def test_duplicate_attempts_do_not_duplicate_completion(records):
    published(records)
    published(records, section='B')
    Registration.objects.create(student=records['student'],offering=records['offering'],status='approved')
    summary = progress(records['student'])
    assert summary['earned_credits'] == 3
    assert summary['completed_courses'] == 1
    assert summary['in_progress_credits'] == 0
    assert summary['credit_percentage'] == 100


def test_electives_match_requirements_not_catalogue(records):
    curriculum = Curriculum.objects.create(name='Electives test',version='electives-test')
    core = Requirement.objects.create(curriculum=curriculum,code='CORE',title='Core',title_bn='মূল',credits=3)
    core.courses.add(records['course'])
    a = Course.objects.create(code='ELEC1',title='Elective A',title_bn='ক',credits=3)
    b = Course.objects.create(code='ELEC2',title='Elective B',title_bn='খ',credits=3)
    req = Requirement.objects.create(curriculum=curriculum,code='E1',title='Elective slot',title_bn='ঐচ্ছিক',credits=3,category='elective')
    req.courses.add(a,b)
    records['student'].curriculum=curriculum; records['student'].save()
    published(records,course=a); published(records,course=b)
    summary = progress(records['student'])
    assert summary['total_courses'] == 2
    assert summary['earned_credits'] == 3
    assert len(summary['extra_courses']) == 1


def test_overlapping_elective_choices_use_matching(records):
    curriculum = Curriculum.objects.create(name='Matching test',version='matching-test')
    a = records['course']
    b = Course.objects.create(code='ELEC',title='Elective',title_bn='ঐচ্ছিক',credits=3)
    flexible = Requirement.objects.create(curriculum=curriculum,code='FLEX',title='Flexible',title_bn='ঐচ্ছিক',credits=3,category='elective')
    flexible.courses.add(a,b)
    specific = Requirement.objects.create(curriculum=curriculum,code='SPECIFIC',title='Specific',title_bn='নির্দিষ্ট',credits=3,category='elective')
    specific.courses.add(a)
    records['student'].curriculum=curriculum; records['student'].save()
    published(records); published(records,course=b)
    assert progress(records['student'])['completed_courses'] == 2


def test_pending_registration_does_not_count_as_in_progress(records):
    r = request_registration(records['student'],records['offering'].id,records['user'])
    assert progress(records['student'])['in_progress_credits'] == 0
    decide_registration(r.id,'approved','Reviewed',records['admin'])
    assert progress(records['student'])['in_progress_credits'] == 3
    assert api_as(records['user']).get('/api/v1/me/routine/').json()[0]['code'] == 'CSE101'
    assert AuditEvent.objects.filter(action='registration.approved').exists()


def test_final_failed_active_course_is_remaining_not_in_progress(records):
    Registration.objects.create(student=records['student'],offering=records['offering'],status='approved')
    Result.objects.create(student=records['student'],offering=records['offering'],grade='F',grade_points=0,passed=False,published=True)
    data = progress(records['student'])
    assert data['earned_credits'] == 0
    assert data['in_progress_credits'] == 0
    assert data['remaining_credits'] == 3


def test_active_elective_can_reroute_completed_course_without_doublecount(records):
    curriculum = Curriculum.objects.create(name='Joint matching',version='joint-matching')
    a = records['course']
    b = Course.objects.create(code='ACTIVE-B',title='Active B',title_bn='খ',credits=3)
    flexible = Requirement.objects.create(curriculum=curriculum,code='FLEX',title='Flexible',title_bn='ঐচ্ছিক',credits=3,category='elective',position=0)
    specific = Requirement.objects.create(curriculum=curriculum,code='SPEC',title='Specific',title_bn='নির্দিষ্ট',credits=3,category='elective',position=1)
    flexible.courses.add(a,b); specific.courses.add(a)
    records['student'].curriculum=curriculum; records['student'].save()
    published(records)
    offering=Offering.objects.create(course=b,term=records['term'],instructor='Teacher',capacity=10,schedule=[])
    Registration.objects.create(student=records['student'],offering=offering,status='approved')
    data=progress(records['student'])
    assert data['earned_credits'] == 3
    assert data['in_progress_credits'] == 3
    assert data['remaining_credits'] == 0
    assert data['extra_courses'] == []


def test_dashboard_and_progress_use_same_values(records):
    client = api_as(records['user'])
    assert client.get('/api/v1/me/dashboard/').json()['progress'] == client.get('/api/v1/me/progress/').json()


def test_duplicate_registration_rejected(records):
    request_registration(records['student'],records['offering'].id,records['user'])
    with pytest.raises(ValidationError): request_registration(records['student'],records['offering'].id,records['user'])
    assert Registration.objects.count() == 1


def test_registration_closed_and_prerequisite_and_full(records):
    offering = records['offering']
    records['term'].registration_closes = timezone.localdate()-timedelta(days=1); records['term'].save()
    with pytest.raises(ValidationError, match='closed'): request_registration(records['student'],offering.id,records['user'])
    records['term'].registration_closes = timezone.localdate()+timedelta(days=1); records['term'].save()
    prerequisite = Course.objects.create(code='PRE',title='Prerequisite',title_bn='পূর্বশর্ত',credits=3)
    records['course'].prerequisites.add(prerequisite)
    with pytest.raises(ValidationError, match='prerequisites'): request_registration(records['student'],offering.id,records['user'])
    records['course'].prerequisites.clear()
    offering.capacity = 1; offering.save()
    Registration.objects.create(student=records['second'],offering=offering,status='approved')
    with pytest.raises(ValidationError, match='capacity'): request_registration(records['student'],offering.id,records['user'])


def test_credit_limit_pending_reservations_and_schedule_clash(records):
    request_registration(records['student'],records['offering'].id,records['user'])
    other_course = Course.objects.create(code='NEXT',title='Next course',title_bn='পরবর্তী',credits=3)
    other_offering = Offering.objects.create(course=other_course,term=records['term'],instructor='Teacher',capacity=10,schedule=records['offering'].schedule)
    with pytest.raises(ValidationError, match='clash'): request_registration(records['student'],other_offering.id,records['user'])
    records['term'].credit_limit = 3; records['term'].save()
    with pytest.raises(ValidationError, match='credit limit'): request_registration(records['student'],other_offering.id,records['user'])


def test_approval_rechecks_capacity_and_cannot_decide_twice(records):
    r = request_registration(records['student'],records['offering'].id,records['user'])
    records['offering'].capacity=1; records['offering'].save()
    Registration.objects.create(student=records['second'],offering=records['offering'],status='approved')
    with pytest.raises(ValidationError, match='capacity'): decide_registration(r.id,'approved','',records['admin'])
    decide_registration(r.id,'rejected','Section full',records['admin'])
    with pytest.raises(ValidationError, match='already'): decide_registration(r.id,'approved','',records['admin'])


def test_gpa_uses_credit_weighted_published_results(records):
    published(records,grade_points=Decimal('4.00'))
    lab=Course.objects.create(code='LAB',title='Lab',title_bn='ল্যাব',credits=Decimal('1.5'))
    published(records,course=lab,grade_points=Decimal('3.00'))
    draft=Course.objects.create(code='DRAFT',title='Hidden',title_bn='খসড়া',credits=3)
    published(records,course=draft,published=False,grade_points=0)
    summary=results_summary(records['student'])
    assert summary['cgpa'] == 3.67
    assert summary['semesters'][0]['credits'] == 4.5
    assert len(summary['semesters'][0]['results']) == 2


def test_cancelled_and_excused_attendance_excluded(records):
    Registration.objects.create(student=records['student'],offering=records['offering'],status='approved')
    for index,status in enumerate(['present','absent','excused','present']):
        m=Meeting.objects.create(offering=records['offering'],date=timezone.localdate()-timedelta(days=index),cancelled=index==3)
        Attendance.objects.create(student=records['student'],meeting=m,status=status)
    summary=attendance_summary(records['student'])[0]
    assert summary['present'] == 1
    assert summary['held'] == 2
    assert summary['percentage'] == 50
    assert len(summary['sessions']) == 3


def test_partial_attendance_and_late_enrollment_do_not_create_absences(records):
    meeting=Meeting.objects.create(offering=records['offering'],date=timezone.localdate()-timedelta(days=2))
    Registration.objects.create(student=records['student'],offering=records['offering'],status='approved')
    Attendance.objects.create(student=records['student'],meeting=meeting,status='present')
    Registration.objects.create(student=records['second'],offering=records['offering'],status='approved')
    summary=attendance_summary(records['second'])[0]
    assert summary['held'] == 0
    assert summary['percentage'] is None
    assert summary['unmarked'] == 1
    assert summary['sessions'][0]['status'] == 'unmarked'


def test_result_credit_snapshot_preserves_historical_gpa(records):
    published(records,grade_points=4)
    lab=Course.objects.create(code='LAB2',title='Lab',title_bn='ল্যাব',credits=Decimal('1.5'))
    published(records,course=lab,grade_points=3)
    before=results_summary(records['student'])
    lab.credits=6; lab.save()
    assert results_summary(records['student']) == before


def test_assigned_curriculum_is_immutable(records):
    from django.core.exceptions import ValidationError as ModelValidationError
    requirement=records['requirement']
    requirement.credits=6
    with pytest.raises(ModelValidationError): requirement.save()
    with pytest.raises(ModelValidationError): requirement.delete()
    with pytest.raises(ModelValidationError), transaction.atomic(): requirement.courses.clear()
    with pytest.raises(ModelValidationError): Requirement.objects.create(curriculum=records['curriculum'],code='NEW',title='New',title_bn='নতুন',credits=3)


def test_decimal_fees_and_overpayment_rejected(records):
    invoice=Invoice.objects.create(student=records['student'],reference='I1',description='Fees',amount=Decimal('100.10'),due_date=timezone.localdate())
    Payment.objects.create(invoice=invoice,reference='P1',amount=Decimal('30.05'),date=timezone.localdate())
    assert fees_summary(records['student'])['outstanding'] == 70.05
    client=api_as(records['admin'])
    payload={'invoice_id':invoice.id,'reference':'P2','amount':'70.06','date':timezone.localdate().isoformat()}
    assert client.post('/api/v1/admin/payments/',payload,format='json').status_code == 400
    payload['amount']='70.05'
    assert client.post('/api/v1/admin/payments/',payload,format='json').status_code == 201
    assert fees_summary(records['student'])['outstanding'] == 0
    assert AuditEvent.objects.filter(action='payment.recorded').count() == 1
    assert client.post('/api/v1/admin/payments/',payload,format='json').status_code == 400


def test_admin_publication_controls_visibility(records):
    result=published(records,published=False)
    student=api_as(records['user'])
    assert student.post(f'/api/v1/admin/results/{result.id}/publish/',{},format='json').status_code == 403
    assert student.get('/api/v1/me/results/').json()['semesters'] == []
    assert api_as(records['admin']).post(f'/api/v1/admin/results/{result.id}/publish/',{},format='json').status_code == 200
    assert student.get('/api/v1/me/results/').json()['semesters'][0]['results'][0]['grade'] == 'A'
    assert AuditEvent.objects.filter(action='result.published').count() == 1


def test_admit_card_unavailable_is_explicit(records):
    assert api_as(records['user']).get('/api/v1/me/admit-card/').json()['available'] is False


def test_demo_seed_is_additive_and_preserves_existing_edits(db,settings):
    settings.PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher']
    call_command('seed_demo',verbosity=0)
    counts=(Student.objects.count(),Result.objects.count(),Registration.objects.count(),Payment.objects.count(),AuditEvent.objects.count())
    user=get_user_model().objects.get(username='student'); user.first_name='Preserved'; user.save()
    call_command('seed_demo',verbosity=0)
    assert counts == (Student.objects.count(),Result.objects.count(),Registration.objects.count(),Payment.objects.count(),AuditEvent.objects.count())
    user.refresh_from_db(); assert user.first_name == 'Preserved'
    assert progress(user.student)['completed_courses'] == 24
    assert progress(get_user_model().objects.get(username='study_b').student)['completed_courses'] == 24


@pytest.mark.django_db(transaction=True)
def test_concurrent_last_seat_has_one_winner(records):
    offering=records['offering']; offering.capacity=1; offering.save()
    first=Registration.objects.create(student=records['student'],offering=offering,status='pending')
    second=Registration.objects.create(student=records['second'],offering=offering,status='pending')
    barrier=Barrier(2)
    def approve(pk):
        close_old_connections()
        try:
            barrier.wait(timeout=10)
            try:
                decide_registration(pk,'approved','Concurrency test',records['admin'])
                return 'approved'
            except ValidationError:
                return 'blocked'
        finally:
            close_old_connections()
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures=[pool.submit(approve,r.id) for r in [first,second]]
        outcomes=[f.result(timeout=20) for f in futures]
    assert sorted(outcomes) == ['approved','blocked']
    assert offering.registrations.filter(status='approved').count() == 1
