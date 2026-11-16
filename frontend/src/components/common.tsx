import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  LoaderCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import { api, errorText } from "../lib/api";
import { Button, Card, Badge } from "./ui";
export const useData = <T,>(path: string) =>
  useQuery<T>({ queryKey: [path], queryFn: () => api<T>(path), retry: false });
export function State({
  query,
  children,
}: {
  query: { isPending: boolean; error: unknown; refetch: () => unknown };
  children: ReactNode;
}) {
  const { t } = useTranslation();
  if (query.isPending)
    return (
      <div className="loading-state" role="status">
        <LoaderCircle className="spin" />
        {t("loading")}
      </div>
    );
  if (query.error)
    return (
      <Card className="error-state" role="alert">
        <AlertCircle />
        <p>{errorText(query.error)}</p>
        <Button variant="outline" onClick={() => void query.refetch()}>
          {t("retry")}
        </Button>
      </Card>
    );
  return <>{children}</>;
}
export function PageTitle({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  );
}
export function Empty({
  message,
  children,
}: {
  message?: string;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="empty-state">
      <BookOpen size={27} />
      <p>{message || t("empty")}</p>
      {children}
    </div>
  );
}
export function Stat({
  label,
  value,
  sub,
  icon,
  tone = "mint",
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon: ReactNode;
  tone?: string;
}) {
  return (
    <Card className="stat">
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-icon ${tone}`}>{icon}</span>
      </div>
      <strong>{value}</strong>
      <p>{sub}</p>
    </Card>
  );
}
export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const tone = [
    "approved",
    "completed",
    "paid",
    "published",
    "present",
    "active",
  ].includes(status)
    ? "green"
    : ["pending", "in_progress", "draft", "partial", "excused"].includes(status)
      ? "amber"
      : ["rejected", "absent", "overdue", "unpaid"].includes(status)
        ? "red"
        : "neutral";
  return <Badge tone={tone}>{t(status, { defaultValue: status })}</Badge>;
}
export function PanelHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel-heading">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export const Arrow = () => <ArrowUpRight size={16} />;
export function useFormat() {
  const { i18n } = useTranslation();
  const locale = i18n.language === "bn" ? "bn-BD" : "en-BD";
  return {
    number: (n: number, decimals = 2) =>
      new Intl.NumberFormat(locale, { maximumFractionDigits: decimals }).format(
        n,
      ),
    money: (n: number) =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "BDT",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n),
    date: (value: string) =>
      new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Dhaka",
      }).format(new Date(value)),
    title: (item: { title: string; title_bn?: string }) =>
      i18n.language === "bn" && item.title_bn ? item.title_bn : item.title,
  };
}
