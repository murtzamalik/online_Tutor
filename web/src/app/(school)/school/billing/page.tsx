"use client";

import { useState, type FormEvent } from "react";
import { FileText, Signature } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button } from "@/components/ui/Button";
import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Field,
  Input,
  KeyValue,
  PageHeader,
  Select,
  StatTile,
  Table,
  Td,
  Th,
} from "@/components/ui/primitives";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { DataState, ResultNote, SectionTitle, StatRow, StatusBadge, actionError, useApi, type Note } from "@/components/staff/ops";
import { fmtDate, gbp, humanise, int, num, str, type Row } from "@/components/staff/format";
import { useSchoolId, SCHOOL_ADMIN_FORBIDDEN } from "@/components/school/school";
import { getDpa, schoolInvoices, signDpa } from "@/lib/api/w2";


/** DPA-01/02, SCB-03 — Data processing agreement and school invoices. */
export default function SchoolBillingPage() {
  const SCHOOL = useSchoolId();
  // Loaded separately: invoices are business-manager only, so a 403 there must not hide the DPA.
  const dpa = useApi<Row>(async () => (await getDpa(SCHOOL)) as Row);
  const invoices = useApi<Row[]>(async () => (await schoolInvoices(SCHOOL)).items as Row[]);

  const [signing, setSigning] = useState(false);
  const [signerName, setSignerName] = useState("Pilot Admin");
  const [signerRole, setSignerRole] = useState("SADM");
  const [agree, setAgree] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<Note>(null);

  async function onSign(e: FormEvent) {
    e.preventDefault();
    if (!signerName.trim()) {
      setNameError("Enter the full name of the person signing.");
      return;
    }
    setNameError(null);
    setSaving(true);
    setNote(null);
    try {
      const r = (await signDpa(SCHOOL, { signerName: signerName.trim(), signerRole })) as Row | null;
      // The sign endpoint returns only { status }; merge it, then reload the full record.
      dpa.setData({ ...(dpa.data ?? {}), ...(r ?? {}) });
      await dpa.reload();
      setSigning(false);
      setAgree(false);
      setNote({ tone: "success", text: "DPA signed. A countersigned copy will be stored for your records." });
    } catch (err) {
      setNote({ tone: "danger", text: actionError(err, "Could not sign the DPA. Try again.") });
    } finally {
      setSaving(false);
    }
  }

  const invoiceRows = invoices.data ?? [];
  const totalBilled = invoiceRows.reduce((s, i) => s + (num(i.totalPence) ?? 0), 0);
  const outstanding = invoiceRows
    .filter((i) => !["PAID", "VOID"].includes(str(i.status, "").toUpperCase()))
    .reduce((s, i) => s + (num(i.totalPence) ?? 0), 0);

  return (
    <AppPage>
      <PageHeader
        eyebrow="School billing"
        title="DPA and invoices"
        description="Your data processing agreement and the invoices raised for your school."
      />

      <ResultNote note={note} onDismiss={() => setNote(null)} className="mb-4" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className="min-w-0">
          <DataState state={dpa} forbiddenBody={SCHOOL_ADMIN_FORBIDDEN} errorTitle="Could not load the DPA">
            {(d) => {
              const status = str(d.status, "NOT_SENT").toUpperCase();
              const signed = status === "SIGNED";
              return (
                <Card>
                  <CardHeader
                    title="Data processing agreement"
                    description="Required before pupil data is processed."
                    action={<StatusBadge status={status} />}
                  />
                  <CardBody className="space-y-4">
                    <KeyValue
                      items={[
                        ["Template version", str(d.templateVersion)],
                        ["Sent", fmtDate(d.sentAt)],
                        ["Signed", fmtDate(d.signedAt)],
                      ]}
                    />
                    {signed ? (
                      <Callout tone="success">Your DPA is signed. No action needed.</Callout>
                    ) : signing ? (
                      <form onSubmit={onSign} noValidate className="space-y-4 border-t border-neutral-100 pt-4">
                        <Field label="Signer name" htmlFor="signer-name" error={nameError}>
                          <Input id="signer-name" value={signerName} onChange={(e) => setSignerName(e.target.value)} autoComplete="name" />
                        </Field>
                        <Field label="Signer role" htmlFor="signer-role">
                          <Select id="signer-role" value={signerRole} onChange={(e) => setSignerRole(e.target.value)}>
                            <option value="SADM">School admin</option>
                            <option value="SBM">School business manager</option>
                          </Select>
                        </Field>
                        <Checkbox
                          label="I am authorised to sign this agreement on behalf of the school."
                          checked={agree}
                          onChange={(e) => setAgree(e.target.checked)}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button type="submit" loading={saving} disabled={!agree} icon={<Signature size={18} />}>
                            Sign DPA
                          </Button>
                          <Button type="button" variant="tertiary" onClick={() => setSigning(false)} disabled={saving}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <Button onClick={() => setSigning(true)} icon={<Signature size={18} />} className="w-full">
                        Review and sign
                      </Button>
                    )}
                  </CardBody>
                </Card>
              );
            }}
          </DataState>
        </div>

        <div className="min-w-0">
          {invoices.problem && !invoices.data ? (
            invoices.problem.forbidden ? (
              <Callout tone="warning" title="Invoices are for business managers">
                Ask your school business manager to view or download invoices.
              </Callout>
            ) : (
              <Callout tone="danger" title="Could not load invoices">
                {invoices.problem.message}
              </Callout>
            )
          ) : !invoices.data ? (
            <LoadingState label="Loading invoices…" />
          ) : (
            <>
              <StatRow cols={3}>
                <StatTile label="Invoices" value={int(invoiceRows.length)} icon={<FileText size={20} />} />
                <StatTile label="Total billed" value={gbp(totalBilled)} />
                <StatTile label="Outstanding" value={gbp(outstanding)} hint="Not yet marked paid" />
              </StatRow>
              <SectionTitle title="Invoices" />
              {invoiceRows.length === 0 ? (
                <EmptyState title="No invoices yet" body="Invoices appear here once your subscription starts." />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Number</Th>
                      <Th>Period</Th>
                      <Th className="text-right">Pupils</Th>
                      <Th className="text-right">Total</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceRows.map((i) => (
                      <tr key={str(i.invoiceId)}>
                        <Td className="font-medium tabular">{str(i.number)}</Td>
                        <Td className="whitespace-nowrap text-neutral-700">
                          {fmtDate(i.periodStart)} – {fmtDate(i.periodEnd)}
                        </Td>
                        <Td className="text-right tabular">{int(i.pupilCount)}</Td>
                        <Td className="text-right font-semibold tabular">{gbp(i.totalPence ?? 0)}</Td>
                        <Td>
                          <StatusBadge status={i.status} label={humanise(i.status)} />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </>
          )}
        </div>
      </div>
    </AppPage>
  );
}
