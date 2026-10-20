import { asArray, asRecord, num } from "./format";

export type ReportStats = {
  answers?: number;
  correct?: number;
  activeDays?: number;
  accuracyPercent?: number;
  topicsPractised: string[];
  weakestTopics: string[];
};

/**
 * Weekly report `stats` is the stored facts JSON (a string):
 * { answers, correct, activeDays, items: [{ id, fact, value }] }.
 */
export function parseReportStats(raw: unknown): ReportStats {
  let obj: Record<string, unknown> = {};
  if (typeof raw === "string") {
    try {
      obj = asRecord(JSON.parse(raw));
    } catch {
      obj = {};
    }
  } else {
    obj = asRecord(raw);
  }
  const facts = new Map<string, unknown>();
  for (const it of asArray(obj.items)) {
    const r = asRecord(it);
    if (typeof r.fact === "string") facts.set(r.fact, r.value);
  }
  const answers = num(obj.answers) ?? num(facts.get("answers_this_week"));
  const correct = num(obj.correct);
  const accuracy =
    num(facts.get("accuracy_percent")) ?? (answers && correct != null ? Math.round((100 * correct) / answers) : undefined);
  const strings = (v: unknown) => asArray(v).filter((x): x is string => typeof x === "string" && x.length > 0);
  return {
    answers,
    correct,
    activeDays: num(obj.activeDays) ?? num(facts.get("active_days")),
    accuracyPercent: answers ? accuracy : undefined,
    topicsPractised: strings(facts.get("topics_practised")),
    weakestTopics: strings(facts.get("weakest_topics")),
  };
}

/** Week label from an ISO date: "w/c 9 Mar 2026". */
export function weekLabel(weekStart: unknown): string {
  if (typeof weekStart !== "string" || !weekStart) return "Weekly report";
  const d = new Date(`${weekStart.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "Weekly report";
  return `w/c ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
}
