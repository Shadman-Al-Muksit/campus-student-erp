import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  BookOpen,
  CalendarDays,
  CheckCheck,
  ChevronRight,
  Compass,
  GraduationCap,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import type { Dashboard as DashboardData, Progress } from "../lib/types";
import { useApp } from "../state";
import { paths } from "../lib/routes";
import {
  useData,
  State,
  Stat,
  PanelHeader,
  Empty,
  useFormat,
} from "../components/common";
import { Button, Card, Table, Badge } from "../components/ui";
import { ChartContainer, ChartTooltip } from "../components/ui/chart";
export function CompletionBars({ progress }: { progress: Progress }) {
  const { t } = useTranslation();
  const f = useFormat();
  const { mode } = useApp();
  if (!progress.available)
    return (
      <div className="progress-unavailable">{t("progressUnavailable")}</div>
    );
  return (
    <div className="completion-grid">
      {[
        {
          title: "creditCompletion",
          value: progress.credit_percentage,
          numerator: progress.earned_credits,
          denominator: progress.required_credits,
          unit: "creditUnit",
          className: "credit",
        },
        {
          title: "courseCompletion",
          value: progress.course_percentage,
          numerator: progress.completed_courses,
          denominator: progress.total_courses,
          unit: "courseUnit",
          className: "course",
        },
      ].map((item) => (
        <Link key={item.title} className="completion-item" to={paths.progress}>
          <div className="completion-label">
            <span>{t(item.title)}</span>
            <ArrowUpRight size={16} />
          </div>
          <div className="completion-value">
            <strong>
              {f.number(item.value, 1)}
              <span>%</span>
            </strong>
            <small>
              {f.number(item.numerator)} / {f.number(item.denominator)}{" "}
              {t(item.unit)}
            </small>
          </div>
          {mode === "enhanced" && (
            <div
              className={`progress-track ${item.className}`}
              role="progressbar"
              aria-label={t(item.title)}
              aria-valuenow={item.value}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <i
                style={{ width: `${Math.min(100, Math.max(0, item.value))}%` }}
              />
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
export function Dashboard() {
  const { t } = useTranslation();
  const { mode } = useApp();
  const f = useFormat();
  const nav = useNavigate();
  const q = useData<DashboardData>("me/dashboard/");
  const d = q.data;
  const creditData = d?.progress.available
    ? [
        {
          key: "completed",
          name: t("earned"),
          value: d.progress.earned_credits,
          color: "#167c68",
        },
        {
          key: "in_progress",
          name: t("in_progress"),
          value: d.progress.in_progress_credits,
          color: "#a3c9a8",
        },
        {
          key: "remaining",
          name: t("remaining"),
          value: d.progress.remaining_credits,
          color: "#e8eeeb",
        },
      ]
    : [];
  return (
    <State query={q}>
      {d && (
        <>
          <div className="welcome-heading">
            <div>
              <div className="eyebrow">
                <span className="dot mint-dot" />
                {d.current_term} · {d.profile.program}
              </div>
              <h1>
                {t("welcome", { name: d.profile.name.split(" ")[0] })}
                <span className="welcome-dot">.</span>
              </h1>
              <p>{t("overviewSub")}</p>
            </div>
            <Button variant="outline" asChild>
              <Link to={paths.routine}>
                <CalendarDays size={16} />
                {t("viewRoutine")}
              </Link>
            </Button>
          </div>
          <section className="semester-banner">
            <div>
              <span className="banner-kicker">
                <GraduationCap size={17} />
                {t("currentSemester")}
              </span>
              <h2>{d.current_term}</h2>
              <p>
                {d.profile.curriculum} <span>·</span> {t("batch")}{" "}
                {d.profile.batch}
              </p>
            </div>
            <Link to={paths.registration}>
              {t("registerCourses")}
              <ArrowUpRight size={17} />
            </Link>
            <div className="banner-art" aria-hidden="true">
              <div />
              <div />
              <GraduationCap />
            </div>
          </section>
          <div className="stats-grid">
            <Stat
              label={t("creditsEarned")}
              value={
                d.progress.available ? f.number(d.progress.earned_credits) : "—"
              }
              sub={
                d.progress.available
                  ? t("ofCredits", {
                      total: f.number(d.progress.required_credits),
                    })
                  : t("progressUnavailable")
              }
              icon={<GraduationCap size={20} />}
            />
            <Stat
              label={t("coursesCompleted")}
              value={
                d.progress.available
                  ? f.number(d.progress.completed_courses)
                  : "—"
              }
              sub={
                d.progress.available
                  ? t("ofCourses", {
                      total: f.number(d.progress.total_courses),
                    })
                  : t("progressUnavailable")
              }
              icon={<BookOpen size={20} />}
              tone="blue"
            />
            <Stat
              label={t("semesterGpa")}
              value={
                d.gpa_trend.length ? f.number(d.gpa_trend.at(-1)!.gpa, 2) : "—"
              }
              sub={d.gpa_trend.at(-1)?.term || t("noResults")}
              icon={<Award size={20} />}
              tone="sand"
            />
            <Stat
              label={t("outstandingFees")}
              value={f.money(d.fees.outstanding)}
              sub={t("unpaidHint")}
              icon={<Wallet size={20} />}
              tone="rose"
            />
          </div>
          <Card className="academic-progress">
            <PanelHeader
              title={t("academicOverview")}
              description={t("academicOverviewSub")}
              action={
                <Link className="text-link" to={paths.progress}>
                  {t("viewDetails")}
                  <ArrowUpRight size={15} />
                </Link>
              }
            />
            <CompletionBars progress={d.progress} />
          </Card>
          {mode === "enhanced" ? (
            <div className="dashboard-charts">
              <Card className="credit-chart-card">
                <PanelHeader
                  title={t("creditDistribution")}
                  description={t("creditDistributionSub")}
                />
                {d.progress.available ? (
                  <>
                    <div className="donut-wrap">
                      <ChartContainer
                        config={{
                          earned: { label: t("earned"), color: "#167c68" },
                        }}
                      >
                        <PieChart>
                          <Pie
                            data={creditData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius="72%"
                            outerRadius="94%"
                            paddingAngle={3}
                            cornerRadius={5}
                            stroke="none"
                            onClick={(_entry, index) =>
                              nav(
                                `${paths.progress}?status=${creditData[index]?.key || "all"}`,
                              )
                            }
                          >
                            {creditData.map((item) => (
                              <Cell
                                key={item.key}
                                fill={item.color}
                                cursor="pointer"
                              />
                            ))}
                          </Pie>
                          <ChartTooltip
                            formatter={(value) =>
                              `${f.number(Number(value))} ${t("creditUnit")}`
                            }
                          />
                        </PieChart>
                      </ChartContainer>
                      <div className="donut-center" aria-hidden="true">
                        <strong>
                          {f.number(d.progress.credit_percentage, 1)}
                          <span>%</span>
                        </strong>
                        <small>{t("completed")}</small>
                      </div>
                    </div>
                    <div className="chart-legend">
                      {creditData.map((item) => (
                        <Link
                          key={item.key}
                          to={`${paths.progress}?status=${item.key}`}
                        >
                          <span
                            className="legend-dot"
                            style={{ background: item.color }}
                          />
                          <span>{item.name}</span>
                          <strong>{f.number(item.value)}</strong>
                          <ChevronRight size={13} />
                        </Link>
                      ))}
                    </div>
                  </>
                ) : (
                  <Empty message={t("progressUnavailable")} />
                )}
              </Card>
              <Card className="attendance-chart-card">
                <PanelHeader
                  title={t("attendanceOverview")}
                  description={t("attendanceSub")}
                  action={
                    <Link
                      className="icon-link"
                      to={paths.attendance}
                      aria-label={t("attendance")}
                    >
                      <ArrowUpRight size={18} />
                    </Link>
                  }
                />
                {d.attendance.length ? (
                  <>
                    <ChartContainer
                      className="attendance-chart"
                      config={{
                        percentage: {
                          label: t("attendance"),
                          color: "#167c68",
                        },
                      }}
                    >
                      <BarChart
                        data={d.attendance}
                        layout="vertical"
                        margin={{ top: 12, right: 26, left: 0, bottom: 8 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 5"
                          horizontal={false}
                          stroke="#e8ece9"
                        />
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tickFormatter={(v) => `${v}%`}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#87928e" }}
                        />
                        <YAxis
                          type="category"
                          dataKey="code"
                          width={75}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#50615b" }}
                        />
                        <ChartTooltip
                          formatter={(value) =>
                            `${f.number(Number(value), 1)}%`
                          }
                        />
                        <Bar
                          dataKey="percentage"
                          name={t("attendance")}
                          radius={[0, 5, 5, 0]}
                          barSize={17}
                          onClick={(_entry, index) =>
                            nav(
                              `${paths.attendance}?course=${d.attendance[index]?.offering_id}`,
                            )
                          }
                        >
                          {d.attendance.map((item, i) => (
                            <Cell
                              key={item.offering_id}
                              fill={i % 2 ? "#92bba2" : "#167c68"}
                              cursor="pointer"
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                    <details className="chart-data">
                      <summary>{t("viewData")}</summary>
                      <Table>
                        <thead>
                          <tr>
                            <th>{t("course")}</th>
                            <th>{t("attendance")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {d.attendance.map((item) => (
                            <tr key={item.offering_id}>
                              <td>
                                <Link
                                  to={`${paths.attendance}?course=${item.offering_id}`}
                                >
                                  {item.code}
                                </Link>
                              </td>
                              <td>
                                {item.percentage === null
                                  ? "—"
                                  : `${f.number(item.percentage, 1)}%`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </details>
                  </>
                ) : (
                  <Empty message={t("noAttendance")} />
                )}
              </Card>
            </div>
          ) : (
            <Card className="baseline-summary">
              <PanelHeader title={t("creditDistribution")} />
              <Table>
                <thead>
                  <tr>
                    <th>{t("earned")}</th>
                    <th>{t("in_progress")}</th>
                    <th>{t("remaining")}</th>
                    <th>{t("creditsRemaining")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      {d.progress.available
                        ? f.number(d.progress.earned_credits)
                        : "—"}
                    </td>
                    <td>
                      {d.progress.available
                        ? f.number(d.progress.in_progress_credits)
                        : "—"}
                    </td>
                    <td>
                      {d.progress.available
                        ? f.number(d.progress.remaining_credits)
                        : "—"}
                    </td>
                    <td>
                      {d.progress.available
                        ? f.number(
                            d.progress.required_credits -
                              d.progress.earned_credits,
                          )
                        : "—"}
                    </td>
                  </tr>
                </tbody>
              </Table>
              <Link to={paths.progress} className="text-link">
                {t("viewDetails")}
                <ArrowRight size={15} />
              </Link>
            </Card>
          )}
          <div className="dashboard-bottom">
            <Card>
              <PanelHeader
                title={t("gpaTrend")}
                description={t("gpaSub")}
                action={
                  <Link className="text-link" to={paths.results}>
                    {t("results")}
                    <ArrowUpRight size={15} />
                  </Link>
                }
              />
              {mode === "enhanced" && d.gpa_trend.length >= 2 && (
                <ChartContainer
                  className="gpa-chart"
                  config={{ gpa: { label: t("gpa"), color: "#167c68" } }}
                >
                  <LineChart
                    data={d.gpa_trend}
                    margin={{ top: 15, left: -30, right: 16, bottom: 0 }}
                    onClick={(state) => {
                      const i = Number(state.activeTooltipIndex);
                      if (Number.isInteger(i) && d.gpa_trend[i])
                        nav(
                          `${paths.results}?term=${encodeURIComponent(d.gpa_trend[i].term)}`,
                        );
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 5"
                      vertical={false}
                      stroke="#e8ece9"
                    />
                    <XAxis
                      dataKey="term"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#87928e" }}
                    />
                    <YAxis
                      domain={[0, 4]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#87928e" }}
                    />
                    <ChartTooltip />
                    <Line
                      type="monotone"
                      dataKey="gpa"
                      name={t("gpa")}
                      stroke="#167c68"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "#fff", strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ChartContainer>
              )}
              {mode === "enhanced" && d.gpa_trend.length < 2 && (
                <p className="muted chart-empty-note">{t("noGpaTrend")}</p>
              )}
              <div className="semester-pills">
                {d.gpa_trend.map((item) => (
                  <Link
                    to={`${paths.results}?term=${encodeURIComponent(item.term)}`}
                    key={item.term}
                  >
                    <span>{item.term}</span>
                    <strong>{f.number(item.gpa, 2)}</strong>
                  </Link>
                ))}
              </div>
            </Card>
            <Card className="notice-card">
              <PanelHeader
                title={t("recentNotices")}
                action={
                  <Link to={paths.notices} className="text-link">
                    {t("viewAll")}
                    <ArrowUpRight size={15} />
                  </Link>
                }
              />
              {d.notices.length ? (
                d.notices.slice(0, 3).map((notice, index) => (
                  <Link
                    className="notice-preview"
                    to={paths.notices}
                    key={notice.id}
                  >
                    <span className={`notice-icon notice-icon-${index}`}>
                      <CalendarDays size={17} />
                    </span>
                    <div>
                      <small>
                        {f.date(notice.published_at)} <span>·</span>{" "}
                        {t(notice.category, { defaultValue: notice.category })}
                      </small>
                      <h3>{f.title(notice)}</h3>
                    </div>
                    <ChevronRight size={15} />
                  </Link>
                ))
              ) : (
                <Empty message={t("noNotices")} />
              )}
            </Card>
          </div>
          <div className="quick-access">
            <div>
              <span className="tiny-eyebrow">{t("quickAccess")}</span>
              <h2>{t("studentServices")}</h2>
            </div>
            <Link to={paths.courses}>
              <BookOpen size={19} />
              {t("registerCourses")}
              <ArrowUpRight size={16} />
            </Link>
            <Link to={paths.results}>
              <CheckCheck size={19} />
              {t("checkResults")}
              <ArrowUpRight size={16} />
            </Link>
            <Link to={paths.admit}>
              <Award size={19} />
              {t("printAdmit")}
              <ArrowUpRight size={16} />
            </Link>
          </div>
          {mode === "enhanced" && (
            <div className="guide-promo">
              <Compass size={23} />
              <div>
                <strong>{t("needHelp")}</strong>
                <span>{t("helpSub")}</span>
              </div>
              <Button
                variant="ghost"
                onClick={() =>
                  window.dispatchEvent(new Event("open-campus-guide"))
                }
              >
                {t("askGuide")}
                <ArrowRight size={16} />
              </Button>
              <Badge tone="green">EN / বাংলা</Badge>
            </div>
          )}
        </>
      )}
    </State>
  );
}
