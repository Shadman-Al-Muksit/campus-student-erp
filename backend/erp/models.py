from decimal import Decimal
from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q


class Curriculum(models.Model):
    name = models.CharField(max_length=120)
    version = models.CharField(max_length=30, unique=True)
    program = models.CharField(max_length=120, default='B.Sc. in Computer Science & Engineering')
    def __str__(self): return f'{self.name} ({self.version})'


class Course(models.Model):
    code = models.CharField(max_length=20, unique=True)
    title = models.CharField(max_length=160)
    title_bn = models.CharField(max_length=160)
    credits = models.DecimalField(max_digits=4, decimal_places=1, validators=[MinValueValidator(Decimal('0.5'))])
    prerequisites = models.ManyToManyField('self', symmetrical=False, blank=True)
    def __str__(self): return f'{self.code} · {self.title}'


class Requirement(models.Model):
    curriculum = models.ForeignKey(Curriculum, on_delete=models.PROTECT, related_name='requirements')
    code = models.CharField(max_length=30)
    title = models.CharField(max_length=160)
    title_bn = models.CharField(max_length=160)
    credits = models.DecimalField(max_digits=4, decimal_places=1)
    category = models.CharField(max_length=20, choices=[('core', 'Core'), ('elective', 'Elective')], default='core')
    courses = models.ManyToManyField(Course, related_name='requirements')
    position = models.PositiveIntegerField(default=0)
    class Meta:
        ordering = ['position', 'id']
        constraints = [models.UniqueConstraint(fields=['curriculum', 'code'], name='unique_curriculum_requirement')]
    def __str__(self): return f'{self.curriculum.version}: {self.code}'

    def save(self, *args, **kwargs):
        if self.curriculum_id and Student.objects.filter(curriculum_id=self.curriculum_id).exists():
            fields = ['curriculum_id', 'code', 'title', 'title_bn', 'credits', 'category', 'position']
            previous = type(self).objects.filter(pk=self.pk).values(*fields).first()
            if previous is None or any(previous[field] != getattr(self, field) for field in fields):
                raise ValidationError('Assigned curricula are immutable. Create a new curriculum version instead.')
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if Student.objects.filter(curriculum_id=self.curriculum_id).exists():
            raise ValidationError('Assigned curriculum requirements cannot be deleted.')
        return super().delete(*args, **kwargs)


class Student(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='student')
    student_id = models.CharField(max_length=25, unique=True)
    curriculum = models.ForeignKey(Curriculum, on_delete=models.PROTECT, null=True, blank=True)
    batch = models.CharField(max_length=30, default='42')
    semester = models.PositiveIntegerField(default=5)
    advisor = models.CharField(max_length=120, default='Dr. Nadia Hasan')
    phone = models.CharField(max_length=30, blank=True)
    status = models.CharField(max_length=30, default='Active')
    def __str__(self): return f'{self.student_id} · {self.user.get_full_name()}'


class Term(models.Model):
    name = models.CharField(max_length=60, unique=True)
    starts_on = models.DateField()
    registration_opens = models.DateField()
    registration_closes = models.DateField()
    credit_limit = models.DecimalField(max_digits=4, decimal_places=1, default=18)
    active = models.BooleanField(default=False)
    class Meta:
        ordering = ['starts_on', 'id']
        constraints = [models.CheckConstraint(condition=Q(registration_closes__gte=models.F('registration_opens')), name='registration_window_order')]
    def __str__(self): return self.name


class Offering(models.Model):
    course = models.ForeignKey(Course, on_delete=models.PROTECT, related_name='offerings')
    term = models.ForeignKey(Term, on_delete=models.PROTECT, related_name='offerings')
    section = models.CharField(max_length=15, default='A')
    instructor = models.CharField(max_length=120)
    capacity = models.PositiveIntegerField(default=40, validators=[MinValueValidator(1)])
    schedule = models.JSONField(default=list)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['course', 'term', 'section'], name='unique_course_term_section'), models.CheckConstraint(condition=Q(capacity__gte=1), name='positive_capacity')]
    def __str__(self): return f'{self.course.code} {self.term.name} / {self.section}'


