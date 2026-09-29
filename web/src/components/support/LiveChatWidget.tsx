"use client";
import { useState } from "react";
import * as api from "@/lib/api/w3";

/** P-02 live chat widget — staff ticket/message APIs */
export function LiveChatWidget() {
  const [open, setOpen] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const token = typeof window !== "undefined" ? sessionStorage.getItem("accessToken") ?? undefined : undefined;

  async function start() {
    const chat = await api.startSupportChat({ topic: "Help", message: text || "Hello" }, token);
    setChatId(chat.chatId);
    setMessages(chat.messages ?? [{ sender: "SYSTEM", body: "Connected to support queue." }]);
    setOpen(true);
  }
  async function send() {
    if (!chatId || !text.trim()) return;
    const res = await api.postSupportMessage(chatId, { body: text }, token);
    setMessages(res.messages ?? []);
    setText("");
  }

  return (
    <div className="fixed bottom-4 left-4 z-40">
      {!open ? (
        <button type="button" className="rounded border bg-white px-3 py-2 shadow" onClick={start}>Chat with support</button>
      ) : (
        <div role="dialog" aria-label="Support chat" className="w-80 rounded border bg-white p-3 shadow">
          <p className="font-display">Live support</p>
          <p className="text-xs text-ink/60">Human agents — not a chatbot</p>
          <div className="mt-2 max-h-40 overflow-auto text-sm space-y-1">
            {messages.map((m, i) => <p key={i}><strong>{m.sender}:</strong> {m.body}</p>)}
          </div>
          <div className="mt-2 flex gap-2">
            <input aria-label="Message" className="flex-1 border px-2 text-sm" value={text} onChange={(e) => setText(e.target.value)} />
            <button type="button" className="rounded border px-2" onClick={send}>Send</button>
          </div>
          <button type="button" className="mt-2 text-xs underline" onClick={() => setOpen(false)}>Close</button>
        </div>
      )}
    </div>
  );
}
