import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Check,
  ClipboardList,
  GraduationCap,
  Info,
  Plus,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useApp } from "../state";
import { post, errorText } from "../lib/api";
import type {
  AdminOverview,
  Registration,
  AdminResult,
  AdminSetup,
  Offering,
  Audit,
  Invoice,
} from "../lib/types";
import {
  useData,
  State,
  PageTitle,
  Stat,
  PanelHeader,
  StatusBadge,
  Empty,
  useFormat,
} from "../components/common";
import { Button, Card, Table, Badge } from "../components/ui";
type AdminInvoice = Invoice & { student_id: string; student_name: string };
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="form-field">
      {label}
      {children}
    </label>
  );
}
export function AdminPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const { notify } = useApp();
  const client = useQueryClient();
  const [tab, setTab] = useState("approvals");
  const [decisionNotes, setDecisionNotes] = useState<Record<number, string>>(
    {},
  );
  const overview = useData<AdminOverview>("admin/overview/");
  const registrations = useData<Registration[]>("admin/registrations/");
  const results = useData<AdminResult[]>("admin/results/");
  const setup = useData<AdminSetup>("admin/setup/");
  const offerings = useData<Offering[]>("courses/");
  const invoices = useData<AdminInvoice[]>("admin/invoices/");
  const audit = useData<Audit[]>("admin/audit/");
  const mutation = useMutation({
    mutationFn: ({ endpoint, body }: { endpoint: string; body: unknown }) =>
      post(endpoint, body),
    onSuccess: () => {
      notify(t("success"));
      void client.invalidateQueries();
    },
    onError: (e) => notify(errorText(e), true),
  });
  const submit =
    (
      endpoint: string,
      build: (data: Record<string, FormDataEntryValue>) => unknown,
    ) =>
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = Object.fromEntries(new FormData(form));
      mutation.mutate(
        { endpoint, body: build(data) },
        { onSuccess: () => form.reset() },
      );
    };
  const studentOptions = setup.data?.students.map((student) => (
    <option key={student.id} value={student.id}>
      {student.student_id} · {student.name}
    </option>
  ));
  const tabs = [
    "approvals",
    "publishResults",
    "setup",
    "recordAttendance",
    "financeTools",
    "publishNotice",
    "audit",
  ];
  return (
    <>
      <PageTitle title={t("welcomeAdmin")} description={t("adminSub")}>
        <Badge tone="green">
          <ShieldCheck size={14} />
          {t("admin")}
        </Badge>
      </PageTitle>
      <p className="info-note">
        <Info size={17} />
        {t("formHint")}
      </p>
      <State query={overview}>
        {overview.data && (
          <div className="stats-grid">
            <Stat
              label={t("students")}
              value={f.number(overview.data.students)}
              icon={<Users />}
            />
            <Stat
              label={t("pendingRequests")}
              value={f.number(overview.data.pending_registrations)}
              icon={<ClipboardList />}
              tone="sand"
            />
            <Stat
              label={t("activeOfferings")}
              value={f.number(overview.data.active_offerings)}
              icon={<BookOpen />}
              tone="blue"
            />
            <Stat
              label={t("outstandingFees")}
              value={f.money(overview.data.outstanding_fees)}
              icon={<Wallet />}
              tone="rose"
            />
          </div>
        )}
      </State>
      <div
        className="filter-tabs admin-tabs"
        role="group"
        aria-label={t("tools")}
      >
        {tabs.map((key) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
          >
            {t(key)}
            {key === "approvals" && !!overview.data?.pending_registrations && (
              <span>{f.number(overview.data.pending_registrations)}</span>
            )}
          </button>
        ))}
      </div>
      {tab === "approvals" && (
        <State query={registrations}>
          <Card>
            <PanelHeader title={t("approvals")} />
            {registrations.data?.length ? (
              <Table>
                <thead>
                  <tr>
                    <th>{t("student")}</th>
                    <th>{t("course")}</th>
                    <th>{t("status")}</th>
                    <th>{t("note")}</th>
                    <th>{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.data.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.student?.name}</strong>
                        <small className="table-title">
                          {row.student?.student_id}
                        </small>
                      </td>
                      <td>
                        <span className="course-code">{row.offering.code}</span>
                        <strong className="table-title">
                          {f.title(row.offering)}
                        </strong>
                        <small>
                          {row.offering.term} · {row.offering.section}
                        </small>
                      </td>
                      <td>
                        <StatusBadge status={row.status} />
                      </td>
                      <td>
                        {row.status === "pending" ? (
                          <input
                            className="table-input"
                            aria-label={`${t("note")} ${row.id}`}
                            value={decisionNotes[row.id] || ""}
                            onChange={(e) =>
                              setDecisionNotes({
                                ...decisionNotes,
                                [row.id]: e.target.value,
                              })
                            }
                            placeholder={t("optional")}
                          />
                        ) : (
                          row.decision_note || "—"
                        )}
                      </td>
                      <td>
                        <div className="table-actions">
                          {row.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                disabled={mutation.isPending}
                                onClick={() =>
                                  mutation.mutate({
                                    endpoint: `admin/registrations/${row.id}/decide/`,
                                    body: {
                                      decision: "approved",
                                      note: decisionNotes[row.id] || "",
                                    },
                                  })
                                }
                              >
                                <Check size={14} />
                                {t("approve")}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={mutation.isPending}
                                onClick={() =>
                                  mutation.mutate({
                                    endpoint: `admin/registrations/${row.id}/decide/`,
                                    body: {
                                      decision: "rejected",
                                      note: decisionNotes[row.id] || "",
                                    },
                                  })
                                }
                              >
                                <X size={14} />
                                {t("reject")}
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <Empty message={t("noPending")} />
            )}
          </Card>
        </State>
      )}
      {tab === "publishResults" && (
        <State query={results}>
          <Card>
            <PanelHeader
              title={t("draftResults")}
              description={t("publishedHint")}
            />
            <Table>
              <thead>
                <tr>
                  <th>{t("student")}</th>
                  <th>{t("course")}</th>
                  <th>{t("semester")}</th>
                  <th>{t("grade")}</th>
                  <th>{t("status")}</th>
                  <th>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {results.data?.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.student_name}</strong>
                      <small className="table-title">{row.student_id}</small>
                    </td>
                    <td>
                      <span className="course-code">{row.code}</span>
                      <strong className="table-title">{row.title}</strong>
                    </td>
                    <td>{row.term}</td>
                    <td>
                      {row.grade} · {row.grade_points}
                    </td>
                    <td>
                      <StatusBadge
                        status={row.published ? "published" : "draft"}
                      />
                    </td>
                    <td>
                      {!row.published && (
                        <Button
                          size="sm"
                          disabled={mutation.isPending}
                          onClick={() =>
                            mutation.mutate({
                              endpoint: `admin/results/${row.id}/publish/`,
                              body: {},
                            })
                          }
                        >
                          {t("publish")}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </State>
      )}
      {tab === "setup" && (
        <State query={setup}>
          <>
            <Card>
              <PanelHeader title={t("createOffering")} />
              <form
                className="admin-form"
                onSubmit={submit("admin/offerings/", (data) => ({
                  course_id: Number(data.course_id),
                  term_id: Number(data.term_id),
                  section: data.section,
                  instructor: data.instructor,
                  capacity: Number(data.capacity),
                  schedule: [
                    {
                      day: data.day,
                      start: data.start,
                      end: data.end,
                      room: data.room,
                    },
                  ],
                }))}
              >
                <Field label={t("course")}>
                  <select name="course_id" required defaultValue="">
                    <option value="" disabled>
                      {t("select")}
                    </option>
                    {setup.data?.courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} · {c.title}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("term")}>
                  <select name="term_id" required defaultValue="">
                    <option value="" disabled>
                      {t("select")}
                    </option>
                    {setup.data?.terms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("section")}>
                  <input
                    name="section"
                    required
                    maxLength={20}
                    placeholder="A"
                  />
                </Field>
                <Field label={t("instructor")}>
                  <input name="instructor" required maxLength={150} />
                </Field>
                <Field label={t("capacity")}>
                  <input
                    type="number"
                    name="capacity"
                    min="1"
                    max="1000"
                    required
                    defaultValue="30"
                  />
                </Field>
                <Field label={t("day")}>
                  <select name="day">
                    {[
                      "Sunday",
                      "Monday",
                      "Tuesday",
                      "Wednesday",
                      "Thursday",
                      "Friday",
                      "Saturday",
                    ].map((day) => (
                      <option key={day} value={day}>
                        {t(day)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("start")}>
                  <input name="start" type="time" required />
                </Field>
                <Field label={t("end")}>
                  <input name="end" type="time" required />
                </Field>
                <Field label={t("room")}>
                  <input name="room" required maxLength={40} />
                </Field>
                <div className="form-submit">
                  <Button disabled={mutation.isPending}>
                    <Plus size={16} />
                    {t("createOffering")}
                  </Button>
                </div>
              </form>
            </Card>
            <Card>
              <PanelHeader title={t("activeOfferings")} />
              <Table>
                <thead>
                  <tr>
                    <th>{t("offeringId")}</th>
                    <th>{t("course")}</th>
                    <th>{t("term")}</th>
                    <th>{t("section")}</th>
                    <th>{t("instructor")}</th>
                    <th>{t("enrolled")}</th>
                  </tr>
                </thead>
                <tbody>
                  {offerings.data?.map((row) => (
                    <tr key={row.id}>
                      <td>{row.id}</td>
                      <td>
                        {row.code} · {row.title}
                      </td>
                      <td>{row.term}</td>
                      <td>{row.section}</td>
                      <td>{row.instructor}</td>
                      <td>
                        {row.enrolled}/{row.capacity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
            <Card>
              <PanelHeader title={t("setupReference")} />
              <Table>
                <thead>
                  <tr>
                    <th>{t("studentRecordId")}</th>
                    <th>{t("studentId")}</th>
                    <th>{t("studentName")}</th>
                  </tr>
                </thead>
                <tbody>
                  {setup.data?.students.map((student) => (
                    <tr key={student.id}>
                      <td>{student.id}</td>
                      <td>{student.student_id}</td>
                      <td>{student.name}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          </>
        </State>
      )}
      {tab === "recordAttendance" && (
        <Card>
          <PanelHeader
            title={t("recordAttendance")}
            description={t("adminAttendanceHint")}
          />
          <form
            className="admin-form"
            onSubmit={submit("admin/attendance/", (data) => ({
              offering_id: Number(data.offering_id),
              date: data.date,
              records: [
                { student_id: Number(data.student_id), status: data.status },
              ],
              cancelled: data.cancelled === "on",
            }))}
          >
            <Field label={t("offering")}>
              <select name="offering_id" required defaultValue="">
                <option value="" disabled>
                  {t("select")}
                </option>
                {offerings.data?.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.code} · {row.term} · {row.section}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("student")}>
              <select name="student_id" required defaultValue="">
                <option value="" disabled>
                  {t("select")}
                </option>
                {studentOptions}
              </select>
            </Field>
            <Field label={t("meetingDate")}>
              <input name="date" type="date" required />
            </Field>
            <Field label={t("status")}>
              <select name="status">
                {["present", "absent", "excused"].map((key) => (
                  <option key={key} value={key}>
                    {t(key)}
                  </option>
                ))}
              </select>
            </Field>
            <label className="checkbox-field">
              <input name="cancelled" type="checkbox" />
              {t("cancelled")}
            </label>
            <div className="form-submit">
              <Button disabled={mutation.isPending}>{t("save")}</Button>
            </div>
          </form>
        </Card>
      )}
      {tab === "financeTools" && (
        <>
          <div className="two-column">
            <Card>
              <PanelHeader title={t("createInvoice")} />
              <form
                className="admin-form form-single"
                onSubmit={submit("admin/invoices/", (data) => ({
                  ...data,
                  student_id: Number(data.student_id),
                  amount: Number(data.amount),
                }))}
              >
                <Field label={t("student")}>
                  <select name="student_id" required defaultValue="">
                    <option value="" disabled>
                      {t("select")}
                    </option>
                    {studentOptions}
                  </select>
                </Field>
                <Field label={t("reference")}>
                  <input name="reference" required maxLength={60} />
                </Field>
                <Field label={t("description")}>
                  <input name="description" required maxLength={200} />
                </Field>
                <Field label={t("amount")}>
                  <input
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </Field>
                <Field label={t("dueDate")}>
                  <input name="due_date" type="date" required />
                </Field>
                <Button disabled={mutation.isPending}>
                  {t("createInvoice")}
                </Button>
              </form>
            </Card>
            <Card>
              <PanelHeader
                title={t("recordPayment")}
                description={t("paymentHint")}
              />
              <form
                className="admin-form form-single"
                onSubmit={submit("admin/payments/", (data) => ({
                  ...data,
                  invoice_id: Number(data.invoice_id),
                  amount: Number(data.amount),
                }))}
              >
                <Field label={t("invoice")}>
                  <select name="invoice_id" required defaultValue="">
                    <option value="" disabled>
                      {t("select")}
                    </option>
                    {invoices.data
                      ?.filter((invoice) => invoice.outstanding > 0)
                      .map((invoice) => (
                        <option key={invoice.id} value={invoice.id}>
                          {invoice.reference} · {invoice.student_name} ·{" "}
                          {f.money(invoice.outstanding)}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label={t("reference")}>
                  <input name="reference" required maxLength={60} />
                </Field>
                <Field label={t("amount")}>
                  <input
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </Field>
                <Field label={t("date")}>
                  <input name="date" type="date" required />
                </Field>
                <Button disabled={mutation.isPending}>
                  {t("recordPayment")}
                </Button>
              </form>
            </Card>
          </div>
          <State query={invoices}>
            <Card>
              <PanelHeader title={t("viewInvoices")} />
              <Table>
                <thead>
                  <tr>
                    <th>{t("invoiceId")}</th>
                    <th>{t("reference")}</th>
                    <th>{t("student")}</th>
                    <th>{t("amount")}</th>
                    <th>{t("paid")}</th>
                    <th>{t("outstanding")}</th>
                    <th>{t("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.data?.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>{invoice.id}</td>
                      <td>{invoice.reference}</td>
                      <td>
                        {invoice.student_name}
                        <small className="table-title">
                          {invoice.student_id}
                        </small>
                      </td>
                      <td>{f.money(invoice.amount)}</td>
                      <td>{f.money(invoice.paid)}</td>
                      <td>{f.money(invoice.outstanding)}</td>
                      <td>
                        <StatusBadge status={invoice.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          </State>
        </>
      )}
      {tab === "publishNotice" && (
        <Card>
          <PanelHeader title={t("publishNotice")} />
          <form
            className="admin-form"
            onSubmit={submit("admin/notices/", (data) => data)}
          >
            <Field label={t("titleEn")}>
              <input name="title" required maxLength={200} />
            </Field>
            <Field label={t("titleBn")}>
              <input name="title_bn" required maxLength={200} />
            </Field>
            <Field label={t("bodyEn")}>
              <textarea name="body" required rows={6} />
            </Field>
            <Field label={t("bodyBn")}>
              <textarea name="body_bn" required rows={6} />
            </Field>
            <Field label={t("category")}>
              <select name="category">
                {["general", "academic", "finance"].map((key) => (
                  <option value={key} key={key}>
                    {t(key)}
                  </option>
                ))}
              </select>
            </Field>
            <div className="form-submit">
              <Button disabled={mutation.isPending}>{t("publish")}</Button>
            </div>
          </form>
        </Card>
      )}
      {tab === "audit" && (
        <State query={audit}>
          <Card>
            <PanelHeader title={t("audit")} description={t("auditSub")} />
            {audit.data?.length ? (
              <Table>
                <thead>
                  <tr>
                    <th>{t("date")}</th>
                    <th>{t("actor")}</th>
                    <th>{t("action")}</th>
                    <th>{t("target")}</th>
                    <th>{t("detail")}</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.data.map((row) => (
                    <tr key={row.id}>
                      <td>{f.date(row.created_at)}</td>
                      <td>{row.actor}</td>
                      <td>
                        <code>{row.action}</code>
                      </td>
                      <td>{row.target}</td>
                      <td className="audit-detail">
                        {typeof row.detail === "string"
                          ? row.detail
                          : JSON.stringify(row.detail)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <Empty />
            )}
          </Card>
        </State>
      )}
      <div className="admin-footer-note">
        <GraduationCap size={17} />
        {t("fictional")}
      </div>
    </>
  );
}
