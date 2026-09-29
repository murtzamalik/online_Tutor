import React from "react";

/** Shell-07 — shared empty / loading / error / offline / forbidden patterns */

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="animate-rise rounded-md border border-mist bg-white/70 p-6">
      <div className="mb-3 h-3 w-32 animate-pulse rounded bg-mist" />
      <p className="text-sm text-ink/70">{label}</p>
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="animate-rise rounded-md border border-dashed border-mist bg-white/50 p-8 text-center">
      <h2 className="font-display text-xl text-ink">{title}</h2>
      <p className="mt-2 text-ink/70">{body}</p>
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", body }: { title?: string; body: string }) {
  return (
    <div role="alert" className="animate-rise rounded-md border border-danger/30 bg-white p-6">
      <h2 className="font-display text-xl text-danger">{title}</h2>
      <p className="mt-2 text-ink/80">{body}</p>
    </div>
  );
}

export function OfflineState() {
  return (
    <ErrorState title="You are offline" body="Your answers are saved on this device. Reconnect to sync." />
  );
}

export function ForbiddenState() {
  return <ErrorState title="You do not have access" body="If you think this is wrong, ask a parent or teacher." />;
}
