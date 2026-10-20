import { z } from "zod";
import { apiFetch } from "./client";

/** School console endpoints that exist in core-api (SchoolController) but had no web client yet. */

const token = () =>
  typeof window !== "undefined"
    ? sessionStorage.getItem("accessToken") ?? localStorage.getItem("accessToken") ?? undefined
    : undefined;

/** POST /assignments/{id}/publish — ASG-06 (TCH). */
export const publishAssignment = (assignmentId: string) =>
  apiFetch(`/assignments/${assignmentId}/publish`, {
    method: "POST",
    token: token(),
    schema: z.object({ assignmentId: z.string(), status: z.string() }).passthrough(),
  });

/** POST /schools/{schoolId}/roster-imports/{importId}/commit — ONB-03 (SADM). Creates pupils from valid rows. */
export const commitRosterImport = (schoolId: string, importId: string) =>
  apiFetch(`/schools/${schoolId}/roster-imports/${importId}/commit`, {
    method: "POST",
    token: token(),
    schema: z.object({ committed: z.number() }).passthrough(),
  });
