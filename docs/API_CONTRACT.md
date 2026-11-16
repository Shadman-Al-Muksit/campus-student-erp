# Campus ERP API contract

All responses JSON; base `/api/v1/`, cookie sessions and CSRF. `GET auth/csrf/` sets csrftoken and returns `{csrfToken}`; POST auth/login/ `{username,password}` returns `{user}`; POST auth/logout/ returns `{detail}`; GET auth/me/ returns `{user}`. All endpoints except csrf/login require authentication. API errors `{detail:string}`. User: `{id,username,first_name,last_name,role:'student'|'admin',student_id:string|null}`. Read lists return bare JSON arrays (no pagination in demo). Decimal values serialized as JSON numbers by API presenters. Date/time ISO strings or HH:MM.

GET me/profile/: `{student_id,name,email,program,curriculum,batch,semester,advisor,phone,status}`.
GET me/dashboard/: `{profile,progress,attendance:[AttendanceSummary],gpa_trend:[{term,gpa}],fees:{total,paid,outstanding},notices:[Notice],current_term:string}`. `progress` same object as below.
GET me/progress/: `{available:boolean,required_credits:number,earned_credits:number,in_progress_credits:number,remaining_credits:number,credit_percentage:number,total_courses:number,completed_courses:number,course_percentage:number,courses:[ProgressCourse],extra_courses:[ProgressCourse]}`; missing curriculum available:false. ProgressCourse `{id,code,title,title_bn,credits,category,status:'completed'|'in_progress'|'remaining',term:string|null,grade:string|null}`. One row per curriculum requirement, including elective slots; each satisfied once. Remaining credits exclude earned and in-progress for donut; unearned total = required-earned. category core/elective. Backend calculation authoritative.
GET courses/: `[Offering]`. Offering `{id,code,title,title_bn,credits,term,section,instructor,capacity,enrolled,prerequisites:[string],schedule:[{day,start,end,room}],eligible:boolean,reason:string,registration_status:string|null}`. schedule.day Monday..Sunday. Status pending/approved/rejected or null.
GET me/registrations/: `[{id,offering:Offering,status,requested_at,decision_note}]`.
POST me/registrations/ `{offering_id}` -> registration; POST admin/registrations/<id>/decide/ `{decision:'approved'|'rejected',note?:string}` -> registration. Successful creates HTTP201, decisions200. Validation 400/409.
GET me/routine/: `[{id,code,title,section,instructor,day,start,end,room}]` (approved registrations only current term).
GET me/results/: `{semesters:[{term,gpa,credits,results:[{id,code,title,credits,grade,grade_points,passed}]}],cgpa:number|null}` (published only).
GET me/attendance/: `[AttendanceSummary]`. Summary `{offering_id,code,title,present,held,percentage:number|null,sessions:[{date,status:'present'|'absent'|'excused'}]}`. Cancelled sessions excluded from held; excused excluded from denominator.
GET me/fees/: `{total,paid,outstanding,invoices:[{id,reference,description,amount,paid,outstanding,due_date,status,payments:[{id,reference,amount,date}]}]}`. Demo invoices/payments only.
GET notices/: `[Notice]`. Notice `{id,title,title_bn,body,body_bn,published_at,category}`.
GET me/admit-card/: `{available:boolean,reason:string,student?:{name,student_id,program},term?:string,exams?:[{code,title,date,time,room}],document_label?:string}`. Fictional printable document; unavailable if not issued; never claims official issuance.
GET admin/overview/: `{students:number,pending_registrations:number,active_offerings:number,outstanding_fees:number}`.
GET admin/registrations/: same registration rows plus `student:{id,name,student_id}`.
GET admin/students/: profile rows plus id.
GET admin/results/: `[{id,student_id,student_name,code,title,term,grade,grade_points,published}]`.
POST admin/results/<id>/publish/ -> result row. POST admin/offerings/ creates offering `{course_id,term_id,section,instructor,capacity,schedule}`; GET admin/setup/ -> `{courses:[{id,code,title,credits}],terms:[{id,name}],students:[{id,name,student_id}]}`. POST admin/attendance/ `{offering_id,date,records:[{student_id,status}],cancelled?:boolean}` upsert meeting/marks. POST admin/invoices/ `{student_id,reference,description,amount,due_date}`; POST admin/payments/ `{invoice_id,reference,amount,date}`. POST admin/notices/ `{title,title_bn,body,body_bn,category}`. GET admin/audit/: `[{id,actor,action,target,detail,created_at}]`.

Demo credentials: student `student` / `CampusDemo!2026`; second student `student2` / same; admin `admin` / `CampusAdmin!2026`. No production accounts or secrets. Fictional university brand Campus. Student display Aarif Rahman. Demo term Spring 2026, arbitrary demo policy no claim about Premier. Term time checks use current local date for registration window seed (-30,+90 days).

Study uses separate fictional student accounts study_a/study_b (same demo password), same API authorization. Baseline/enhanced switch per local UI study preference, baseline hides charts/helper but retains textual summary + all pages. Every study participant starts fresh session; frontend /study offers mode and example accounts. No impersonation endpoint or weakening permissions.

Additional admin collection: GET admin/invoices/ returns invoice rows as above, with student_id (display roll) and student_name, for the payment selector. POST retains the existing create behavior.

Attendance clarification: sessions can also have status `unmarked`. Missing marks are excluded from the percentage denominator, not treated as absences. Summary includes `unmarked` count. Thus `held` means recorded present/absent sessions; cancelled and excused sessions are excluded. Published Result records retain a historical credit snapshot. Assigned curriculum requirements and course mappings are immutable; create a new curriculum version for future changes.
