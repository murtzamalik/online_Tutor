"use client";

import { useState } from "react";
import type { Icon } from "@phosphor-icons/react";
import { Bell, ChartLineUp, Checks, CreditCard, ShieldCheck, Warning } from "@phosphor-icons/react";
import * as api from "@/lib/api/w3";
import { AppPage } from "@/components/ui/AppPage";
import { Button } from "@/components/ui/Button";
import { Badge, Callout, Card, PageHeader } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/states";
import { cx } from "@/components/ui/cx";
import { LoadView, useLoad } from "@/components/parent/useLoad";
import { asArray, asRecord, errorMessage, formatRelative, humanise, str } from "@/components/parent/format";

type Notification = {
  notificationId?: string;
  id?: string;
  title?: string;
  body?: string;
  message?: string;
  readAt?: string | null;
  createdAt?: string | null;
  kind?: string;
};

const KIND_ICON: Record<string, Icon> = {
  WEEKLY_REPORT: ChartLineUp,
  ALERT: Warning,
  BILLING: CreditCard,
  SAFEGUARDING: ShieldCheck,
};

/** Shell-05 — Notifications centre */
export default function Page() {
  const token = typeof window !== "undefined" ? sessionStorage.getItem("accessToken") ?? undefined : undefined;
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { state, retry, reload } = useLoad<Notification[]>(
    async () => {
      const result: unknown = await api.notifications(token);
      const raw = Array.isArray(result) ? result : asArray(asRecord(result).items);
      return raw.map((n) => asRecord(n) as Notification);
    },
    [token],
    "Could not load notifications",
  );

  async function act(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setActionError(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setActionError(errorMessage(e, "Could not update notifications. Try again."));
    } finally {
      setBusy(null);
    }
  }

  const items = state.status === "ready" ? state.data : [];
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <AppPage width="content">
      <PageHeader
        title="Notifications"
        description="Updates about practice, reports, billing and family activity."
        actions={
          unread > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              icon={<Checks size={16} aria-hidden />}
              loading={busy === "all"}
              onClick={() => act("all", () => api.markAllNotificationsRead(token))}
            >
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {state.status === "ready" && items.length > 0 && (
        <div role="tablist" aria-label="Filter notifications" className="mb-4 inline-flex rounded-md border border-neutral-200 bg-white p-0.5">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={cx(
                "rounded px-3 py-1.5 text-[14px] font-medium transition-colors duration-fast",
                filter === f ? "bg-brand-navySoft text-brand-navy" : "text-neutral-600 hover:text-neutral-900",
              )}
            >
              {f === "all" ? "All" : `Unread${unread ? ` (${unread})` : ""}`}
            </button>
          ))}
        </div>
      )}

      <div aria-live="polite" className="space-y-4">
        {actionError && <Callout tone="danger">{actionError}</Callout>}
        <LoadView state={state} onRetry={retry} forbiddenBody="Sign in again to see your notifications.">
          {(list) => {
            const shown = filter === "unread" ? list.filter((n) => !n.readAt) : list;
            if (list.length === 0)
              return (
                <EmptyState
                  title="You are all caught up"
                  body="No notifications yet. Practice reminders and parent updates will appear here."
                />
              );
            if (shown.length === 0) return <EmptyState title="No unread notifications" body="You've read everything." />;
            return (
              <Card className="divide-y divide-neutral-100 overflow-hidden">
                {shown.map((n, i) => {
                  const id = String(n.notificationId ?? n.id ?? i);
                  const isUnread = !n.readAt;
                  const KindIcon = KIND_ICON[str(n.kind) ?? ""] ?? Bell;
                  return (
                    <div key={id} className={cx("flex items-start gap-3 px-5 py-4", isUnread && "bg-brand-navySoft/30")}>
                      <span
                        className={cx(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                          isUnread ? "bg-brand-navySoft text-brand-navy" : "bg-neutral-100 text-neutral-600",
                        )}
                      >
                        <KindIcon size={18} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={cx("text-[15px] text-neutral-900", isUnread ? "font-semibold" : "font-medium")}>
                            {n.title ?? humanise(n.kind, "Update")}
                          </p>
                          {isUnread && <Badge tone="brand">New</Badge>}
                        </div>
                        {(n.body ?? n.message) && <p className="mt-0.5 text-[14px] text-neutral-700">{n.body ?? n.message}</p>}
                        {n.createdAt && <p className="mt-1 text-caption text-neutral-600">{formatRelative(n.createdAt)}</p>}
                      </div>
                      {isUnread && (
                        <Button
                          variant="tertiary"
                          size="sm"
                          className="shrink-0"
                          loading={busy === id}
                          onClick={() => act(id, () => api.markNotificationRead(id, token))}
                        >
                          Mark read
                        </Button>
                      )}
                    </div>
                  );
                })}
              </Card>
            );
          }}
        </LoadView>
      </div>
    </AppPage>
  );
}
