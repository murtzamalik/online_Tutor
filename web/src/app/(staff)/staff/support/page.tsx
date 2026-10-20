"use client";

import { useState, type FormEvent } from "react";
import { CalendarPlus, EnvelopeSimple, MagnifyingGlass, NotePencil } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button } from "@/components/ui/Button";
import {
  Badge,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  KeyValue,
  PageHeader,
  Select,
  Table,
  Td,
  Textarea,
  Th,
} from "@/components/ui/primitives";
import { EmptyState, ForbiddenState, LoadingState } from "@/components/ui/states";
import {
  DetailPlaceholder,
  QueueLayout,
  ResultNote,
  SelectableRow,
  StatusBadge,
  actionError,
  toProblem,
  useApi,
  type Note,
} from "@/components/staff/ops";
import { humanise, shortId, str, type Row } from "@/components/staff/format";
import { supportSearch } from "@/lib/api/w2";
import { supportAccountDetail, supportAddNote, supportExtendTrial, supportPasswordReset } from "@/lib/api/staff-ops";

const FORBIDDEN = "The support console is for the support team. Ask a support lead for access.";

/** SUP-01 — Support console: account search and account tools. Learning content is never shown. */
export default function SupportConsolePage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Row[] | null>(null);
  const [searched, setSearched] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function search(e?: FormEvent) {
    e?.preventDefault();
    setSearching(true);
    setError(null);
    try {
      const r = await supportSearch(q);
      setItems(r.items as Row[]);
      setSearched(q);
      setSelectedId(null);
    } catch (err) {
      const p = toProblem(err, "Support search failed");
      if (p.forbidden) setForbidden(true);
      else setError(p.message || "Support search failed");
    } finally {
      setSearching(false);
    }
  }

  return (
    <AppPage>
      <PageHeader
        eyebrow="Support"
        title="Support console"
        description="Find an account by email or name. Answers, transcripts and other learning content stay hidden from support."
      />
      {forbidden ? (
        <ForbiddenState body={FORBIDDEN} />
      ) : (
        <>
          <Card className="mb-6">
            <CardBody>
              <form onSubmit={search} className="flex flex-wrap items-end gap-3" role="search">
                <Field label="Email or name" htmlFor="sup-q" className="min-w-0 flex-1">
                  <Input
                    id="sup-q"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="e.g. parent@example.com"
                    autoComplete="off"
                  />
                </Field>
                <Button type="submit" loading={searching} icon={<MagnifyingGlass size={18} />}>
                  Search
                </Button>
              </form>
            </CardBody>
          </Card>

          {error && (
            <Callout tone="danger" title="Search failed" className="mb-4">
              {error}
            </Callout>
          )}

          {items === null ? (
            searching ? (
              <LoadingState label="Searching…" />
            ) : (
              <EmptyState title="Search for an account" body="Results show up to 50 matching accounts." />
            )
          ) : (
            <QueueLayout
              list={
                items.length === 0 ? (
                  <EmptyState
                    title="No accounts found"
                    body={searched ? `Nothing matches “${searched}”. Check the spelling or try part of the email.` : "No accounts to show."}
                  />
                ) : (
                  <>
                    <p className="mb-2 text-caption text-neutral-600 tabular" aria-live="polite">
                      {items.length} {items.length === 1 ? "account" : "accounts"}
                      {items.length >= 50 ? " (first 50 — refine your search)" : ""}
                    </p>
                    <Table>
                      <thead>
                        <tr>
                          <Th>Name</Th>
                          <Th>Email</Th>
                          <Th>Type</Th>
                          <Th>Status</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((a) => {
                          const id = str(a.accountId);
                          return (
                            <SelectableRow key={id} selected={id === selectedId} onSelect={() => setSelectedId(id)} label={`Account ${str(a.displayName)}`}>
                              <Td className="font-semibold">{str(a.displayName)}</Td>
                              <Td className="break-all text-neutral-700">{str(a.email)}</Td>
                              <Td>
                                <Badge tone="brand">{humanise(a.kind)}</Badge>
                              </Td>
                              <Td>
                                <StatusBadge status={a.status} />
                              </Td>
                            </SelectableRow>
                          );
                        })}
                      </tbody>
                    </Table>
                  </>
                )
              }
              detail={
                selectedId ? (
                  <AccountPanel key={selectedId} accountId={selectedId} />
                ) : (
                  <DetailPlaceholder body="Select an account to see its details and support actions." />
                )
              }
            />
          )}
        </>
      )}
    </AppPage>
  );
}

