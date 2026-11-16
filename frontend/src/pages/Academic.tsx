import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  Clock,
  Info,
  Search,
  Users,
  Award,
} from "lucide-react";
import type {
  Offering,
  Registration,
  Routine,
  Results as ResultsData,
  AttendanceSummary,
} from "../lib/types";
import { post, errorText } from "../lib/api";
import { useApp } from "../state";
import {
  useData,
  State,
  PageTitle,
  StatusBadge,
  Empty,
  PanelHeader,
  useFormat,
  Stat,
} from "../components/common";
import { Button, Card, Table, Badge } from "../components/ui";
export function Courses() {
  const { t, i18n } = useTranslation();
  const f = useFormat();
  const { notify } = useApp();
  const client = useQueryClient();
  const q = useData<Offering[]>("courses/");
  const [search, setSearch] = useState("");
  const mutation = useMutation({
    mutationFn: (id: number) => post("me/registrations/", { offering_id: id }),
    onSuccess: () => {
      notify(t("requestSuccess"));
      void client.invalidateQueries();
    },
    onError: (e) => notify(errorText(e), true),
  });
  const rows =
    q.data?.filter((c) =>
      `${c.code} ${c.title} ${c.title_bn}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    ) || [];
  return (
    <>
      <PageTitle title={t("courses")} description={t("courseSub")}>
        <Button variant="outline" asChild>
          <Link to="/registration">
            {t("registration")}
            <ArrowUpRight size={16} />
          </Link>
        </Button>
      </PageTitle>
      <div className="search-toolbar">
        <div className="search-field">
          <Search size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchCourses")}
            aria-label={t("searchCourses")}
          />
        </div>
        <span className="muted">
          {f.number(rows.length)} {t("courseUnit")}
        </span>
      </div>
      <State query={q}>
        <div className="course-grid">
          {rows.map((course) => (
            <Card key={course.id} className="course-card">
              <div className="course-card-top">
                <span className="course-code">{course.code}</span>
                <Badge>
                  {f.number(course.credits)} {t("creditUnit")}
                </Badge>
              </div>
              <h2>{f.title(course)}</h2>
              <p className="course-instructor">{course.instructor}</p>
              <div className="course-metadata">
                <span>
                  <CalendarDays size={15} />
                  {course.term}
                </span>
                <span>
                  <Users size={15} />
                  {t("section")} {course.section} · {f.number(course.enrolled)}/
                  {f.number(course.capacity)}
                </span>
                {course.schedule.map((slot, i) => (
                  <span key={i}>
                    <Clock size={15} />
                    {t(slot.day)} {slot.start.slice(0, 5)}–
                    {slot.end.slice(0, 5)} · {slot.room}
                  </span>
                ))}
              </div>
              <div className="prerequisites">
                <span>{t("prerequisites")}</span>
                <strong>
                  {course.prerequisites.length
                    ? course.prerequisites.join(", ")
                    : t("none")}
                </strong>
              </div>
              {!course.eligible && !course.registration_status && (
                <p className="eligibility-note">
                  {i18n.language === "en"
                    ? course.reason
                    : t("registrationReason")}
                </p>
              )}
              <div className="course-card-bottom">
                {course.registration_status ? (
                  <StatusBadge status={course.registration_status} />
                ) : (
                  <span
                    className={`eligibility ${course.eligible ? "eligible" : ""}`}
                  >
                    {course.eligible ? <Check size={14} /> : <Info size={14} />}{" "}
                    {course.eligible
                      ? t("requestRegistration")
                      : t("notEligible")}
                  </span>
                )}
                <Button
                  size="sm"
                  variant={course.eligible ? "default" : "outline"}
                  disabled={
                    !course.eligible ||
                    mutation.isPending ||
                    course.registration_status === "pending" ||
                    course.registration_status === "approved"
                  }
                  onClick={() => mutation.mutate(course.id)}
                >
                  {course.registration_status
                    ? t(course.registration_status)
                    : t("requestRegistration")}
                  <ArrowRight size={14} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
        {rows.length === 0 && (
          <Card>
            <Empty />
          </Card>
        )}
      </State>
    </>
  );
}
export function RegistrationPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const q = useData<Registration[]>("me/registrations/");
  return (
    <>
      <PageTitle title={t("registration")} description={t("registrationSub")}>
        <Button asChild>
          <Link to="/courses">
            <BookOpen size={16} />
            {t("browseCourses")}
          </Link>
        </Button>
      </PageTitle>
      <p className="info-note">
        <Info size={17} />
        {t("registrationNote")}
      </p>
      <State query={q}>
        <Card>
          {q.data?.length ? (
            <Table>
              <thead>
                <tr>
                  <th>{t("course")}</th>
                  <th>{t("semester")}</th>
                  <th>{t("credits")}</th>
                  <th>{t("status")}</th>
                  <th>{t("requestedOn")}</th>
                  <th>{t("decision")}</th>
                </tr>
              </thead>
              <tbody>
                {q.data.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className="course-code">{row.offering.code}</span>
                      <strong className="table-title">
                        {f.title(row.offering)}
                      </strong>
                      <small>
                        {t("section")} {row.offering.section}
                      </small>
                    </td>
                    <td>{row.offering.term}</td>
                    <td>{f.number(row.offering.credits)}</td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td>{f.date(row.requested_at)}</td>
                    <td>{row.decision_note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Empty message={t("noRegistrations")} />
          )}
        </Card>
      </State>
    </>
  );
}
export function RoutinePage() {
  const { t } = useTranslation();
  const q = useData<Routine[]>("me/routine/");
  const [day, setDay] = useState("all");
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const rows = (q.data || []).filter((row) => day === "all" || row.day === day);
  return (
    <>
      <PageTitle title={t("routine")} description={t("routineSub")}>
        <Button variant="outline" onClick={() => window.print()}>
          <CalendarDays size={16} />
          {t("print")}
        </Button>
      </PageTitle>
      <div className="filter-tabs no-print" role="group" aria-label={t("day")}>
        {["all", ...days].map((d) => (
          <button
            key={d}
            aria-pressed={d === day}
            className={d === day ? "active" : ""}
            onClick={() => setDay(d)}
          >
            {t(d)}
          </button>
        ))}
      </div>
      <State query={q}>
        <Card className="print-surface">
          <PanelHeader title={t("routine")} />
          {rows.length ? (
            <Table>
              <thead>
                <tr>
                  <th>{t("day")}</th>
                  <th>{t("time")}</th>
                  <th>{t("course")}</th>
                  <th>{t("room")}</th>
                  <th>{t("instructor")}</th>
                </tr>
              </thead>
              <tbody>
                {[...rows]
                  .sort(
                    (a, b) =>
                      days.indexOf(a.day) - days.indexOf(b.day) ||
                      a.start.localeCompare(b.start),
                  )
                  .map((row, i) => (
                    <tr key={`${row.id}-${i}`}>
                      <td>
                        <strong>{t(row.day)}</strong>
                      </td>
                      <td>
                        <span className="time-pill">
                          {row.start.slice(0, 5)}–{row.end.slice(0, 5)}
                        </span>
                      </td>
                      <td>
                        <span className="course-code">{row.code}</span>
                        <strong className="table-title">{row.title}</strong>
                        <small>
                          {t("section")} {row.section}
                        </small>
                      </td>
                      <td>{row.room}</td>
                      <td>{row.instructor}</td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          ) : (
            <Empty message={t("noRoutine")} />
          )}
        </Card>
      </State>
    </>
  );
}
export function ResultsPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const q = useData<ResultsData>("me/results/");
  const [params, setParams] = useSearchParams();
  const term = params.get("term") || "all";
  return (
    <>
      <PageTitle title={t("results")} description={t("resultsSub")} />
      <State query={q}>
        {q.data && (
          <>
            <div className="stats-grid stats-three">
              <Stat
                label={t("cgpa")}
                value={q.data.cgpa === null ? "—" : f.number(q.data.cgpa, 2)}
                sub={t("publishedOnly")}
                icon={<Award />}
              />
              <Stat
                label={t("semester")}
                value={f.number(q.data.semesters.length)}
                icon={<CalendarDays />}
                tone="blue"
              />
              <Stat
                label={t("creditsEarned")}
                value={f.number(
                  q.data.semesters.reduce(
                    (sum, sem) =>
                      sum +
                      sem.results
                        .filter((row) => row.passed)
                        .reduce((n, row) => n + row.credits, 0),
                    0,
                  ),
                )}
                sub={t("publishedOnly")}
                icon={<BookOpen />}
                tone="sand"
              />
            </div>
            <div className="filter-row">
              <label>
                {t("semester")}
                <select
                  value={term}
                  onChange={(e) =>
                    setParams(
                      e.target.value === "all" ? {} : { term: e.target.value },
                    )
                  }
                >
                  <option value="all">{t("all")}</option>
                  {q.data.semesters.map((sem) => (
                    <option key={sem.term} value={sem.term}>
                      {sem.term}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {q.data.semesters
              .filter((sem) => term === "all" || sem.term === term)
              .map((sem) => (
                <Card key={sem.term}>
                  <PanelHeader
                    title={sem.term}
                    action={
                      <Badge tone="green">
                        {t("gpa")} {f.number(sem.gpa, 2)}
                      </Badge>
                    }
                  />
                  <Table>
                    <thead>
                      <tr>
                        <th>{t("course")}</th>
                        <th>{t("credits")}</th>
                        <th>{t("grade")}</th>
                        <th>{t("gpa")}</th>
                        <th>{t("status")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sem.results.map((result) => (
                        <tr key={result.id}>
                          <td>
                            <span className="course-code">{result.code}</span>
                            <strong className="table-title">
                              {result.title}
                            </strong>
                          </td>
                          <td>{f.number(result.credits)}</td>
                          <td>
                            <strong>{result.grade}</strong>
                          </td>
                          <td>{f.number(result.grade_points, 2)}</td>
                          <td>
                            <Badge tone={result.passed ? "green" : "red"}>
                              {t(result.passed ? "passed" : "notPassed")}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card>
              ))}
            {!q.data.semesters.length && (
              <Card>
                <Empty message={t("noResults")} />
              </Card>
            )}
            <p className="info-note">
              <Info size={17} />
              {t("publishedOnly")}
            </p>
          </>
        )}
      </State>
    </>
  );
}
export function AttendancePage() {
  const { t } = useTranslation();
  const f = useFormat();
  const q = useData<AttendanceSummary[]>("me/attendance/");
  const [params, setParams] = useSearchParams();
  const course = params.get("course") || "all";
  const rows = (q.data || []).filter(
    (row) => course === "all" || String(row.offering_id) === course,
  );
  return (
    <>
      <PageTitle title={t("attendance")} description={t("attendancePageSub")} />
      <State query={q}>
        <div className="filter-row">
          <label>
            {t("course")}
            <select
              value={course}
              onChange={(e) =>
                setParams(
                  e.target.value === "all" ? {} : { course: e.target.value },
                )
              }
            >
              <option value="all">{t("all")}</option>
              {q.data?.map((row) => (
                <option key={row.offering_id} value={row.offering_id}>
                  {row.code} · {row.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="attendance-grid">
          {rows.map((row) => (
            <Card key={row.offering_id} className="attendance-record">
              <PanelHeader
                title={row.code}
                description={row.title}
                action={
                  <Badge
                    tone={
                      row.percentage !== null && row.percentage >= 75
                        ? "green"
                        : "amber"
                    }
                  >
                    {row.percentage === null
                      ? "—"
                      : `${f.number(row.percentage, 1)}%`}
                  </Badge>
                }
              />
              <div className="attendance-counts">
                <div>
                  <strong>{f.number(row.present)}</strong>
                  <span>{t("present")}</span>
                </div>
                <div>
                  <strong>{f.number(row.held)}</strong>
                  <span>{t("held")}</span>
                </div>
              </div>
              <details open={course !== "all"}>
                <summary>{t("showSessions")}</summary>
                <Table>
                  <thead>
                    <tr>
                      <th>{t("date")}</th>
                      <th>{t("status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.sessions.map((session, i) => (
                      <tr key={`${session.date}-${i}`}>
                        <td>{f.date(session.date)}</td>
                        <td>
                          <StatusBadge status={session.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                {!row.sessions.length && <Empty message={t("noAttendance")} />}
              </details>
            </Card>
          ))}
        </div>
        {rows.length === 0 && (
          <Card>
            <Empty message={t("noAttendance")} />
          </Card>
        )}
        <p className="info-note">
          <Info size={17} />
          {t("attendancePolicy")}
        </p>
      </State>
    </>
  );
}
