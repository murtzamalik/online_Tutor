"use client";

import { useMemo, useState } from "react";
import { CheckCircle, UploadSimple, UsersThree } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button } from "@/components/ui/Button";
import { Badge, Callout, Card, CardBody, CardHeader, Field, KeyValue, PageHeader, StatTile, Textarea } from "@/components/ui/primitives";
import { ForbiddenState } from "@/components/ui/states";
import { ResultNote, StatRow, actionError, toProblem, type Note } from "@/components/staff/ops";
import { int, str, type Row } from "@/components/staff/format";
import { useSchoolId, SCHOOL_ADMIN_FORBIDDEN } from "@/components/school/school";
import { rosterImport } from "@/lib/api/w2";
import { commitRosterImport } from "@/lib/api/school-ops";


/** ONB-01/03 — Rostering by CSV (school admin). Wonde MIS and SSO stay off for the pilot. */
export default function SchoolOnboardingPage() {
  const SCHOOL = useSchoolId();
  const [csv, setCsv] = useState("");
  const [uploading, setUploading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ importId: string; valid: number; errors: number } | null>(null);
  const [committed, setCommitted] = useState<number | null>(null);
  const [note, setNote] = useState<Note>(null);

  // One pupil display name per line; blank lines skipped, Windows line endings trimmed.
  const names = useMemo(
    () =>
      csv
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    [csv],
  );

  async function upload() {
    setError(null);
    setNote(null);
    if (names.length === 0) {
      setError("Add at least one pupil name, one per line.");
      return;
    }
    setUploading(true);
    try {
      const r = (await rosterImport(SCHOOL, names.map((displayName) => ({ displayName })))) as Row | null;
      setResult({ importId: str(r?.importId, ""), valid: Number(r?.valid ?? 0), errors: Number(r?.errors ?? 0) });
      setCommitted(null);
    } catch (err) {
      const p = toProblem(err, "Upload failed. Check the file and try again.");
      if (p.forbidden) setForbidden(true);
      else setError(p.message || "Failed");
    } finally {
      setUploading(false);
    }
  }

  async function commit() {
    if (!result) return;
    setCommitting(true);
    setNote(null);
    try {
      const r = await commitRosterImport(SCHOOL, result.importId);
      setCommitted(r.committed);
      setNote({ tone: "success", text: `${r.committed} pupil ${r.committed === 1 ? "account" : "accounts"} created.` });
    } catch (err) {
      setNote({ tone: "danger", text: actionError(err, "Could not create pupils from this import. Try again.") });
    } finally {
      setCommitting(false);
    }
  }

  if (forbidden) {
    return (
      <AppPage width="content">
        <PageHeader eyebrow="Onboarding" title="Rostering and SSO" />
        <ForbiddenState body={SCHOOL_ADMIN_FORBIDDEN} />
      </AppPage>
    );
  }

  return (
    <AppPage>
      <PageHeader
        eyebrow="Onboarding"
        title="Rostering and SSO"
        description="Create pupil accounts from a CSV roster. Each line is one pupil's display name."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="1. Upload roster" description="Paste names or the first column of your CSV export." />
            <CardBody className="space-y-4">
              <Field
                label="Pupil names"
                htmlFor="roster-csv"
                hint={`${names.length} ${names.length === 1 ? "row" : "rows"} detected`}
                error={error}
              >
                <Textarea
                  id="roster-csv"
                  value={csv}
                  onChange={(e) => setCsv(e.target.value)}
                  className="min-h-[200px] font-mono text-[14px]"
                  spellCheck={false}
                  placeholder={"One pupil per line, e.g.\nPriya Shah\nTom Evans"}
                />
              </Field>
              <Button onClick={() => void upload()} loading={uploading} icon={<UploadSimple size={18} />}>
                Upload CSV
              </Button>
            </CardBody>
          </Card>

          {result && (
            <Card aria-live="polite">
              <CardHeader
                title="2. Check and create pupils"
                description="Only valid rows become pupil accounts."
                action={committed !== null ? <Badge tone="success">Committed</Badge> : <Badge tone="info">Validated</Badge>}
              />
              <CardBody className="space-y-4">
                <StatRow cols={3}>
                  <StatTile label="Rows" value={int(result.valid + result.errors)} />
                  <StatTile label="Valid" value={int(result.valid)} icon={<CheckCircle size={20} />} />
                  <StatTile label="Errors" value={int(result.errors)} hint={result.errors ? "Blank display names" : undefined} />
                </StatRow>
                <KeyValue items={[["Import ID", <span key="i" className="tabular">{result.importId}</span>]]} />
                <ResultNote note={note} />
                {committed === null && (
                  <Button
                    onClick={() => void commit()}
                    loading={committing}
                    disabled={result.valid === 0}
                    icon={<UsersThree size={18} />}
                  >
                    Create {result.valid} {result.valid === 1 ? "pupil" : "pupils"}
                  </Button>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Connections" />
            <CardBody>
              <KeyValue
                items={[
                  ["CSV roster", <Badge key="c" tone="success">Available</Badge>],
                  ["Wonde MIS sync", <Badge key="w">Off for pilot</Badge>],
                  ["Single sign-on", <Badge key="s">Off for pilot</Badge>],
                ]}
              />
            </CardBody>
          </Card>
          <Callout tone="info" title="MIS and SSO">
            Wonde MIS sync and Google/Microsoft sign-in are not switched on for the pilot. Use the CSV roster for now.
          </Callout>
        </div>
      </div>
    </AppPage>
  );
}
