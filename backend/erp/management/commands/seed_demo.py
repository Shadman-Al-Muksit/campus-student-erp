"""Idempotent, additive fictional seed. Existing records/passwords are preserved."""
from datetime import date, timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from erp.models import AdmitCard, Attendance, AuditEvent, Course, Curriculum, Invoice, Meeting, Notice, Offering, Payment, Registration, Requirement, Result, Student, Term


COURSES = [
 ('CSE101','Introduction to Computing','কম্পিউটিং পরিচিতি',3),
 ('CSE102','Programming Fundamentals','প্রোগ্রামিংয়ের ভিত্তি',3),
 ('CSE103','Programming Laboratory','প্রোগ্রামিং ল্যাব',1.5),
 ('MAT101','Calculus I','ক্যালকুলাস ১',3),
 ('ENG101','Academic English','একাডেমিক ইংরেজি',3),
 ('PHY101','Physics for Engineers','প্রকৌশল পদার্থবিজ্ঞান',3),
 ('CSE111','Object-Oriented Programming','অবজেক্ট ওরিয়েন্টেড প্রোগ্রামিং',3),
 ('CSE112','Object-Oriented Programming Lab','অবজেক্ট ওরিয়েন্টেড প্রোগ্রামিং ল্যাব',1.5),
 ('MAT111','Discrete Mathematics','বিচ্ছিন্ন গণিত',3),
 ('EEE111','Electrical Circuits','বৈদ্যুতিক বর্তনী',3),
 ('CSE113','Digital Logic Design','ডিজিটাল লজিক ডিজাইন',3),
 ('HUM111','Bangladesh Studies','বাংলাদেশ অধ্যয়ন',3),
 ('CSE201','Data Structures','ডেটা স্ট্রাকচার',3),
 ('CSE202','Data Structures Laboratory','ডেটা স্ট্রাকচার ল্যাব',1.5),
 ('CSE203','Computer Architecture','কম্পিউটার আর্কিটেকচার',3),
 ('MAT201','Linear Algebra','রৈখিক বীজগণিত',3),
 ('STA201','Probability and Statistics','সম্ভাবনা ও পরিসংখ্যান',3),
 ('CSE204','Web Technologies','ওয়েব প্রযুক্তি',3),
 ('CSE211','Algorithm Design','অ্যালগরিদম ডিজাইন',3),
 ('CSE212','Database Management Systems','ডেটাবেজ ম্যানেজমেন্ট সিস্টেম',3),
 ('CSE213','Database Laboratory','ডেটাবেজ ল্যাব',1.5),
 ('CSE214','Operating Systems','অপারেটিং সিস্টেম',3),
 ('CSE215','Numerical Methods','সংখ্যাতাত্ত্বিক পদ্ধতি',3),
 ('CSE216','Software Engineering','সফটওয়্যার প্রকৌশল',3),
 ('CSE301','Computer Networks','কম্পিউটার নেটওয়ার্ক',3),
 ('CSE302','Artificial Intelligence','কৃত্রিম বুদ্ধিমত্তা',3),
 ('CSE303','Software Development Lab','সফটওয়্যার ডেভেলপমেন্ট ল্যাব',1.5),
 ('CSE304','Theory of Computation','কম্পিউটেশন তত্ত্ব',3),
 ('CSE311','Compiler Design','কম্পাইলার ডিজাইন',3),
 ('CSE312','Information Security','তথ্য নিরাপত্তা',3),
 ('CSE313','Computer Graphics','কম্পিউটার গ্রাফিক্স',3),
 ('CSE314','Human-Computer Interaction','মানব-কম্পিউটার মিথস্ক্রিয়া',3),
 ('CSE401','Distributed Systems','বিতরণকৃত সিস্টেম',3),
 ('CSE402','Research Methods','গবেষণা পদ্ধতি',3),
 ('CSE403','Professional Ethics','পেশাগত নৈতিকতা',3),
 ('CSE499','Capstone Project','ক্যাপস্টোন প্রকল্প',6),
 ('CSE411','Machine Learning','মেশিন লার্নিং',3),
 ('CSE412','Data Mining','ডেটা মাইনিং',3),
 ('CSE421','Cloud Computing','ক্লাউড কম্পিউটিং',3),
 ('CSE422','Mobile Application Development','মোবাইল অ্যাপ্লিকেশন ডেভেলপমেন্ট',3),
 ('CSE431','Natural Language Processing','প্রাকৃতিক ভাষা প্রক্রিয়াকরণ',3),
 ('CSE432','Computer Vision','কম্পিউটার ভিশন',3),
 ('CSE441','Internet of Things','ইন্টারনেট অব থিংস',3),
 ('CSE442','Robotics','রোবোটিক্স',3),
]