class Registration(models.Model):
    student = models.ForeignKey(Student, on_delete=models.PROTECT, related_name='registrations')
    offering = models.ForeignKey(Offering, on_delete=models.PROTECT, related_name='registrations')
    status = models.CharField(max_length=15, choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')], default='pending')
    requested_at = models.DateTimeField(auto_now_add=True)
    decision_note = models.TextField(blank=True)
    class Meta:
        ordering = ['-requested_at']
        constraints = [models.UniqueConstraint(fields=['student', 'offering'], name='one_registration_per_student_offering')]


class Result(models.Model):
    student = models.ForeignKey(Student, on_delete=models.PROTECT, related_name='results')
    offering = models.ForeignKey(Offering, on_delete=models.PROTECT, related_name='results')
    credits = models.DecimalField(max_digits=4, decimal_places=1, editable=False)
    grade = models.CharField(max_length=10)
    grade_points = models.DecimalField(max_digits=3, decimal_places=2, validators=[MinValueValidator(0), MaxValueValidator(4)])
    passed = models.BooleanField(default=True)
    published = models.BooleanField(default=False)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['student', 'offering'], name='one_result_per_student_offering'), models.CheckConstraint(condition=Q(grade_points__gte=0) & Q(grade_points__lte=4), name='grade_points_range')]

    def save(self, *args, **kwargs):
        if self._state.adding and self.credits is None:
            self.credits = self.offering.course.credits
        elif self.pk:
            previous = type(self).objects.filter(pk=self.pk).values('credits').first()
            if previous is not None and previous['credits'] != self.credits:
                raise ValidationError('Result credit snapshots cannot be changed.')
        return super().save(*args, **kwargs)


class Meeting(models.Model):
    offering = models.ForeignKey(Offering, on_delete=models.PROTECT, related_name='meetings')
    date = models.DateField()
    cancelled = models.BooleanField(default=False)
    class Meta:
        ordering = ['date']
        constraints = [models.UniqueConstraint(fields=['offering', 'date'], name='one_meeting_per_date')]


class Attendance(models.Model):
    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name='records')
    student = models.ForeignKey(Student, on_delete=models.PROTECT, related_name='attendance')
    status = models.CharField(max_length=15, choices=[('present', 'Present'), ('absent', 'Absent'), ('excused', 'Excused')])
    class Meta:
        constraints = [models.UniqueConstraint(fields=['meeting', 'student'], name='one_attendance_mark')]


class Invoice(models.Model):
    student = models.ForeignKey(Student, on_delete=models.PROTECT, related_name='invoices')
    reference = models.CharField(max_length=60, unique=True)
    description = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    due_date = models.DateField()
    class Meta:
        ordering = ['due_date', 'id']
        constraints = [models.CheckConstraint(condition=Q(amount__gt=0), name='positive_invoice_amount')]


class Payment(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name='payments')
    reference = models.CharField(max_length=60, unique=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    class Meta:
        constraints = [models.CheckConstraint(condition=Q(amount__gt=0), name='positive_payment_amount')]


class Notice(models.Model):
    title = models.CharField(max_length=200)
    title_bn = models.CharField(max_length=200)
    body = models.TextField()
    body_bn = models.TextField()
    category = models.CharField(max_length=40, default='Academic')
    published_at = models.DateTimeField()
    class Meta: ordering = ['-published_at']


class AdmitCard(models.Model):
    student = models.ForeignKey(Student, on_delete=models.PROTECT, related_name='admit_cards')
    term = models.ForeignKey(Term, on_delete=models.PROTECT)
    issued = models.BooleanField(default=False)
    exams = models.JSONField(default=list)
    class Meta: constraints = [models.UniqueConstraint(fields=['student', 'term'], name='one_admit_card_term')]


class AuditEvent(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=60)
    target = models.CharField(max_length=120)
    detail = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta: ordering = ['-created_at', '-id']
