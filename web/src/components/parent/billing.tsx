import { Badge, Table, Td, Th, type Tone } from "@/components/ui/primitives";
import { formatDate, formatPence, humanise, str } from "./format";

export const SUB_STATUS_TONE: Record<string, Tone> = {
  TRIALING: "info",
  ACTIVE: "success",
  PAST_DUE: "warning",
  UNPAID: "danger",
  CANCELED: "neutral",
  CANCELLED: "neutral",
  INCOMPLETE: "warning",
};

export const INVOICE_TONE: Record<string, Tone> = { PAID: "success", OPEN: "warning", VOID: "neutral", UNCOLLECTIBLE: "danger", DRAFT: "neutral" };

export function InvoiceTable({ items }: { items: Record<string, unknown>[] }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Invoice</Th>
          <Th className="hidden sm:table-cell">Issued</Th>
          <Th className="hidden md:table-cell">Period</Th>
          <Th>Status</Th>
          <Th className="text-right">Total</Th>
        </tr>
      </thead>
      <tbody>
        {items.map((inv, i) => {
          const status = str(inv.status) ?? "";
          const currency = str(inv.currency)?.toUpperCase() ?? "GBP";
          return (
            <tr key={str(inv.invoiceId) ?? i}>
              <Td className="font-medium">{str(inv.number) ?? str(inv.invoiceId)?.slice(0, 8) ?? "—"}</Td>
              <Td className="tabular hidden text-neutral-700 sm:table-cell">{formatDate(inv.issuedAt)}</Td>
              <Td className="tabular hidden text-neutral-700 md:table-cell">
                {inv.periodStart ? `${formatDate(inv.periodStart)} – ${formatDate(inv.periodEnd)}` : "—"}
              </Td>
              <Td>
                <Badge tone={INVOICE_TONE[status] ?? "neutral"}>{humanise(status)}</Badge>
              </Td>
              <Td className="tabular text-right font-semibold">{formatPence(inv.totalPence ?? 0, currency)}</Td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
