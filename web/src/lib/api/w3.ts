import { z } from "zod";
import { apiFetch } from "./client";

const Any = z.any();

export function getPricing() {
  return apiFetch("/catalog/pricing", { method: "GET", schema: z.object({ items: z.array(Any) }) });
}
export function comparePlans() {
  return apiFetch("/catalog/plans/compare", { method: "GET", schema: Any });
}
export function planPreview(body: Record<string, unknown>, token?: string) {
  return apiFetch("/billing/checkout/plan-preview", { method: "POST", body: JSON.stringify(body), schema: Any, token });
}
export function patchSubscription(body: Record<string, unknown>, token?: string) {
  return apiFetch("/billing/subscription", { method: "PATCH", body: JSON.stringify(body), schema: Any, token });
}
export function submitPlanQuiz(body: Record<string, unknown>) {
  return apiFetch("/marketing/plan-quiz", { method: "POST", body: JSON.stringify(body), schema: Any });
}
export function listCaseStudies() {
  return apiFetch("/marketing/case-studies", { method: "GET", schema: z.object({ items: z.array(Any) }) });
}
export function registerStudent(body: Record<string, unknown>) {
  return apiFetch("/auth/student/register", { method: "POST", body: JSON.stringify(body), schema: Any });
}
export function generateWeeklyPlan(studentId: string, body: Record<string, unknown>, token?: string) {
  return apiFetch(`/students/${studentId}/weekly-plan/generate`, { method: "POST", body: JSON.stringify(body), schema: Any, token });
}
export function getWeeklyPlan(studentId: string, token?: string) {
  return apiFetch(`/students/${studentId}/weekly-plan`, { method: "GET", schema: Any, token });
}
export function createMock(body: Record<string, unknown>, token?: string) {
  return apiFetch("/mock-papers", { method: "POST", body: JSON.stringify(body), schema: Any, token });
}
export function getMock(mockId: string, token?: string) {
  return apiFetch(`/mock-papers/${mockId}`, { method: "GET", schema: Any, token });
}
export function startMock(mockId: string, token?: string) {
  return apiFetch(`/mock-papers/${mockId}/start`, { method: "POST", body: "{}", schema: Any, token });
}
export function saveMockAnswer(mockId: string, seq: number, body: Record<string, unknown>, token?: string) {
  return apiFetch(`/mock-papers/${mockId}/answers/${seq}`, { method: "PUT", body: JSON.stringify(body), schema: Any, token });
}
export function submitMock(mockId: string, token?: string) {
  return apiFetch(`/mock-papers/${mockId}/submit`, { method: "POST", body: "{}", schema: Any, token });
}
export function multiVersion(body: Record<string, unknown>, token?: string) {
  return apiFetch("/practice/multi-version", { method: "POST", body: JSON.stringify(body), schema: Any, token });
}
export function photoPractice(body: Record<string, unknown>, token?: string) {
  return apiFetch("/practice/photos", { method: "POST", body: JSON.stringify(body), schema: Any, token });
}
export function wrongAnswers(studentId: string, token?: string) {
  return apiFetch(`/students/${studentId}/wrong-answers`, { method: "GET", schema: Any, token });
}
export function quizSets(studentId: string, token?: string) {
  return apiFetch(`/students/${studentId}/quiz-sets`, { method: "GET", schema: Any, token });
}
export function saveQuizSet(studentId: string, body: Record<string, unknown>, token?: string) {
  return apiFetch(`/students/${studentId}/quiz-sets`, { method: "POST", body: JSON.stringify(body), schema: Any, token });
}
export function studentTopics(studentId: string, token?: string) {
  return apiFetch(`/students/${studentId}/topics`, { method: "GET", schema: Any, token });
}
export function selfMark(responseId: string, body: Record<string, unknown>, token?: string) {
  return apiFetch(`/answers/${responseId}/self-mark`, { method: "POST", body: JSON.stringify(body), schema: Any, token });
}
export function selfMarkCompare(responseId: string, token?: string) {
  return apiFetch(`/answers/${responseId}/self-mark-compare`, { method: "POST", body: "{}", schema: Any, token });
}
export function reviewStatus(responseId: string, token?: string) {
  return apiFetch(`/answers/${responseId}/review-status`, { method: "GET", schema: Any, token });
}
export function reviewQueue(token?: string) {
  return apiFetch("/internal/reviews/queue", { method: "GET", schema: Any, token });
}
export function reviewDetail(reviewId: string, token?: string) {
  return apiFetch(`/internal/reviews/${reviewId}`, { method: "GET", schema: Any, token });
}
export function claimReview(reviewId: string, token?: string) {
  return apiFetch(`/internal/reviews/${reviewId}/claim`, { method: "POST", body: "{}", schema: Any, token });
}
export function confirmReview(reviewId: string, token?: string) {
  return apiFetch(`/internal/reviews/${reviewId}/confirm`, { method: "POST", body: "{}", schema: Any, token });
}
export function adjustReview(reviewId: string, body: Record<string, unknown>, token?: string) {
  return apiFetch(`/internal/reviews/${reviewId}/adjust`, { method: "POST", body: JSON.stringify(body), schema: Any, token });
}
export function reviewSla(token?: string) {
  return apiFetch("/internal/reviews/sla", { method: "GET", schema: Any, token });
}
export function surpriseQuiz(studentId: string, token?: string) {
  return apiFetch(`/students/${studentId}/surprise-quiz`, { method: "GET", schema: Any, token });
}
export function completeSurprise(quizId: string, body: Record<string, unknown>, token?: string) {
  return apiFetch(`/surprise-quizzes/${quizId}/complete`, { method: "POST", body: JSON.stringify(body), schema: Any, token });
}
export function misconceptions(studentId: string, token?: string) {
  return apiFetch(`/students/${studentId}/misconceptions`, { method: "GET", schema: Any, token });
}
export function weeklyReport(studentId: string, reportId: string, token?: string) {
  return apiFetch(`/students/${studentId}/reports/weekly/${reportId}`, { method: "GET", schema: Any, token });
}
export function predictedGrades(studentId: string, token?: string) {
  return apiFetch(`/students/${studentId}/predicted-grades`, { method: "GET", schema: Any, token });
}
export function actionPlan(studentId: string, token?: string) {
  return apiFetch(`/students/${studentId}/action-plan`, { method: "GET", schema: Any, token });
}
export function revisionNotes(topicId: string | number, token?: string) {
  return apiFetch(`/revision/topics/${topicId}/notes`, { method: "GET", schema: Any, token });
}
export function topicDecks(topicId: string | number, token?: string) {
  return apiFetch(`/revision/topics/${topicId}/decks`, { method: "GET", schema: Any, token });
}
export function myDecks(deckId?: string, token?: string) {
  const q = deckId ? `?deckId=${deckId}` : "";
  return apiFetch(`/revision/decks${q}`, { method: "GET", schema: Any, token });
}
export function createDeck(body: Record<string, unknown>, token?: string) {
  return apiFetch("/revision/decks", { method: "POST", body: JSON.stringify(body), schema: Any, token });
}
export function reviewCard(cardId: string, body: Record<string, unknown>, token?: string) {
  return apiFetch(`/revision/cards/${cardId}/review`, { method: "POST", body: JSON.stringify(body), schema: Any, token });
}
export function cheatSheet(topicId: string | number, token?: string) {
  return apiFetch(`/revision/topics/${topicId}/cheat-sheet`, { method: "GET", schema: Any, token });
}
export function requestDeletion(studentId: string, body: Record<string, unknown>, token?: string) {
  return apiFetch(`/students/${studentId}/deletion-request`, { method: "POST", body: JSON.stringify(body), schema: Any, token });
}
export function getDeletion(studentId: string, token?: string) {
  return apiFetch(`/students/${studentId}/deletion-request`, { method: "GET", schema: Any, token });
}
export function cancelDeletion(studentId: string, token?: string) {
  return apiFetch(`/students/${studentId}/deletion-request`, { method: "DELETE", schema: Any, token });
}
export function requestExport(studentId: string, token?: string) {
  return apiFetch(`/students/${studentId}/data-export`, { method: "POST", body: "{}", schema: Any, token });
}
export function getExport(studentId: string, exportId: string, token?: string) {
  return apiFetch(`/students/${studentId}/data-export/${exportId}`, { method: "GET", schema: Any, token });
}
export function systemicIssues(token?: string) {
  return apiFetch("/internal/marking/systemic-issues", { method: "GET", schema: Any, token });
}
export function helpSearch(q?: string) {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return apiFetch(`/help/articles${qs}`, { method: "GET", schema: z.object({ items: z.array(Any) }) });
}
export function helpArticle(slug: string) {
  return apiFetch(`/help/articles/${encodeURIComponent(slug)}`, { method: "GET", schema: Any });
}
export function helpFeedback(articleId: number, helpful: boolean) {
  return apiFetch(`/help/articles/${articleId}/feedback`, { method: "POST", body: JSON.stringify({ helpful }), schema: Any });
}
export function startSupportChat(body: Record<string, unknown>, token?: string) {
  return apiFetch("/support/chat", { method: "POST", body: JSON.stringify(body), schema: Any, token });
}
export function postSupportMessage(chatId: string, body: Record<string, unknown>, token?: string) {
  return apiFetch(`/support/chat/${chatId}/messages`, { method: "POST", body: JSON.stringify(body), schema: Any, token });
}
export function notifications(token?: string) {
  return apiFetch("/notifications", { method: "GET", schema: Any, token });
}
export function markNotificationRead(id: string, token?: string) {
  return apiFetch(`/notifications/${id}/read`, { method: "POST", body: "{}", schema: Any, token });
}
export function markAllNotificationsRead(token?: string) {
  return apiFetch("/notifications/read-all", { method: "POST", body: "{}", schema: Any, token });
}
export function searchInApp(q: string, token?: string) {
  return apiFetch(`/search?q=${encodeURIComponent(q)}`, { method: "GET", schema: Any, token });
}
export function reexplain(body: Record<string, unknown>, token?: string) {
  return apiFetch("/tutor/reexplain", { method: "POST", body: JSON.stringify(body), schema: Any, token });
}
export function tutorSession(id: string, token?: string) {
  return apiFetch(`/tutor/sessions/${id}`, { method: "GET", schema: Any, token });
}
export function tutorMessage(id: string, body: Record<string, unknown>, token?: string) {
  return apiFetch(`/tutor/sessions/${id}/messages`, { method: "POST", body: JSON.stringify(body), schema: Any, token });
}
export function startTutor(body: Record<string, unknown>, token?: string) {
  return apiFetch("/tutor/sessions", { method: "POST", body: JSON.stringify(body), schema: Any, token });
}
export function getMarkScheme(questionId: string | number, token?: string) {
  return apiFetch(`/questions/${questionId}/mark-scheme`, { method: "GET", schema: Any, token });
}
export function getMarking(responseId: string, token?: string) {
  return apiFetch(`/answers/${responseId}/marking`, { method: "GET", schema: Any, token });
}
