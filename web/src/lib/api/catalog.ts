import { z } from "zod";
import { apiFetch } from "./client";

const ItemList = <T extends z.ZodTypeAny>(item: T) => z.object({ items: z.array(item) });

export const QualificationSchema = z.object({
  qualificationId: z.union([z.string(), z.number()]),
  code: z.string(),
  displayName: z.string(),
  typicalAgeMin: z.number().nullable().optional(),
  typicalAgeMax: z.number().nullable().optional(),
  visualTier: z.number().nullable().optional(),
});

export const BoardSchema = z.object({
  boardId: z.union([z.string(), z.number()]),
  code: z.string(),
  displayName: z.string(),
  countryScope: z.string().nullable().optional(),
  officialSiteUrl: z.string().nullable().optional(),
});

export const SubjectSchema = z.object({
  subjectId: z.union([z.string(), z.number()]),
  code: z.string(),
  displayName: z.string(),
  isCombinedScience: z.boolean().optional(),
  subjectProfile: z.string().nullable().optional(),
  isPilot: z.boolean().optional(),
});

export const SpecificationSchema = z.object({
  specificationId: z.union([z.string(), z.number()]),
  specCode: z.string(),
  title: z.string().nullable().optional(),
  tierScheme: z.string().nullable().optional(),
  firstTeachingYear: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
  qualificationId: z.union([z.string(), z.number()]).optional(),
  boardId: z.union([z.string(), z.number()]).optional(),
  subjectId: z.union([z.string(), z.number()]).optional(),
  boardCode: z.string().optional(),
  subjectCode: z.string().optional(),
  qualificationCode: z.string().optional(),
});

export function listQualifications() {
  return apiFetch("/catalog/qualifications", {
    method: "GET",
    schema: ItemList(QualificationSchema),
  });
}

export function listBoards(params?: { qualificationId?: string | number; subjectId?: string | number }) {
  const q = new URLSearchParams();
  if (params?.qualificationId) q.set("qualificationId", String(params.qualificationId));
  if (params?.subjectId) q.set("subjectId", String(params.subjectId));
  const qs = q.toString();
  return apiFetch(`/catalog/boards${qs ? `?${qs}` : ""}`, {
    method: "GET",
    schema: ItemList(BoardSchema),
  });
}

export function listSubjects() {
  return apiFetch("/catalog/subjects", {
    method: "GET",
    schema: ItemList(SubjectSchema),
  });
}

export function listSpecifications(params?: {
  qualificationId?: string | number;
  boardId?: string | number;
  subjectId?: string | number;
}) {
  const q = new URLSearchParams();
  if (params?.qualificationId) q.set("qualificationId", String(params.qualificationId));
  if (params?.boardId) q.set("boardId", String(params.boardId));
  if (params?.subjectId) q.set("subjectId", String(params.subjectId));
  const qs = q.toString();
  return apiFetch(`/catalog/specifications${qs ? `?${qs}` : ""}`, {
    method: "GET",
    schema: ItemList(SpecificationSchema),
  });
}
