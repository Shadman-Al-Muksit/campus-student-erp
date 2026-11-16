import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDown, GraduationCap } from "lucide-react";
import { useApp } from "../state";
import { errorText } from "../lib/api";
import { Button } from "../components/ui";
import { LanguageSwitch } from "../components/Layout";

export function Login() {
  const { t } = useTranslation();
  const { login, user } = useApp();
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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

  if (user) {
    return (
      <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />
    );
  }

  return (
    <div className="auth-page">
      <header className="auth-header">
        <div className="auth-header-inner">
          <div className="auth-identity">
            <span className="auth-mark" aria-hidden="true">
              <GraduationCap size={24} strokeWidth={1.6} />
            </span>
            <span className="auth-brand-name">{t("brand")}</span>
            <span className="auth-brand-divider" aria-hidden="true" />
            <span className="auth-portal-name">{t("academicPortal")}</span>
          </div>
          <LanguageSwitch />
        </div>
      </header>

      <main className="auth-main">
        <section className="auth-card" aria-labelledby="sign-in-heading">
          <div className="auth-heading">
            <h1 id="sign-in-heading">{t("loginHeading")}</h1>
            <p>{t("loginAccountHint")}</p>
          </div>

          <form
            className="auth-form"
            aria-busy={busy}
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <label>
              {t("username")}
              <input
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={username}
                required
                disabled={busy}
                onChange={(event) => setUsername(event.target.value)}
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
                disabled={busy}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <Button type="submit" disabled={busy}>
              {t(busy ? "signingIn" : "signIn")}
            </Button>
          </form>
        </section>

        <details className="auth-demo">
          <summary>
            <span>{t("loginDemoAccess")}</span>
            <ChevronDown size={16} aria-hidden="true" />
          </summary>
          <div className="auth-demo-content">
            <p>{t("loginDemoHint")}</p>
            <div className="auth-demo-accounts">
              {[
                ["student", "studentDemo"],
                ["admin", "adminDemo"],
                ["study_a", "studyA"],
                ["study_b", "studyB"],
              ].map(([name, label]) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={username === name}
                  disabled={busy}
                  onClick={() => {
                    setUsername(name);
                    setPassword(
                      name === "admin" ? "CampusAdmin!2026" : "CampusDemo!2026",
                    );
                    setError("");
                  }}
                >
                  <span>{t(label)}</span>
                  <span className="auth-demo-username" aria-hidden="true">
                    {name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </details>

        <p className="auth-footnote">{t("loginDemoNote")}</p>
      </main>
    </div>
  );
}