function AccountPanel({ accountId }: { accountId: string }) {
  const detail = useApi(() => supportAccountDetail(accountId), { key: accountId });
  const [confirmReset, setConfirmReset] = useState(false);
  const [days, setDays] = useState("3");
  const [noteBody, setNoteBody] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "reset" | "trial" | "note">(null);
  const [local, setLocal] = useState<Note>(null);

  async function run(kind: "reset" | "trial" | "note", fn: () => Promise<string>) {
    setBusy(kind);
    setLocal(null);
    try {
      setLocal({ tone: "success", text: await fn() });
    } catch (err) {
      setLocal({ tone: "danger", text: actionError(err, "That action failed. Try again.") });
    } finally {
      setBusy(null);
    }
  }

  if (detail.problem?.forbidden) return <ForbiddenState body={FORBIDDEN} />;
  if (detail.problem && !detail.data) return <ResultNote note={{ tone: "danger", text: detail.problem.message }} />;
  if (!detail.data) return <LoadingState lines={5} />;

  const a = detail.data.account;
  const children = detail.data.children;
  const isParent = str(a.kind, "").toUpperCase() === "PARENT";

  return (
    <Card>
      <CardHeader title={str(a.displayName)} description={str(a.email, "No email")} action={<StatusBadge status={a.status} />} />
      <CardBody className="space-y-4">
        <KeyValue
          items={[
            ["Account type", humanise(a.kind)],
            ["Account ID", <span key="i" className="font-mono text-[12px]">{shortId(a.accountId)}</span>],
            ["Learning content", <Badge key="l">Redacted</Badge>],
          ]}
        />
        {isParent && (
          <div>
            <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-neutral-600">Linked children</p>
            {children.length === 0 ? (
              <p className="text-[14px] text-neutral-600">No children linked.</p>
            ) : (
              <ul className="divide-y divide-neutral-100 rounded-md border border-neutral-200">
                {children.map((c) => (
                  <li key={str(c.studentId)} className="flex items-center justify-between px-3 py-2 text-[14px]">
                    <span className="font-medium">{str(c.displayName)}</span>
                    <span className="font-mono text-[12px] text-neutral-600">{shortId(c.studentId)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <ResultNote note={local} />

        <div className="space-y-3 border-t border-neutral-100 pt-4">
          {!confirmReset ? (
            <Button variant="secondary" className="w-full" icon={<EnvelopeSimple size={18} />} onClick={() => setConfirmReset(true)}>
              Send password reset
            </Button>
          ) : (
            <Callout tone="warning" title="Send a password reset email?">
              <p>The account holder gets a reset link at {str(a.email, "their email")}.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  loading={busy === "reset"}
                  onClick={() =>
                    void run("reset", async () => {
                      await supportPasswordReset(accountId);
                      setConfirmReset(false);
                      return "Password reset email sent.";
                    })
                  }
                >
                  Yes, send
                </Button>
                <Button size="sm" variant="tertiary" onClick={() => setConfirmReset(false)} disabled={busy === "reset"}>
                  Cancel
                </Button>
              </div>
            </Callout>
          )}

          {isParent && (
            <div className="flex items-end gap-2">
              <Field label="Extend trial" htmlFor="trial-days" className="flex-1">
                <Select id="trial-days" value={days} onChange={(e) => setDays(e.target.value)}>
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <option key={n} value={String(n)}>
                      {n} {n === 1 ? "day" : "days"}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button
                variant="secondary"
                icon={<CalendarPlus size={18} />}
                loading={busy === "trial"}
                onClick={() =>
                  void run("trial", async () => {
                    const r = await supportExtendTrial(accountId, Number(days));
                    return `Trial extended by ${str(r.extendedDays, days)} days.`;
                  })
                }
              >
                Extend
              </Button>
            </div>
          )}

          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!noteBody.trim()) {
                setNoteError("Write the note before saving.");
                return;
              }
              setNoteError(null);
              void run("note", async () => {
                await supportAddNote(accountId, noteBody.trim());
                setNoteBody("");
                return "Note added to the account.";
              });
            }}
            className="space-y-2"
          >
            <Field label="Internal note" htmlFor="sup-note" hint="Visible to support staff only." error={noteError}>
              <Textarea id="sup-note" value={noteBody} onChange={(e) => setNoteBody(e.target.value)} className="min-h-[88px]" />
            </Field>
            <Button type="submit" variant="tertiary" loading={busy === "note"} icon={<NotePencil size={18} />}>
              Add note
            </Button>
          </form>
        </div>
      </CardBody>
    </Card>
  );
}
