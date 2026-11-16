import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Compass, MessageCircle, Send, X } from "lucide-react";
import { helpTopics } from "../lib/routes";
import { Button } from "./ui";
import { useData } from "./common";
import type { AdmitCard } from "../lib/types";
export function Helper() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<number[]>([]);
  const [asked, setAsked] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const previouslyOpen = useRef(false);
  const admit = useData<AdmitCard>("me/admit-card/");
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-campus-guide", handler);
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("open-campus-guide", handler);
      window.removeEventListener("keydown", escape);
    };
  }, []);
  useEffect(() => {
    if (open) field.current?.focus();
    else if (previouslyOpen.current) launcher.current?.focus();
    previouslyOpen.current = open;
  }, [open]);
  const ask = (text: string, index?: number) => {
    const clean = text.trim();
    if (!clean) return;
    setQuery(clean);
    setInput("");
    setAsked(true);
    setMatches(
      index === undefined
        ? helpTopics
            .map((topic, i) =>
              topic.words.some((word) =>
                clean.toLocaleLowerCase().includes(word),
              )
                ? i
                : -1,
            )
            .filter((i) => i >= 0)
        : [index],
    );
  };
  const selected = matches.length === 1 ? helpTopics[matches[0]] : null;
  return (
    <div className="helper-wrap no-print">
      {open && (
        <section
          className="helper-panel"
          id="campus-guide-panel"
          role="dialog"
          aria-modal={false}
          aria-label={t("helperTitle")}
        >
          <header>
            <span className="helper-avatar">
              <Compass size={20} />
            </span>
            <div>
              <strong>{t("helperTitle")}</strong>
              <small>{t("helperNote")}</small>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              aria-label={t("closeHelp")}
            >
              <X size={18} />
            </Button>
          </header>
          <div className="helper-body">
            <h3>{t("helperGreeting")}</h3>
            <p>{t("helperIntro")}</p>
            {asked && (
              <div className="helper-answer" aria-live="polite">
                <div className="user-question">{query}</div>
                {selected ? (
                  <>
                    <p>{t("helperPath")}</p>
                    <div className="breadcrumb">
                      {selected.trail.map((key) => t(key)).join(" → ")}
                    </div>
                    {selected.key === "admit" &&
                      admit.data?.available === false && (
                        <p className="helper-unavailable">
                          {t("admitUnavailable")}
                        </p>
                      )}
                    <Button asChild size="sm">
                      <Link to={selected.path} onClick={() => setOpen(false)}>
                        {t("openPage", { page: t(selected.key) })}
                        <ArrowRight size={15} />
                      </Link>
                    </Button>
                  </>
                ) : (
                  <p>
                    {t(
                      matches.length > 1 ? "helperAmbiguous" : "helperUnknown",
                    )}
                  </p>
                )}
              </div>
            )}
            <div className="helper-topics">
              {helpTopics.map(
                (topic, index) =>
                  (!asked || matches.length !== 1) &&
                  (!matches.length || matches.includes(index)) && (
                    <button
                      key={topic.key}
                      onClick={() => ask(t(`question_${topic.key}`), index)}
                    >
                      {t(`question_${topic.key}`)}
                      <ArrowRight size={14} />
                    </button>
                  ),
              )}
            </div>
            {selected && (
              <button
                className="text-button"
                onClick={() => {
                  setAsked(false);
                  setMatches([]);
                }}
              >
                {t("viewAll")}
              </button>
            )}
          </div>
          <form
            className="helper-input"
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
          >
            <input
              ref={field}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("helperInput")}
              aria-label={t("helperLabel")}
              maxLength={200}
            />
            <Button
              type="submit"
              disabled={!input.trim()}
              aria-label={t("send")}
            >
              <Send size={17} />
            </Button>
          </form>
        </section>
      )}
      <button
        ref={launcher}
        className={`helper-launcher ${open ? "is-open" : ""}`}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="campus-guide-panel"
        aria-label={t(open ? "closeHelp" : "openHelp")}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        <span>{t("helperTitle")}</span>
        {!open && <span className="helper-live" />}
      </button>
    </div>
  );
}
