import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BookOpen,
  Check,
  GraduationCap,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useApp } from "../state";
import { errorText } from "../lib/api";
import { Button } from "../components/ui";
import { LanguageSwitch } from "../components/Layout";
export function Login() {
  const { t } = useTranslation();
  const { login, user } = useApp();
  const nav = useNavigate();
  const [username, setUsername] = useState("student");
  const [password, setPassword] = useState("CampusDemo!2026");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const account = await login(username, password);
      nav(account.role === "admin" ? "/admin" : "/dashboard");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  if (user)
    return (
      <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />
    );
  return (
    <div className="login-page">
      <section className="login-story">
        <div className="brand">
          <span className="brand-symbol">
            <GraduationCap size={28} />
          </span>
          <span>
            {t("brand")}
            <small>{t("workspace")}</small>
          </span>
        </div>
        <div className="login-story-content">
          <span className="login-kicker">
            <Sparkles size={16} />
            {t("academicOverview")}
          </span>
          <h1>{t("loginTitle")}</h1>
          <p>{t("loginSub")}</p>
          <div className="login-illustration">
            <div className="illustration-top">
              <span className="illustration-icon">
                <GraduationCap />
              </span>
              <div>
                <small>{t("creditCompletion")}</small>
                <strong>
                  72 <span>/ 144</span>
                </strong>
              </div>
              <span className="illustration-check">
                <Check size={18} />
              </span>
            </div>
            <div className="illustration-progress">
              <i />
            </div>
            <div className="illustration-bottom">
              <span>
                <span className="dot mint-dot" />
                {t("completed")}
              </span>
              <span>50%</span>
            </div>
            <div className="floating-chip">
              <BookOpen size={18} />
              {t("courseCompletion")}
              <Check size={15} />
            </div>
          </div>
        </div>
        <p className="login-story-footer">{t("fictional")}</p>
      </section>
      <section className="login-form-side">
        <div className="login-language">
          <LanguageSwitch />
        </div>
        <div className="login-form">
          <span className="login-shield">
            <ShieldCheck size={24} />
          </span>
          <h2>{t("loginWelcome")}</h2>
          <p>{t("loginPrompt")}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <label>
              {t("username")}
              <input
                name="username"
                autoComplete="username"
                value={username}
                required
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>
            <label>
              {t("password")}
              <input
                name="password"
                autoComplete="current-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <Button type="submit" disabled={busy}>
              {t(busy ? "signingIn" : "signIn")}
              <ArrowRight size={17} />
            </Button>
          </form>
          <div className="demo-divider">
            <span>{t("demoAccounts")}</span>
          </div>
          <div className="demo-login-grid">
            {[
              ["student", "studentDemo"],
              ["admin", "adminDemo"],
              ["study_a", "studyA"],
              ["study_b", "studyB"],
            ].map(([name, label]) => (
              <button
                key={name}
                type="button"
                className={username === name ? "selected" : ""}
                onClick={() => {
                  setUsername(name);
                  setPassword(
                    name === "admin" ? "CampusAdmin!2026" : "CampusDemo!2026",
                  );
                }}
              >
                {t(label)}
              </button>
            ))}
          </div>
          <p className="login-demo-note">
            {t("demo")} · {t("fictional")}
          </p>
        </div>
      </section>
    </div>
  );
}
