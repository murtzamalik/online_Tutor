"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CaretLeft, DownloadSimple, Trash, WarningCircle } from "@phosphor-icons/react";
import * as api from "@/lib/api/w3";
import { AppPage } from "@/components/ui/AppPage";
import { Button } from "@/components/ui/Button";
import { Badge, Callout, Card, CardBody, CardHeader, Checkbox, KeyValue, PageHeader, type Tone } from "@/components/ui/primitives";
import { useChildName } from "@/components/parent/ChildHeader";
import { LoadView, useLoad } from "@/components/parent/useLoad";
import { asRecord, errorMessage, formatDate, formatDateTime, humanise, num, str } from "@/components/parent/format";

const STATUS_TONE: Record<string, Tone> = {
  NONE: "neutral",
  REQUESTED: "warning",
  COOLING_OFF: "warning",
  PROCESSING: "warning",
  COMPLETED: "danger",
  CANCELLED: "neutral",
};

/** L-02 — Data deletion request */
export default function Page() {
  const params = useParams() as Record<string, string>;
  const name = useChildName(params.id) ?? "your child";
  const token = typeof window !== "undefined" ? sessionStorage.getItem("accessToken") ?? undefined : undefined;

  const { state, retry, setData, reload } = useLoad(
    async () => asRecord(await api.getDeletion(params.id, token)),
    [params.id, token],
    "Could not load the deletion status",
  );

  const [confirming, setConfirming] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState<"request" | "cancel" | "export" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<Record<string, unknown> | null>(null);

  async function requestDeletion() {
    setBusy("request");
    setActionError(null);
    setNotice(null);
    try {
      const r = asRecord(await api.requestDeletion(params.id, { scope: "FULL" }, token));
      setData(r);
      void reload();
      setNotice(str(r.message) ?? "Deletion scheduled.");
      setConfirming(false);
      setUnderstood(false);
    } catch (e) {
      setActionError(errorMessage(e, "Could not schedule deletion. Try again."));
    } finally {
      setBusy(null);
    }
  }

  async function cancelDeletion() {
    setBusy("cancel");
    setActionError(null);
    setNotice(null);
    try {
      const r = asRecord(await api.cancelDeletion(params.id, token));
      setNotice(str(r.message) ?? "Deletion cancelled.");
      await reload();
    } catch (e) {
      setActionError(errorMessage(e, "Could not cancel the deletion. Try again."));
    } finally {
      setBusy(null);
    }
  }

  async function requestExport() {
    setBusy("export");
    setActionError(null);
    try {
      setExportResult(asRecord(await api.requestExport(params.id, token)));
    } catch (e) {
      setActionError(errorMessage(e, "Could not start the export. Try again."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppPage width="content">
      <Link
        href={`/parent/children/${params.id}/privacy`}
        className="mb-3 inline-flex items-center gap-1 text-caption font-semibold text-neutral-600 hover:text-neutral-900"
      >
        <CaretLeft size={14} aria-hidden /> Back to privacy
      </Link>
      <PageHeader
        eyebrow={name.charAt(0).toUpperCase() + name.slice(1)}
        title="Export or delete data"
        description="Deletion has a cooling-off period. You can cancel any time before it ends, with no penalty."
      />

      <div className="space-y-6" aria-live="polite">
        {notice && <Callout tone="success">{notice}</Callout>}
        {actionError && <Callout tone="danger">{actionError}</Callout>}

        <Card>
          <CardHeader
            title="Export a copy"
            description="A file of everything we hold about your child. The link stays valid for 7 days."
            action={
              <Button
                variant="secondary"
                size="sm"
                loading={busy === "export"}
                icon={<DownloadSimple size={16} aria-hidden />}
                onClick={requestExport}
              >
                Request export
              </Button>
            }
          />
          {exportResult && (
            <CardBody>
              <KeyValue
                items={[
                  ["Status", <Badge key="s" tone={exportResult.status === "READY" ? "success" : "warning"}>{humanise(exportResult.status)}</Badge>],
                  ["Available until", formatDateTime(exportResult.expiresAt)],
                  ["Reference", <span key="r" className="tabular text-caption">{str(exportResult.exportId)?.slice(0, 8) ?? "—"}</span>],
                ]}
              />
            </CardBody>
          )}
        </Card>

        <LoadView state={state} onRetry={retry}>
          {(d) => {
            const status = str(d.status) ?? "NONE";
            const open = ["REQUESTED", "COOLING_OFF", "PROCESSING"].includes(status);
            const canCancel = d.canCancel === true;
            const coolOff = num(d.coolOffDays) ?? 14;
            return (
              <Card className="border-answer-incorrect/25">
                <CardHeader
                  title="Delete your child's data"
                  description="Removes the learner profile, answers, progress and tutor transcripts."
                  action={<Badge tone={STATUS_TONE[status] ?? "neutral"}>{status === "NONE" ? "No request" : humanise(status)}</Badge>}
                />
                <CardBody className="space-y-4">
                  {status !== "NONE" && (
                    <KeyValue
                      items={[
                        ["Scope", d.scope === "LEARNING_DATA_ONLY" ? "Learning data only" : humanise(d.scope, "Full")],
                        ["Requested", formatDateTime(d.requestedAt)],
                        ["Scheduled for", formatDate(d.scheduledFor)],
                        ...(d.completedAt ? ([["Completed", formatDateTime(d.completedAt)]] as Array<[string, string]>) : []),
                      ]}
                    />
                  )}

                  {open ? (
                    <div className="flex flex-wrap items-center gap-3">
                      {canCancel ? (
                        <Button variant="secondary" loading={busy === "cancel"} onClick={cancelDeletion}>
                          Cancel deletion
                        </Button>
                      ) : (
                        <p className="text-[14px] text-neutral-600">The cooling-off period has ended, so this can no longer be cancelled.</p>
                      )}
                    </div>
                  ) : status === "COMPLETED" ? (
                    <p className="text-[14px] text-neutral-600">This data has been deleted.</p>
                  ) : !confirming ? (
                    <Button variant="destructive" icon={<Trash size={18} aria-hidden />} onClick={() => setConfirming(true)}>
                      Request deletion
                    </Button>
                  ) : (
                    <div className="space-y-4 rounded-md border border-answer-incorrect/30 bg-[#FBE9E7]/50 p-4" role="group" aria-labelledby="confirm-heading">
                      <p id="confirm-heading" className="flex items-center gap-2 font-semibold text-neutral-900">
                        <WarningCircle size={18} className="text-answer-incorrect" aria-hidden /> Confirm deletion
                      </p>
                      <ul className="list-disc space-y-1 pl-5 text-[14px] text-neutral-700">
                        <li>Everything is deleted after a {coolOff}-day cooling-off period.</li>
                        <li>You can cancel on this page at any time before then.</li>
                        <li>After deletion, progress and reports cannot be recovered.</li>
                      </ul>
                      <Checkbox
                        label="I understand and want to delete this child's data."
                        checked={understood}
                        onChange={(e) => setUnderstood(e.target.checked)}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button variant="destructive" disabled={!understood} loading={busy === "request"} onClick={requestDeletion}>
                          Schedule deletion
                        </Button>
                        <Button
                          variant="tertiary"
                          onClick={() => {
                            setConfirming(false);
                            setUnderstood(false);
                          }}
                        >
                          Keep data
                        </Button>
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          }}
        </LoadView>
      </div>
    </AppPage>
  );
}
