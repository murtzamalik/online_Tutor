"use client";
import { FormEvent, useState } from "react";
import { ChatCircleDots, PaperPlaneRight, X } from "@phosphor-icons/react";
import * as api from "@/lib/api/w3";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";

type Msg = { sender?: string; body?: string };

/**
 * P-02 live chat widget — staff ticket/message APIs. A ticket is only opened when the first message
 * is sent (opening the panel no longer creates an empty "Hello" ticket).
 */
export function LiveChatWidget() {
  const [open, setOpen] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = typeof window !== "undefined" ? sessionStorage.getItem("accessToken") ?? undefined : undefined;

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      if (!chatId) {
        const chat: any = await api.startSupportChat({ topic: "Help", message: body }, token);
        setChatId(chat.chatId);
        setMessages(chat.messages ?? [{ sender: "YOU", body }, { sender: "SYSTEM", body: "Thanks — a member of our team will reply here." }]);
      } else {
        const res: any = await api.postSupportMessage(chatId, { body }, token);
        setMessages(res.messages ?? [...messages, { sender: "YOU", body }]);
      }
      setText("");
    } catch {
      setError("We couldn’t send that. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 lg:bottom-6 lg:right-6">
      {open ? (
        <div role="dialog" aria-label="Support chat" className="flex w-[min(22rem,calc(100vw-2rem))] flex-col rounded-lg border border-neutral-200 bg-white shadow-overlay">
          <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-4 py-3">
            <div>
              <p className="font-semibold text-neutral-900">Help from our team</p>
              <p className="text-caption text-neutral-600">Real people, usually within a few hours.</p>
            </div>
            <button className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100" onClick={() => setOpen(false)} aria-label="Close support chat">
              <X size={18} />
            </button>
          </div>
          <div className="max-h-64 min-h-[96px] space-y-2 overflow-y-auto px-4 py-3 text-[14px]" aria-live="polite">
            {messages.length === 0 ? (
              <p className="text-neutral-600">Tell us what’s wrong — for example a login problem or a question that looks incorrect.</p>
            ) : (
              messages.map((m, i) => {
                const mine = !m.sender || ["YOU", "STUDENT", "PARENT", "USER"].includes(String(m.sender).toUpperCase());
                return (
                  <p key={i} className={cx("max-w-[85%] rounded-lg px-3 py-2", mine ? "ml-auto bg-brand-navy text-white" : "bg-neutral-100 text-neutral-900")}>
                    {m.body}
                  </p>
                );
              })
            )}
          </div>
          {error && <p className="px-4 pb-2 text-caption text-answer-incorrect" role="alert">{error}</p>}
          <form className="flex gap-2 border-t border-neutral-200 p-3" onSubmit={send}>
            <label htmlFor="support-msg" className="sr-only">Message</label>
            <input id="support-msg" className="sl-field h-10 flex-1 rounded-md border border-neutral-200 px-3 text-[14px] focus:border-brand-navy focus:outline-none" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" />
            <Button type="submit" size="sm" className="h-10" loading={sending} disabled={!text.trim()} aria-label="Send message">
              <PaperPlaneRight size={16} weight="fill" />
            </Button>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[14px] font-semibold text-brand-navy shadow-raised ring-1 ring-neutral-200 hover:bg-brand-navySoft"
        >
          <ChatCircleDots size={20} weight="fill" /> Help
        </button>
      )}
    </div>
  );
}
