"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Camera, Microphone, PaperPlaneRight, ShieldCheck, Sparkle } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/primitives";
import { RichText } from "@/components/ui/RichText";
import { ErrorState, ForbiddenState, LoadingState } from "@/components/ui/states";
import { cx } from "@/components/ui/cx";
import { ApiError } from "@/lib/api/client";
import * as api from "@/lib/api/w3";
import { voiceStatus } from "@/lib/api/w2";
import { usePageTitle } from "@/lib/usePageTitle";

type Message = { key: string; role: "STUDENT" | "TUTOR" | "SYSTEM"; text: string };

const MAX_CHARS = 2000;
const STARTERS = [
  "Why do ionic compounds have high melting points?",
  "How do I work out the number of moles?",
  "Can you explain what an isotope is?",
];

/** F-07 — tutor chat (Socratic). Replies and safety scripts come from the API; nothing is generated here. */
export default function Page() {
  const params = useParams() as Record<string, string>;
  const router = useRouter();
  const token = typeof window !== "undefined" ? sessionStorage.getItem("accessToken") ?? undefined : undefined;
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [paused, setPaused] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  usePageTitle("Tutor");

  // "Talk instead" only shows when a parent has consented and switched voice on.
  useEffect(() => {
    voiceStatus()
      .then((v) => setVoiceOn(v.available))
      .catch(() => setVoiceOn(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data: any = await api.tutorSession(params.tutorSessionId, token);
        if (cancelled) return;
        setSessionId(data.session.tutorSessionId);
        setPaused(data.session.status === "BLOCKED");
        setMessages((data.messages ?? []).map((m: any) => ({ key: m.messageId, role: m.role, text: m.text })));
      } catch (e) {
        if (cancelled) return;
        // Not found, not yours, or not a session id at all (e.g. an old /tutor/xyz link): start fresh.
        if (e instanceof ApiError && (e.status === 400 || e.status === 403 || e.status === 404)) {
          try {
            const started: any = await api.startTutor({ mode: "SOCRATIC" }, token);
            if (!cancelled) router.replace(`/tutor/${started.tutorSessionId}`);
          } catch (e2) {
            if (e2 instanceof ApiError && e2.status === 403) setForbidden(true);
            else setLoadError("We couldn't start a tutor session. Please try again.");
          }
          return;
        }
        setLoadError("We couldn't load this tutor session. Please try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.tutorSessionId, token, router]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || !sessionId || sending || paused) return;
    setSending(true);
    setSendError(null);
    setMessages((m) => [...m, { key: `s-${Date.now()}`, role: "STUDENT", text: t }]);
    setDraft("");
    try {
      const res: any = await api.tutorMessage(sessionId, { text: t }, token);
      setMessages((m) => [...m, { key: `r-${Date.now()}`, role: res.blocked ? "SYSTEM" : "TUTOR", text: res.text ?? res.scriptedText ?? "" }]);
      if (res.sessionPaused) setPaused(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === "SESSION_PAUSED") setPaused(true);
      else if (err instanceof ApiError && err.status === 403) setForbidden(true);
      else setSendError("The tutor couldn't answer just now. Your message is back in the box — try sending it again.");
      setDraft(t);
      // The unsent message goes back into the box, so drop its optimistic bubble.
      setMessages((m) => (m.length && m[m.length - 1].role === "STUDENT" ? m.slice(0, -1) : m));
    } finally {
      setSending(false);
    }
  }

  async function startNew() {
    try {
      const started: any = await api.startTutor({ mode: "SOCRATIC" }, token);
      router.replace(`/tutor/${started.tutorSessionId}`);
    } catch {
      setSendError("We couldn't start a new session. Please try again.");
    }
  }

  return (
    <AppPage width="content" className="flex min-h-[calc(100vh-4rem)] flex-col">
      <div className="mb-5 flex items-center gap-3">
        <TutorAvatar size={44} />
        <div className="flex-1">
          <h1 className="text-h2">Your tutor</h1>
          <p className="text-caption text-neutral-600">Helps you think it through — it won&apos;t just give you the answer.</p>
        </div>
        {voiceOn && (
          <Link href="/voice/new" className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-[14px] font-semibold text-brand-navy hover:bg-brand-navySoft">
            <Microphone size={18} /> Talk instead
          </Link>
        )}
        <Link href="/tutor/photo" className="hidden items-center gap-1.5 rounded-md px-3 py-2 text-[14px] font-semibold text-brand-navy hover:bg-brand-navySoft sm:inline-flex">
          <Camera size={18} /> Photo of a question
        </Link>
      </div>

      {forbidden ? (
        <ForbiddenState body="The tutor chat has been turned off by your parent." />
      ) : loadError ? (
        <ErrorState body={loadError} />
      ) : !sessionId ? (
        <LoadingState label="Opening your tutor…" />
      ) : (
        <Card className="flex flex-1 flex-col">
          <section aria-label="Conversation" className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.length === 0 && !sending && (
              <div className="py-6 text-center">
                <p className="font-semibold text-neutral-900">What are you revising today?</p>
                <p className="mt-1 text-[14px] text-neutral-600">Ask about anything in your course. Try one of these:</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {STARTERS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="rounded-full border border-neutral-200 px-3.5 py-1.5 text-[14px] text-neutral-700 hover:border-brand-navy hover:text-brand-navy">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <ol className="space-y-4" aria-live="polite">
              {messages.map((m) => (
                <li key={m.key} className={cx("flex gap-2.5", m.role === "STUDENT" && "justify-end")}>
                  {m.role === "TUTOR" && <TutorAvatar size={30} />}
                  {m.role === "SYSTEM" && (
                    <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-brand-navySoft text-brand-navy"><ShieldCheck size={18} weight="fill" /></span>
                  )}
                  <div
                    className={cx(
                      "max-w-[85%] rounded-lg px-4 py-2.5 text-[15px] leading-relaxed",
                      m.role === "STUDENT" && "rounded-br-sm bg-brand-navy text-white",
                      m.role === "TUTOR" && "rounded-bl-sm bg-neutral-100 text-neutral-900",
                      m.role === "SYSTEM" && "border border-brand-navy/20 bg-brand-navySoft text-neutral-900",
                    )}
                  >
                    <span className="sr-only">{m.role === "STUDENT" ? "You" : m.role === "SYSTEM" ? "Notice" : "Tutor"}: </span>
                    {m.role === "TUTOR" ? <RichText text={m.text} /> : <span className="whitespace-pre-wrap">{m.text}</span>}
                  </div>
                </li>
              ))}
              {sending && (
                <li className="flex gap-2.5" aria-label="Tutor is thinking">
                  <TutorAvatar size={30} thinking />
                  <div className="rounded-lg rounded-bl-sm bg-neutral-100 px-4 py-3">
                    <span className="flex gap-1">
                      {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: `${i * 150}ms` }} />)}
                    </span>
                  </div>
                </li>
              )}
            </ol>
            <div ref={endRef} />
          </section>

          <div className="border-t border-neutral-200 p-4">
            {sendError && <p className="mb-3 text-[14px] text-answer-incorrect" role="alert">{sendError}</p>}
            {paused ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[14px] text-neutral-700">This session is paused. You can start a fresh one whenever you’re ready.</p>
                <Button onClick={startNew}>Start a new session</Button>
              </div>
            ) : (
              <form
                className="flex items-end gap-2"
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  void send(draft);
                }}
              >
                <label htmlFor="tutor-message" className="sr-only">Message</label>
                <textarea
                  id="tutor-message"
                  className="sl-field max-h-40 min-h-[48px] flex-1 resize-none rounded-md border border-neutral-200 bg-white px-3.5 py-3 text-[15px] shadow-soft placeholder:text-neutral-400 focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/15"
                  value={draft}
                  maxLength={MAX_CHARS}
                  rows={1}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
                    }
                  }}
                  disabled={sending}
                  placeholder="Ask your tutor…"
                />
                <Button type="submit" size="lg" className="h-12 w-12 px-0" disabled={sending || !draft.trim()} aria-label="Send">
                  <PaperPlaneRight size={20} weight="fill" />
                </Button>
              </form>
            )}
            <p className="mt-2 text-caption text-neutral-400">Don’t share your name, school or contact details. Messages are checked for safety.</p>
          </div>
        </Card>
      )}
    </AppPage>
  );
}

function TutorAvatar({ size, thinking = false }: { size: number; thinking?: boolean }) {
  return (
    <span
      aria-hidden
      className={cx("flex shrink-0 items-center justify-center rounded-full bg-brand-teal text-white", thinking && "animate-pulse")}
      style={{ width: size, height: size }}
    >
      <Sparkle size={size * 0.55} weight="fill" />
    </span>
  );
}
