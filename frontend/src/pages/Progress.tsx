import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookOpen, GraduationCap, ListChecks, Info } from "lucide-react";
import type { Progress as ProgressData, ProgressCourse } from "../lib/types";
import {
  useData,
  State,
  PageTitle,
  Stat,
  StatusBadge,
  Empty,
  PanelHeader,
  useFormat,
} from "../components/common";
import { Card, Table } from "../components/ui";
import { CompletionBars } from "./Dashboard";
export function Progress() {
  const { t } = useTranslation();
  const f = useFormat();
  const q = useData<ProgressData>("me/progress/");
  const d = q.data;
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "all";
  const courseRows = (rows: ProgressCourse[]) =>
    rows.map((course) => (
      <tr key={course.id}>
        <td>
          <span className="course-code">{course.code}</span>
          <strong className="table-title">{f.title(course)}</strong>
        </td>
        <td>{t(course.category, { defaultValue: course.category })}</td>
        <td>{f.number(course.credits)}</td>
        <td>
          <StatusBadge status={course.status} />
        </td>
        <td>{course.term || "—"}</td>
        <td>{course.grade || "—"}</td>
      </tr>
    ));
  return (
    <>
      <PageTitle title={t("progress")} description={t("progressSub")} />
      <State query={q}>
        {d &&
          (d.available ? (
            <>
              <div className="stats-grid stats-three">
                <Stat
                  label={t("curriculumCredit")}
                  value={f.number(d.required_credits)}
                  icon={<GraduationCap />}
                />
                <Stat
                  label={t("creditsRemaining")}
                  value={f.number(d.required_credits - d.earned_credits)}
                  icon={<BookOpen />}
                  tone="blue"
                />
                <Stat
                  label={t("courseRemaining")}
                  value={f.number(d.total_courses - d.completed_courses)}
                  icon={<ListChecks />}
                  tone="sand"
                />
              </div>
              <Card>
                <CompletionBars progress={d} />
              </Card>
              <Card>
                <PanelHeader
                  title={t("curriculumCount")}
                  action={
                    <span className="record-count">
                      {f.number(d.courses.length)} {t("records")}
                    </span>
                  }
                />
                <div
                  className="filter-tabs"
                  role="group"
                  aria-label={t("filter")}
                >
                  {["all", "completed", "in_progress", "remaining"].map(
                    (key) => (
                      <button
                        key={key}
                        className={status === key ? "active" : ""}
                        aria-pressed={status === key}
                        onClick={() =>
                          setParams(key === "all" ? {} : { status: key })
                        }
                      >
                        {t(key)}
                        <span>
                          {f.number(
                            key === "all"
                              ? d.courses.length
                              : d.courses.filter((c) => c.status === key)
                                  .length,
                          )}
                        </span>
                      </button>
                    ),
                  )}
                </div>
                <Table>
                  <thead>
                    <tr>
                      <th>{t("course")}</th>
                      <th>{t("category")}</th>
                      <th>{t("credits")}</th>
                      <th>{t("status")}</th>
                      <th>{t("semester")}</th>
                      <th>{t("grade")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseRows(
                      d.courses.filter(
                        (c) => status === "all" || c.status === status,
                      ),
                    )}
                  </tbody>
                </Table>
                {!d.courses.some(
                  (c) => status === "all" || c.status === status,
                ) && <Empty />}
              </Card>
              {d.extra_courses.length > 0 && (
                <Card>
                  <PanelHeader
                    title={t("extraCourses")}
                    description={t("extraCoursesSub")}
                  />
                  <Table>
                    <thead>
                      <tr>
                        <th>{t("course")}</th>
                        <th>{t("category")}</th>
                        <th>{t("credits")}</th>
                        <th>{t("status")}</th>
                        <th>{t("semester")}</th>
                        <th>{t("grade")}</th>
                      </tr>
                    </thead>
                    <tbody>{courseRows(d.extra_courses)}</tbody>
                  </Table>
                </Card>
              )}
              <p className="info-note">
                <Info size={17} />
                {t("progressDisclaimer")}
              </p>
            </>
          ) : (
            <Card>
              <Empty message={t("progressUnavailable")} />
              <p className="empty-sub">{t("progressUnavailableSub")}</p>
            </Card>
          ))}
      </State>
    </>
  );
}
