import React from "react";
import { WarningCircle, WifiSlash, LockKey, Tray } from "@phosphor-icons/react/dist/ssr";

/** Shell-07 — shared empty / loading / error / offline / forbidden patterns (Design System §8: skeletons, not spinners). */

export function LoadingState({ label = "Loading…", lines = 3 }: { label?: string; lines?: number }) {
  return (
    <div role="status" aria-live="polite" className="rounded-lg border border-neutral-200 bg-white p-5">
      <span className="sr-only">{label}</span>
      <div className="skeleton h-4 w-1/3 rounded" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="skeleton h-3 rounded" style={{ width: `${92 - i * 14}%` }} />
        ))}
      </div>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton rounded ${className}`} />;
}

function StateShell({
  icon,
  title,
  body,
  action,
  tone,
  role,
}: {
  icon: React.ReactNode;
  title: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
  tone: "neutral" | "danger";
  role?: "alert" | "status";
}) {
  return (
    <div
      role={role}
      className={`animate-rise rounded-lg border bg-white px-6 py-10 text-center ${
        tone === "danger" ? "border-answer-incorrect/25" : "border-dashed border-neutral-200"
      }`}
    >
      <div
        className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full ${
          tone === "danger" ? "bg-[#FBE9E7] text-answer-incorrect" : "bg-neutral-100 text-neutral-600"
        }`}
      >
        {icon}
      </div>
      <h2 className="mt-3 text-[17px] font-semibold text-neutral-900">{title}</h2>
      {body && <p className="mx-auto mt-1 max-w-md text-[14px] text-neutral-600">{body}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return <StateShell icon={<Tray size={22} />} title={title} body={body} action={action} tone="neutral" />;
}

export function ErrorState({
  title = "Something went wrong",
  body,
  action,
}: {
  title?: string;
  body: string;
  action?: React.ReactNode;
}) {
  return <StateShell icon={<WarningCircle size={22} />} title={title} body={body} action={action} tone="danger" role="alert" />;
}

export function OfflineState() {
  return (
    <StateShell
      icon={<WifiSlash size={22} />}
      title="You are offline"
      body="Your answers are saved on this device. Reconnect to sync."
      tone="neutral"
      role="status"
    />
  );
}

export function ForbiddenState({ body = "If you think this is wrong, ask a parent or teacher." }: { body?: string }) {
  return <StateShell icon={<LockKey size={22} />} title="You do not have access" body={body} tone="neutral" role="alert" />;
}
