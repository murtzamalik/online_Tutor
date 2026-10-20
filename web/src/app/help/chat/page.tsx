"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChatsCircle, Headset, LockKey, PaperPlaneRight, UserCircle } from "@phosphor-icons/react";
import { PublicFrame } from "@/components/shell/PublicFrame";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Callout, Card, Field, Select, Textarea } from "@/components/ui/primitives";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { cx } from "@/components/ui/cx";
import { MarketingPage } from "@/components/marketing/MarketingPage";
import { formatDateTime } from "@/components/marketing/format";
import { ApiError } from "@/lib/api/client";
import * as api from "@/lib/api/w3";

/** POST /support/chat → { chatId, status, topic }; POST /support/chat/{id}/messages → { chatId, messageId, messages[] }. */
type ChatMessage = { messageId?: string; sender: "USER" | "AGENT" | "SYSTEM" | string; body: string; createdAt?: string };
type Chat = { chatId: string; status?: string; topic?: string };

const TOPICS = ["Billing", "Account", "Children & consent", "Technical problem", "Something else"];

const SYSTEM_OPENER = "Connected to the support queue. A human agent will reply — this is not an AI chatbot.";

/** P-02 — Live support chat (human staff queue, parents only). */
export default function Page() {
  const [token, setToken] = useState<string | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [topic, setTopic] = useState(TOPICS[0]);
  const [draft, setDraft] = useState("");
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ title: string; body: string } | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      setToken(sessionStorage.getItem("accessToken") ?? undefined);
    } catch {
      setToken(undefined);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  function describe(err: unknown): { title: string; body: string } {
    if (err instanceof ApiError && err.status === 403) {
      return { title: "Live chat is for parent accounts", body: "Sign in with a parent account to message support, or browse the help centre." };
    }
    if (err instanceof ApiError && err.status === 401) {
      return { title: "Please sign in again", body: "Your session has ended. Sign in, then come back to this page." };
    }
    return { title: "Message not sent", body: err instanceof Error && err.message ? `${err.message}. Please try again.` : "Please try again." };
  }

  async function onStart(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    try {
      const started = (await api.startSupportChat({ topic, message: text }, token)) as Chat;
      setChat(started);
      setMessages([
        { sender: "USER", body: text, createdAt: new Date().toISOString() },
        { sender: "SYSTEM", body: SYSTEM_OPENER },
      ]);
      setDraft("");
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!chat || !text) return;
    setBusy(true);
    setError(null);
    try {
      const res = (await api.postSupportMessage(chat.chatId, { body: text }, token)) as { messages?: ChatMessage[] };
      setMessages(res.messages && res.messages.length > 0 ? res.messages : [...messages, { sender: "USER", body: text }]);
      setDraft("");
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PublicFrame>
      <MarketingPage
        width="narrow"
        eyebrow="Support"
        title="Chat with our support team"
        description="Messages go to a human staff queue — not an AI chatbot."
        breadcrumb={
          <Link href="/help" className="inline-flex items-center gap-1.5 font-semibold text-brand-navy hover:underline">
            <ArrowLeft size={16} /> Help centre
          </Link>
        }
      >
        {!ready && <LoadingState label="Loading chat…" />}

        {ready && !token && (
          <EmptyState
            title="Sign in to message support"
            body="Live chat is available to parent accounts so we can see your subscription and children safely. You can still browse help articles without signing in."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <ButtonLink href="/login" icon={<LockKey size={18} />}>Parent login</ButtonLink>
                <ButtonLink href="/help" variant="secondary">Browse help articles</ButtonLink>
              </div>
            }
          />
        )}

        {ready && token && (
          <Card className="overflow-hidden shadow-soft">
            <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-tealSoft text-brand-teal">
                  <Headset size={20} />
                </span>
                <div>
                  <p className="font-semibold text-neutral-900">Study Loop support</p>
                  <p className="text-caption text-neutral-600">{chat ? `Topic: ${chat.topic ?? topic}` : "Start a conversation"}</p>
                </div>
              </div>
              {chat && (
                <Badge tone={chat.status === "WAITING_USER" ? "info" : "warning"}>
                  {chat.status === "WAITING_USER" ? "Agent replied" : "Waiting for an agent"}
                </Badge>
              )}
            </div>

            {chat ? (
              <>
                <div className="max-h-[440px] space-y-3 overflow-y-auto bg-neutral-050 px-5 py-5" aria-live="polite" aria-label="Conversation">
                  {messages.map((m, i) => {
                    if (m.sender === "SYSTEM") {
                      return (
                        <p key={m.messageId ?? i} className="mx-auto max-w-sm text-center text-caption text-neutral-600">
                          {m.body}
                        </p>
                      );
                    }
                    const mine = m.sender === "USER";
                    return (
                      <div key={m.messageId ?? i} className={cx("flex items-end gap-2", mine ? "justify-end" : "justify-start")}>
                        {!mine && <UserCircle size={28} className="shrink-0 text-brand-teal" aria-hidden />}
                        <div className={cx("max-w-[80%] rounded-lg px-4 py-2.5 text-[15px]", mine ? "bg-brand-navy text-white" : "border border-neutral-200 bg-white text-neutral-900")}>
                          <p className="sr-only">{mine ? "You said:" : "Support said:"}</p>
                          <p className="whitespace-pre-wrap">{m.body}</p>
                          {m.createdAt && (
                            <p className={cx("mt-1 text-[11px]", mine ? "text-white/70" : "text-neutral-400")}>{formatDateTime(m.createdAt)}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>
                <form onSubmit={onSend} className="border-t border-neutral-200 p-4">
                  <label htmlFor="chat-msg" className="sr-only">Your message</label>
                  <div className="flex items-end gap-2">
                    <Textarea
                      id="chat-msg"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          e.currentTarget.form?.requestSubmit();
                        }
                      }}
                      placeholder="Write a message…"
                      className="!min-h-[48px] flex-1 resize-none"
                      rows={2}
                    />
                    <Button type="submit" loading={busy} disabled={!draft.trim()} aria-label="Send message" icon={busy ? undefined : <PaperPlaneRight size={18} />}>
                      Send
                    </Button>
                  </div>
                  <p className="mt-2 text-caption text-neutral-600">Enter to send · Shift + Enter for a new line</p>
                </form>
              </>
            ) : (
              <form onSubmit={onStart} className="space-y-5 p-5 sm:p-6">
                <Field label="What do you need help with?" htmlFor="chat-topic">
                  <Select id="chat-topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
                    {TOPICS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Your message" htmlFor="chat-first" hint="Please don't include card numbers or passwords.">
                  <Textarea
                    id="chat-first"
                    required
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Tell us what's happening and which child it's about, if any."
                  />
                </Field>
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-caption text-neutral-600">
                    <ChatsCircle size={16} aria-hidden /> Human staff queue
                  </p>
                  <Button type="submit" loading={busy} disabled={!draft.trim()}>
                    Start live chat
                  </Button>
                </div>
              </form>
            )}
          </Card>
        )}

        {error && (
          <div className="mt-4">
            <Callout tone="danger" title={error.title}>
              {error.body}
            </Callout>
          </div>
        )}
      </MarketingPage>
    </PublicFrame>
  );
}
