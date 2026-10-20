/**
 * Shapes returned by GET /catalog/pricing (CatalogService.pricing: one row per plan × billing cycle)
 * and GET /catalog/plans/compare (plans + `matrixJson` from app_config `pricing.compare_matrix`).
 */

export type PriceRow = {
  planId: number | string;
  code?: string;
  displayName?: string;
  tab?: string;
  billingCycle?: string;
  pricePence?: number;
  currency?: string;
};

export type GroupedPlan = {
  planId: number | string;
  code: string;
  name: string;
  tab?: string;
  prices: Record<string, PriceRow>;
};

export type ComparePlan = {
  planId?: number | string;
  code?: string;
  displayName?: string;
  tab?: string;
  featuresJson?: string | null;
  includesMockTests?: boolean;
  maxSubjects?: number | null;
};

export type MatrixFeature = { key?: string; label?: string; plans?: Record<string, string> };
export type Matrix = { features?: MatrixFeature[]; disclaimer?: string };

export function groupPlans(items: PriceRow[] | null | undefined): GroupedPlan[] {
  if (!items) return [];
  const byCode = new Map<string, GroupedPlan>();
  for (const row of items) {
    const key = String(row.code ?? row.planId);
    const existing = byCode.get(key) ?? {
      planId: row.planId,
      code: key,
      name: row.displayName ?? key,
      tab: row.tab,
      prices: {},
    };
    if (row.billingCycle) existing.prices[row.billingCycle.toUpperCase()] = row;
    byCode.set(key, existing);
  }
  return Array.from(byCode.values());
}

export function parseMatrix(raw: unknown): Matrix {
  if (!raw) return { features: [] };
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Matrix;
    } catch {
      return { features: [] };
    }
  }
  if (typeof raw === "object") return raw as Matrix;
  return { features: [] };
}

const TAB_LABELS: Record<string, string> = {
  GCSE_IGCSE: "GCSE & iGCSE",
  AGES_7_11: "Ages 7–11",
  A_LEVEL: "A Level",
};

export function tabLabel(tab: string | null | undefined): string {
  if (!tab) return "Plan";
  return TAB_LABELS[tab.toUpperCase()] ?? tab.replace(/_/g, " ");
}

/** "No" / "—" style values mean the feature is not included. */
export function isNegative(value: string | null | undefined): boolean {
  if (value == null) return true;
  const v = value.trim().toLowerCase();
  return v === "" || v === "no" || v === "—" || v === "-" || v === "false" || v === "none";
}

export function isAffirmative(value: string | null | undefined): boolean {
  if (value == null) return false;
  const v = value.trim().toLowerCase();
  return v === "yes" || v === "true" || v === "included";
}

/** Feature bullet list for a plan card, from the compare matrix (fallback: plan row flags). */
export function planFeatures(code: string, matrix: Matrix, comparePlan?: ComparePlan): { label: string; included: boolean }[] {
  const feats = (matrix.features ?? [])
    .map((f) => {
      const value = f.plans?.[code];
      const label = f.label ?? f.key ?? "";
      if (!label) return null;
      if (isNegative(value)) return { label, included: false };
      if (isAffirmative(value)) return { label, included: true };
      return { label: `${label}: ${value}`, included: true };
    })
    .filter((x): x is { label: string; included: boolean } => x !== null);
  if (feats.length > 0) return feats;
  if (!comparePlan) return [];
  const out: { label: string; included: boolean }[] = [];
  out.push({
    label: comparePlan.maxSubjects != null ? `Up to ${comparePlan.maxSubjects} subjects` : "All available subjects",
    included: true,
  });
  out.push({ label: "Timed mock tests", included: !!comparePlan.includesMockTests });
  return out;
}
