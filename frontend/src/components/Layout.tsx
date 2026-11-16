import { useEffect, useState } from "react";
import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  GraduationCap,
  LayoutDashboard,
  ChartNoAxesCombined,
  BookOpen,
  ClipboardList,
  CalendarDays,
  Award,
  UserCheck,
  Wallet,
  Bell,
  ContactRound,
  UserRound,
  ShieldCheck,
  FlaskConical,
  LogOut,
  Menu,
  X,
  Languages,
  ArrowUpRight,
  PanelLeftClose,
} from "lucide-react";
import { useApp } from "../state";
import { paths } from "../lib/routes";
import { Button } from "./ui";
import { Helper } from "./Helper";
const groups = [
  {
    label: "personal",
    items: [
      ["dashboard", LayoutDashboard],
      ["progress", ChartNoAxesCombined],
    ],
  },
  {
    label: "academics",
    items: [
      ["courses", BookOpen],
      ["registration", ClipboardList],
      ["routine", CalendarDays],
      ["results", Award],
      ["attendance", UserCheck],
    ],
  },
  {
    label: "campus",
    items: [
      ["fees", Wallet],
      ["notices", Bell],
      ["admit", ContactRound],
      ["profile", UserRound],
    ],
  },
] as const;
export function LanguageSwitch() {
  const { t, i18n } = useTranslation();
  return (
    <button
      className="language-switch"
      onClick={() =>
        void i18n.changeLanguage(i18n.language === "bn" ? "en" : "bn")
      }
      aria-label={t("languageToggle")}
    >
      <Languages size={16} />
      <span>{i18n.language === "bn" ? "English" : "বাংলা"}</span>
    </button>
  );
}
export function Layout() {
  const { t } = useTranslation();
  const { user, logout, mode } = useApp();
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobile(false);
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);
  const navigate = useNavigate();
  const initials =
    (user?.first_name?.[0] || "C") + (user?.last_name?.[0] || "U");
  return (
    <div className="app-layout">
      <a className="skip-link no-print" href="#main-content">
        {t("skipMain")}
      </a>
      <div
        className={`sidebar-shade ${mobile ? "visible" : ""}`}
        onClick={() => setMobile(false)}
      />
      <aside
        id="campus-navigation"
        className={`sidebar ${mobile ? "sidebar-open" : ""}`}
      >
        <Link
          className="brand"
          to={user?.role === "admin" ? paths.admin : paths.dashboard}
          onClick={() => setMobile(false)}
        >
          <span className="brand-symbol">
            <GraduationCap size={26} />
          </span>
          <span>
            {t("brand")}
            <small>{t("workspace")}</small>
          </span>
        </Link>
        <button
          className="sidebar-mobile-close"
          onClick={() => setMobile(false)}
          aria-label={t("close")}
        >
          <X />
        </button>
        <div className="sidebar-scroll">
          <div className="student-switch">
            <span className="avatar">{initials}</span>
            <div>
              <strong>
                {user?.first_name} {user?.last_name}
              </strong>
              <small>{user?.student_id || t("admin")}</small>
            </div>
            <PanelLeftClose size={15} />
          </div>
          <nav aria-label={t("mobileMenu")}>
            {user?.role === "admin" ? (
              <div className="nav-group">
                <p>{t("admin")}</p>
                <NavLink
                  to={paths.admin}
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={() => setMobile(false)}
                >
                  <ShieldCheck size={18} />
                  {t("admin")}
                </NavLink>
              </div>
            ) : (
              groups.map((group) => (
                <div className="nav-group" key={group.label}>
                  <p>{t(group.label)}</p>
                  {group.items.map(([key, Icon]) => (
                    <NavLink
                      key={key}
                      to={paths[key]}
                      className={({ isActive }) => (isActive ? "active" : "")}
                      onClick={() => setMobile(false)}
                    >
                      <Icon size={18} />
                      <span>{t(key)}</span>
                      {key === "registration" && <span className="nav-dot" />}
                    </NavLink>
                  ))}
                </div>
              ))
            )}
          </nav>
          <div className="sidebar-bottom-card">
            <span className="tiny-eyebrow">
              <FlaskConical size={14} />
              {t("demoShort")}
            </span>
            <strong>{t("study")}</strong>
            <p>{t("fictional")}</p>
            <Link to={paths.study} onClick={() => setMobile(false)}>
              {t("viewDetails")}
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
        <button
          className="signout"
          onClick={() =>
            void logout()
              .then(() => navigate("/login"))
              .catch(() => {})
          }
        >
          <LogOut size={17} />
          {t("signOut")}
        </button>
        <div className="sidebar-footer">
          <span className="connection-dot" />
          {t("operational")}
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar no-print">
          <div className="topbar-context">
            <Button
              variant="ghost"
              className="mobile-menu"
              onClick={() => setMobile(true)}
              aria-label={t("menu")}
              aria-expanded={mobile}
              aria-controls="campus-navigation"
            >
              <Menu size={21} />
            </Button>
            <span className="breadcrumb-root">
              {t(user?.role === "admin" ? "admin" : "workspace")}
            </span>
            <span className="topbar-slash">/</span>
            <span>{t("academics")}</span>
          </div>
          <div className="topbar-tools">
            <span className="environment">
              <span />
              {t("demo")}
            </span>
            <LanguageSwitch />
            {user?.role === "student" && (
              <Link
                className="bell-button"
                to={paths.notices}
                aria-label={t("notices")}
              >
                <Bell size={19} />
              </Link>
            )}
            <span className="avatar avatar-small">{initials}</span>
          </div>
        </header>
        {mode === "basic" && (
          <div className="baseline-banner no-print">
            <FlaskConical size={16} />
            {t("viewMode")}: {t("baseline")}
            <Link to={paths.study}>{t("viewDetails")}</Link>
          </div>
        )}
        <main className="page-content" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
        <footer className="page-footer no-print">
          <span>{t("footer")}</span>
          <Link to={paths.study}>
            {t("study")}
            <ArrowUpRight size={13} />
          </Link>
        </footer>
      </div>
      {user?.role === "student" && mode === "enhanced" && <Helper />}
    </div>
  );
}
