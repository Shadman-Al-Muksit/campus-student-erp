export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: "student" | "admin";
  student_id: string | null;
}
export interface Profile {
  student_id: string;
  name: string;
  email: string;
  program: string;
  curriculum: string;
  batch: string;
  semester: string;
  advisor: string;
  phone: string;
  status: string;
}
export interface ProgressCourse {
  id: number;
  code: string;
  title: string;
  title_bn: string;
  credits: number;
  category: string;
  status: "completed" | "in_progress" | "remaining";
  term: string | null;
  grade: string | null;
}
export interface Progress {
  available: boolean;
  required_credits: number;
  earned_credits: number;
  in_progress_credits: number;
  remaining_credits: number;
  credit_percentage: number;
  total_courses: number;
  completed_courses: number;
  course_percentage: number;
  courses: ProgressCourse[];
  extra_courses: ProgressCourse[];
}
export interface AttendanceSummary {
  offering_id: number;
  code: string;
  title: string;
  present: number;
  held: number;
  percentage: number | null;
  sessions: { date: string; status: string }[];
}
export interface Notice {
  id: number;
  title: string;
  title_bn: string;
  body: string;
  body_bn: string;
  published_at: string;
  category: string;
}
export interface Dashboard {
  profile: Profile;
  progress: Progress;
  attendance: AttendanceSummary[];
  gpa_trend: { term: string; gpa: number }[];
  fees: { total: number; paid: number; outstanding: number };
  notices: Notice[];
  current_term: string;
}
export interface Schedule {
  day: string;
  start: string;
  end: string;
  room: string;
}
export interface Offering {
  id: number;
  code: string;
  title: string;
  title_bn: string;
  credits: number;
  term: string;
  section: string;
  instructor: string;
  capacity: number;
  enrolled: number;
  prerequisites: string[];
  schedule: Schedule[];
  eligible: boolean;
  reason: string;
  registration_status: string | null;
}
export interface Registration {
  id: number;
  offering: Offering;
  status: string;
  requested_at: string;
  decision_note: string;
  student?: { id: number; name: string; student_id: string };
}
export interface Routine extends Schedule {
  id: number;
  code: string;
  title: string;
  section: string;
  instructor: string;
}
export interface Result {
  id: number;
  code: string;
  title: string;
  credits: number;
  grade: string;
  grade_points: number;
  passed: boolean;
}
export interface Results {
  semesters: {
    term: string;
    gpa: number;
    credits: number;
    results: Result[];
  }[];
  cgpa: number | null;
}
export interface Invoice {
  id: number;
  reference: string;
  description: string;
  amount: number;
  paid: number;
  outstanding: number;
  due_date: string;
  status: string;
  payments: { id: number; reference: string; amount: number; date: string }[];
}
export interface Fees {
  total: number;
  paid: number;
  outstanding: number;
  invoices: Invoice[];
}
export interface AdmitCard {
  available: boolean;
  reason: string;
  student?: { name: string; student_id: string; program: string };
  term?: string;
  exams?: {
    code: string;
    title: string;
    date: string;
    time: string;
    room: string;
  }[];
  document_label?: string;
}
export interface AdminOverview {
  students: number;
  pending_registrations: number;
  active_offerings: number;
  outstanding_fees: number;
}
export interface AdminResult {
  id: number;
  student_id: string;
  student_name: string;
  code: string;
  title: string;
  term: string;
  grade: string;
  grade_points: number;
  published: boolean;
}
export interface AdminSetup {
  courses: { id: number; code: string; title: string; credits: number }[];
  terms: { id: number; name: string }[];
  students: { id: number; name: string; student_id: string }[];
}
export interface Audit {
  id: number;
  actor: string;
  action: string;
  target: string;
  detail: string;
  created_at: string;
}
