import { z } from "zod";
import { apiFetch } from "@/lib/api/client";

/**
 * Parent-only reads that have a backend endpoint but no lib/api helper yet
 * (RPT-02 weekly report list, STU-13 daily goal summary as the server actually returns it).
 */

const token = () =>
  typeof window !== "undefined"
    ? sessionStorage.getItem("accessToken") ?? localStorage.getItem("accessToken") ?? undefined
    : undefined;

export const WeeklyReportSummarySchema = z
  .object({ reportId: z.string(), weekStart: z.string().nullish(), createdAt: z.string().nullish() })
  .passthrough();

export type WeeklyReportSummary = z.infer<typeof WeeklyReportSummarySchema>;

export function listWeeklyReports(studentId: string) {
  return apiFetch(`/students/${studentId}/reports/weekly`, {
    method: "GET",
    token: token(),
    schema: z.object({ items: z.array(WeeklyReportSummarySchema) }),
  });
}

/** GET /students/{id}/daily-goal → { target, answered, day } */
export function getDailyGoalSummary(studentId: string) {
  return apiFetch(`/students/${studentId}/daily-goal`, {
    method: "GET",
    token: token(),
    schema: z
      .object({
        target: z.coerce.number().nullish(),
        answered: z.coerce.number().nullish(),
        day: z.string().nullish(),
      })
      .passthrough(),
  });
}