class Command(BaseCommand):
    help = 'Add fictional portfolio accounts and academic records; never delete or reset existing records.'

    @transaction.atomic
    def handle(self, *args, **options):
        today = timezone.localdate()
        User = get_user_model()
        admin, created = User.objects.get_or_create(username='admin', defaults={'first_name':'Campus','last_name':'Administrator','email':'admin@example.test','is_staff':True,'is_superuser':True})
        if created:
            admin.set_password('CampusAdmin!2026'); admin.save()
        curriculum, _ = Curriculum.objects.get_or_create(version='CSE-DEMO-2026', defaults={'name':'CSE Curriculum','program':'B.Sc. in Computer Science & Engineering'})
        courses = []
        for code, title, title_bn, credits in COURSES:
            course, created = Course.objects.get_or_create(code=code, defaults={'title':title,'title_bn':title_bn,'credits':Decimal(str(credits))})
            courses.append(course)
        for i, course in enumerate(courses[:36]):
            requirement, created = Requirement.objects.get_or_create(curriculum=curriculum, code=course.code, defaults={'title':course.title,'title_bn':course.title_bn,'credits':course.credits,'category':'core','position':i})
            if created: requirement.courses.add(course)
            if i >= 12 and not course.prerequisites.exists(): course.prerequisites.add(courses[i-12])
        for i in range(4):
            requirement, created = Requirement.objects.get_or_create(curriculum=curriculum, code=f'ELECTIVE-{i+1}', defaults={'title':f'Elective requirement {i+1}','title_bn':f'ঐচ্ছিক কোর্সের শর্ত {i+1}','credits':3,'category':'elective','position':36+i})
            if created: requirement.courses.add(*courses[36+2*i:38+2*i])
        term_names = ['Spring 2024','Fall 2024','Spring 2025','Fall 2025','Spring 2026']
        dates = [date(2024,1,1),date(2024,7,1),date(2025,1,1),date(2025,7,1),date(2026,1,1)]
        terms = []
        for i, name in enumerate(term_names):
            t, _ = Term.objects.get_or_create(name=name, defaults={'starts_on':dates[i], 'registration_opens':today-timedelta(days=30) if i==4 else dates[i], 'registration_closes':today+timedelta(days=90) if i==4 else dates[i]+timedelta(days=15),'active':i==4,'credit_limit':18})
            terms.append(t)
        teachers = ['Dr. Nadia Hasan','Farhan Ahmed','Dr. Samira Chowdhury','Tanvir Islam']
        days = ['Sunday','Monday','Tuesday','Wednesday','Thursday']
        def get_offering(index, term, section='A'):
            hour = 9 + (index//5 % 4)*2
            schedule = [{'day':days[index%5],'start':f'{hour:02}:00','end':f'{hour+1:02}:20','room':f'Building A · {301+index%8}'}]
            return Offering.objects.get_or_create(course=courses[index],term=term,section=section, defaults={'instructor':teachers[index%4],'capacity':40,'schedule':schedule})[0]
        # Available active-semester courses include both options for each elective slot.
        for i in range(12,44): get_offering(i,terms[-1])
        specifications = [
          ('student','Aarif','Rahman','CSE-2022-0042',list(range(24)),[24,25,26,27],0),
          ('student2','Maya','Ahmed','CSE-2022-0043',list(range(12)),[12,13,14,15],1),
          ('study_a','Nabil','Karim','STUDY-A',list(range(24)),[24,25,26,27],2),
          ('study_b','Raisa','Islam','STUDY-B',list(range(20))+[22,23,24,25],[26,27,28,29],3),
        ]
        for username, first, last, sid, completed, current, offset in specifications:
            user, created = User.objects.get_or_create(username=username, defaults={'first_name':first,'last_name':last,'email':f'{username}@example.test'})
            if created: user.set_password('CampusDemo!2026'); user.save()
            student, _ = Student.objects.get_or_create(user=user, defaults={'student_id':sid,'curriculum':curriculum,'batch':'42','semester':5,'advisor':'Dr. Nadia Hasan','phone':'+880 1700 000000'})
            for j, index in enumerate(completed):
                term = terms[min(j//6,3)]
                offering = get_offering(index,term)
                Registration.objects.get_or_create(student=student,offering=offering,defaults={'status':'approved'})
                point = [Decimal('4.00'),Decimal('3.75'),Decimal('3.50'),Decimal('3.25')][(j+offset)%4]
                grade = {Decimal('4'):'A+',Decimal('3.75'):'A',Decimal('3.5'):'A-',Decimal('3.25'):'B+'}[point]
                Result.objects.get_or_create(student=student,offering=offering,defaults={'grade':grade,'grade_points':point,'passed':True,'published':True})
            for j,index in enumerate(current):
                offering = get_offering(index,terms[-1], 'B' if username=='study_b' else 'A')
                Registration.objects.get_or_create(student=student,offering=offering,defaults={'status':'approved'})
                for k in range(12):
                    meeting, _ = Meeting.objects.get_or_create(offering=offering,date=today-timedelta(days=30-k*2),defaults={'cancelled':k==10})
                    status = 'excused' if k==9 else 'absent' if (k+j+offset)%7==0 else 'present'
                    Attendance.objects.get_or_create(meeting=meeting,student=student,defaults={'status':status})
            if username in ['student','study_a']:
                offering = get_offering(28,terms[-1])
                Registration.objects.get_or_create(student=student,offering=offering,defaults={'status':'pending'})
            draft = get_offering(current[0],terms[-1], 'B' if username=='study_b' else 'A')
            Result.objects.get_or_create(student=student,offering=draft,defaults={'grade':'A','grade_points':'3.75','passed':True,'published':False})
            tuition, _ = Invoice.objects.get_or_create(reference=f'DEMO-TUITION-{sid}',defaults={'student':student,'description':'Spring 2026 · tuition and registration','amount':Decimal('42000')+offset*1500,'due_date':today+timedelta(days=14)})
            Payment.objects.get_or_create(reference=f'DEMO-PAY-{sid}',defaults={'invoice':tuition,'amount':Decimal('30000')+offset*500,'date':today-timedelta(days=7)})
            library, _ = Invoice.objects.get_or_create(reference=f'DEMO-LIBRARY-{sid}',defaults={'student':student,'description':'Semester library and laboratory services','amount':Decimal('3500'),'due_date':today-timedelta(days=10)})
            Payment.objects.get_or_create(reference=f'DEMO-LIBRARY-PAY-{sid}',defaults={'invoice':library,'amount':library.amount,'date':today-timedelta(days=12)})
            exams = [{'code':courses[index].code,'title':courses[index].title,'date':(today+timedelta(days=20+j*2)).isoformat(),'time':'09:00 – 12:00','room':f'Exam Hall {201+j}'} for j,index in enumerate(current)]
            AdmitCard.objects.get_or_create(student=student,term=terms[-1],defaults={'issued':username!='student2','exams':exams})
        notices = [
          ('Course registration is open','কোর্স নিবন্ধন চলছে','Review available sections and submit your course requests before the registration deadline. Your advisor will review your request.','নিবন্ধনের সময়সীমার আগে বিভাগগুলো দেখে কোর্সের আবেদন করুন। আপনার উপদেষ্টা আবেদনটি পর্যালোচনা করবেন।','Registration'),
          ('Your semester, at a glance','এক নজরে আপনার সেমিস্টার','Explore your credit progress, class routine and attendance from your dashboard. Select a chart to see the details.','ড্যাশবোর্ড থেকে ক্রেডিটের অগ্রগতি, ক্লাস রুটিন ও উপস্থিতি দেখুন। বিস্তারিত জানতে চার্ট নির্বাচন করুন।','Academic'),
          ('A space to build something new','নতুন কিছু তৈরির সুযোগ','The CSE innovation lab welcomes project proposals from student teams. This is a fictional demonstration notice.','সিএসই ইনোভেশন ল্যাব শিক্ষার্থী দলের প্রকল্প প্রস্তাব স্বাগত জানায়। এটি একটি কাল্পনিক প্রদর্শনী বিজ্ঞপ্তি।','Campus'),
        ]
        for i,(title,title_bn,body,body_bn,category) in enumerate(notices):
            Notice.objects.get_or_create(title=title,defaults={'title_bn':title_bn,'body':body,'body_bn':body_bn,'category':category,'published_at':timezone.now()-timedelta(days=i)})
        if not AuditEvent.objects.filter(action='demo.seeded').exists():
            AuditEvent.objects.create(actor=admin,action='demo.seeded',target='CSE-DEMO-2026',detail='Fictional accounts and records created. Existing data is preserved on repeat seed.')
        self.stdout.write(self.style.SUCCESS(f'Demo ready: {Student.objects.count()} students, {Course.objects.count()} courses, {Requirement.objects.count()} curriculum requirements.'))
        self.stdout.write('All records are fictional. See docs/API_CONTRACT.md for demo credentials.')
