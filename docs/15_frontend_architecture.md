# 15 · Frontend Architecture (Next.js 15 + TypeScript + Tailwind)

Design reference: `supporting_docs/Study_Loop_UI_UX_Prototype.html`, `Design_System_Visual_Language.docx`, `Figma_Handoff_Brief.docx`, the PDF design reference. Open item P-10: whether the HTML prototype is the final reference or a Figma rebuild — **until decided, the HTML prototype + design-system doc are the visual source of truth**; implement via tokens so re-skinning is cheap.

## Route groups (App Router)
| Group | Audience | Examples (from `docs/screens/`) |
|---|---|---|
| `(public)` | visitors, SEO | `/`, `/[qualification]/[subject]`, `/faq`, `/pricing`, `/try`, `/legal/[slug]`, `/help` |
| `(auth)` | login, signup, verify, reset, child picture-PIN | `/signup`, `/login`, `/verify-email`, `/child-login`, `/age-check` |
| `(parent)` | parent app | `/parent`, `/parent/children/[id]/…`, `/parent/billing/…`, `/parent/checkout` |
| `(student)` | learner app | `/home`, `/practice/[sessionId]`, `/tutor/…`, `/voice/…`, `/revise/…`, `/mock/…` |
| `(school)` | teachers/admins/SBM | `/school/…` |
| `(staff)` | internal tools | `/staff/content/qc`, `/staff/review`, `/staff/safeguarding`, `/staff/ai/…` |
Layouts enforce role + flag + entitlement guards (server-side redirect) and fetch `/me` bootstrap once. Each screen's route is in `api/screens.json`.

## Rendering strategy
Public pages: RSC + ISR (revalidate via CMS webhook), full SEO metadata/JSON-LD. Authenticated pages: RSC shell + client islands; practice/tutor/voice are client-heavy with optimistic UI and offline draft persistence (answers saved locally per keystroke-debounce, flushed on reconnect).

## Data layer
Typed client generated from OpenAPI (`openapi-typescript` + thin fetch wrapper) with Zod runtime validation on responses; TanStack Query for caching; SSE hook `useEventStream()` for marking/tutor; auth via httpOnly cookies + CSRF header; refresh handled by the wrapper (single-flight). No API calls from components directly — feature hooks in `src/lib/api/<module>.ts`.

## Design tokens & theming
`src/styles/tokens.json` (colour, type scale, spacing, radius, elevation, motion) → generated Tailwind theme + CSS variables; **age-band themes** (11+ friendlier, GCSE standard, A-Level compact) via `data-theme` attr; light/dark; high-contrast and reduced-motion honoured. Accessibility preferences (B-09/J-03: font size, dyslexia-friendly font, spacing, TTS, extra time, simplified language) persisted per student (`STU-10/11`) and applied at root.

## Component system
`components/ui` (Button, Input, Select, Dialog, Tabs, Toast, Skeleton, EmptyState, ErrorState, Banner, Stepper, Progress, Table, Badge…) built on Radix primitives; `components/domain` (QuestionRenderer, McqOptions, NumericInput, ChemStructuredInput, MarkSchemeView, MarkingResult, HintLadder, ConfidenceSlider, TutorChat, VoicePanel, MasteryHeatmap, TopicTree, FlashcardViewer, PlanCard, ReportCard, StatTile…). Every component: Storybook story with states + a11y check. Shell-07 empty/loading/error patterns are the only allowed state UIs.

## Chemistry rendering
KaTeX + `mhchem` for formulae/equations (`\ce{}`); state-symbol and subscript input helpers in ChemStructuredInput (D-12): equation builder with balanced-check hints (client hint only; server authoritative), unit chooser, sig-fig display, working lines.

## Accessibility (WCAG 2.2 AA minimum)
Keyboard-first, focus management in dialogs/stepper, aria-live for marking/tutor updates, captions for voice, colour-independent status, target size ≥ 24 px, no time limits except mock papers (with extra-time support), reduce motion. axe in CI + manual screen-reader pass for D-01, F-01, J-01, Shell-04.

## Security (web)
CSP with nonces, no inline scripts; sanitise all rendered user text (no dangerouslySetInnerHTML except sanitised KaTeX); cookie flags; CORS locked; file upload validation client + server; no third-party trackers in child areas; cookie consent (`CON-06`) gates non-essential scripts.

## Internationalisation
UK English only for launch; strings in a message catalogue (`next-intl`) for future locales; dates/currency via `Intl` with `en-GB`.

## Testing
Vitest + Testing Library (components/hooks), MSW for API in unit tests only (never in e2e), Playwright e2e for PF-01/02/05/06 flows + role guards, visual regression on Storybook, Lighthouse CI on public pages (perf ≥ 90, a11y ≥ 95).
