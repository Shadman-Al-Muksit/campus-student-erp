import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Award,
  BookOpen,
  Check,
  FlaskConical,
  GraduationCap,
  Info,
  Printer,
  Receipt,
  Wallet,
} from "lucide-react";
import type { Fees, Invoice, Notice, AdmitCard, Profile } from "../lib/types";
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
export function FeesPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const q = useData<Fees>("me/fees/");
  const p = useData<Profile>("me/profile/");
  const [receipt, setReceipt] = useState<Invoice | null>(null);
  const printReceipt = (invoice: Invoice) => {
    setReceipt(invoice);
    setTimeout(() => window.print(), 150);
  };
  return (
    <>
      <PageTitle title={t("fees")} description={t("feesSub")} />
      <p className="info-note">
        <Info size={17} />
        {t("demoFinancial")}
      </p>
      <State query={q}>
        {q.data && (
          <>
            <div className="stats-grid stats-three">
              <Stat
                label={t("totalFees")}
                value={f.money(q.data.total)}
                icon={<Receipt />}
              />
              <Stat
                label={t("paid")}
                value={f.money(q.data.paid)}
                icon={<Check />}
                tone="blue"
              />
              <Stat
                label={t("outstanding")}
                value={f.money(q.data.outstanding)}
                icon={<Wallet />}
                tone="rose"
              />
            </div>
            <Card>
              <PanelHeader title={t("viewInvoices")} />
              {q.data.invoices.length ? (
                <Table>
                  <thead>
                    <tr>
                      <th>{t("invoice")}</th>
                      <th>{t("amount")}</th>
                      <th>{t("paid")}</th>
                      <th>{t("outstanding")}</th>
                      <th>{t("dueDate")}</th>
                      <th>{t("status")}</th>
                      <th>{t("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.data.invoices.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <span className="course-code">{row.reference}</span>
                          <strong className="table-title">
                            {row.description}
                          </strong>
                          <small>
                            {t("invoiceId")}: {row.id}
                          </small>
                        </td>
                        <td>{f.money(row.amount)}</td>
                        <td>{f.money(row.paid)}</td>
                        <td>{f.money(row.outstanding)}</td>
                        <td>{f.date(row.due_date)}</td>
                        <td>
                          <StatusBadge status={row.status} />
                        </td>
                        <td>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={row.payments.length === 0}
                            onClick={() => printReceipt(row)}
                          >
                            <Printer size={14} />
                            {t("printReceipt")}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <Empty message={t("noFees")} />
              )}
            </Card>
            <Card>
              <PanelHeader title={t("payments")} />
              <Table>
                <thead>
                  <tr>
                    <th>{t("reference")}</th>
                    <th>{t("invoice")}</th>
                    <th>{t("date")}</th>
                    <th>{t("amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.invoices.flatMap((invoice) =>
                    invoice.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{payment.reference}</td>
                        <td>{invoice.reference}</td>
                        <td>{f.date(payment.date)}</td>
                        <td>{f.money(payment.amount)}</td>
                      </tr>
                    )),
                  )}
                </tbody>
              </Table>
            </Card>
          </>
        )}
      </State>
      {receipt && (
        <section className="receipt-print print-surface">
          <div className="sample-ribbon">{t("sampleDocument")}</div>
          <h1>{t("brand")}</h1>
          <h2>{t("receipt")}</h2>
          <p>
            {p.data?.name} · {p.data?.student_id}
          </p>
          <p>
            {receipt.reference} · {receipt.description}
          </p>
          <Table>
            <thead>
              <tr>
                <th>{t("reference")}</th>
                <th>{t("date")}</th>
                <th>{t("amount")}</th>
              </tr>
            </thead>
            <tbody>
              {receipt.payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.reference}</td>
                  <td>{f.date(payment.date)}</td>
                  <td>{f.money(payment.amount)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <p>
            {t("paid")}: {f.money(receipt.paid)}
          </p>
          <p>{t("printWarning")}</p>
        </section>
      )}
    </>
  );
}
export function NoticesPage() {
  const { t, i18n } = useTranslation();
  const f = useFormat();
  const q = useData<Notice[]>("notices/");
  const [category, setCategory] = useState("all");
  const categories = [...new Set(q.data?.map((n) => n.category) || [])];
  const rows = (q.data || []).filter(
    (n) => category === "all" || n.category === category,
  );
  return (
    <>
      <PageTitle title={t("notices")} description={t("noticesSub")} />
      <div className="filter-tabs" role="group" aria-label={t("category")}>
        {["all", ...categories].map((key) => (
          <button
            key={key}
            className={category === key ? "active" : ""}
            aria-pressed={category === key}
            onClick={() => setCategory(key)}
          >
            {t(key, { defaultValue: key })}
          </button>
        ))}
      </div>
      <State query={q}>
        <div className="notice-list">
          {rows.map((notice) => (
            <Card key={notice.id} className="notice-full">
              <div className="notice-full-meta">
                <Badge tone="green">
                  {t(notice.category, { defaultValue: notice.category })}
                </Badge>
                <span>{f.date(notice.published_at)}</span>
              </div>
              <h2>{f.title(notice)}</h2>
              <p>
                {i18n.language === "bn" && notice.body_bn
                  ? notice.body_bn
                  : notice.body}
              </p>
            </Card>
          ))}
        </div>
        {!rows.length && (
          <Card>
            <Empty message={t("noNotices")} />
          </Card>
        )}
      </State>
    </>
  );
}
export function AdmitPage() {
  const { t, i18n } = useTranslation();
  const q = useData<AdmitCard>("me/admit-card/");
  const f = useFormat();
  return (
    <>
      <PageTitle title={t("admit")} description={t("admitSub")}>
        {q.data?.available && (
          <Button onClick={() => window.print()}>
            <Printer size={17} />
            {t("print")}
          </Button>
        )}
      </PageTitle>
      <State query={q}>
        {q.data &&
          (q.data.available ? (
            <section className="admit-sheet print-surface">
              <div className="sample-ribbon">{t("sampleDocument")}</div>
              <header className="admit-header">
                <span className="admit-logo">
                  <GraduationCap size={34} />
                </span>
                <h1>{t("brand")}</h1>
                <p>
                  {t("examinations")} · {q.data.term}
                </p>
                <h2>{t("admit")}</h2>
              </header>
              <div className="admit-identity">
                <div>
                  <span>{t("studentName")}</span>
                  <strong>{q.data.student?.name}</strong>
                </div>
                <div>
                  <span>{t("studentId")}</span>
                  <strong>{q.data.student?.student_id}</strong>
                </div>
                <div>
                  <span>{t("program")}</span>
                  <strong>{q.data.student?.program}</strong>
                </div>
                <div>
                  <span>{t("semester")}</span>
                  <strong>{q.data.term}</strong>
                </div>
              </div>
              <h3>{t("examSchedule")}</h3>
              <Table>
                <thead>
                  <tr>
                    <th>{t("course")}</th>
                    <th>{t("date")}</th>
                    <th>{t("time")}</th>
                    <th>{t("room")}</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.exams?.map((exam) => (
                    <tr key={exam.code}>
                      <td>
                        <span className="course-code">{exam.code}</span>
                        <strong className="table-title">{exam.title}</strong>
                      </td>
                      <td>{f.date(exam.date)}</td>
                      <td>{exam.time}</td>
                      <td>{exam.room}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <footer className="admit-footer">
                <p>{t("printWarning")}</p>
                <span>{t("signature")}</span>
              </footer>
            </section>
          ) : (
            <Card>
              <Empty message={t("unavailable")} />
              <p className="empty-sub">
                {i18n.language === "en" ? q.data.reason : t("admitUnavailable")}
              </p>
            </Card>
          ))}
      </State>
    </>
  );
}
export function ProfilePage() {
  const { t } = useTranslation();
  const q = useData<Profile>("me/profile/");
  const rows = [
    ["studentId", "student_id"],
    ["email", "email"],
    ["phone", "phone"],
    ["program", "program"],
    ["batch", "batch"],
    ["semester", "semester"],
    ["curriculum", "curriculum"],
    ["advisor", "advisor"],
    ["status", "status"],
  ] as const;
  return (
    <>
      <PageTitle title={t("profile")} description={t("profileSub")} />
      <State query={q}>
        {q.data && (
          <Card className="profile-card">
            <div className="profile-hero">
              <span className="profile-avatar">
                {q.data.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div>
                <h2>{q.data.name}</h2>
                <p>{q.data.program}</p>
                <Badge tone="green">
                  {t(q.data.status, { defaultValue: q.data.status })}
                </Badge>
              </div>
              <GraduationCap size={58} />
            </div>
            <dl className="profile-details">
              {rows.map(([label, key]) => (
                <div key={key}>
                  <dt>{t(label)}</dt>
                  <dd>
                    {key === "status"
                      ? t(q.data![key], { defaultValue: q.data![key] })
                      : q.data![key] || "—"}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="info-note">
              <Info size={17} />
              {t("readOnlyProfile")}
            </p>
          </Card>
        )}
      </State>
    </>
  );
}
export function StudyPage() {
  const { t } = useTranslation();
  const { mode, setMode, user } = useApp();
  return (
    <>
      <PageTitle title={t("studyTitle")} description={t("studySub")} />
      <Card className="study-intro">
        <span className="study-icon">
          <FlaskConical size={28} />
        </span>
        <h2>{t("study")}</h2>
        <p>{t("studyIntro")}</p>
      </Card>
      <div className="study-modes">
        {(["basic", "enhanced"] as const).map((value) => (
          <Card
            key={value}
            className={`study-mode ${mode === value ? "chosen" : ""}`}
          >
            <span className="study-mode-icon">
              {value === "basic" ? <BookOpen /> : <Award />}
            </span>
            <h2>{t(value === "basic" ? "baseline" : "enhanced")}</h2>
            <p>{t(value === "basic" ? "baselineDesc" : "enhancedDesc")}</p>
            <Button
              variant={mode === value ? "default" : "outline"}
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
            >
              {mode === value ? <Check size={17} /> : null}
              {t(mode === value ? "selected" : "useView")}
            </Button>
          </Card>
        ))}
      </div>
      <div className="two-column">
        <Card>
          <PanelHeader title={t("studyTasks")} />
          <ol className="task-list">
            {["task1", "task2", "task3", "task4"].map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ol>
          <p className="muted">{t("studyMethod")}</p>
        </Card>
        <Card>
          <PanelHeader title={t("studyAccounts")} />
          <div className="study-account-row">
            <code>study_a</code>
            <code>study_b</code>
          </div>
          <p>{t("studyAccountNote")}</p>
          <p className="muted">
            {t("password")}: <code>CampusDemo!2026</code>
          </p>
          <p className="info-note">
            <Info size={17} />
            {t("studyPrivacy")}
          </p>
        </Card>
      </div>
      <Button asChild>
        <Link to={user?.role === "admin" ? "/admin" : "/dashboard"}>
          {t("backDashboard")}
        </Link>
      </Button>
    </>
  );
}
