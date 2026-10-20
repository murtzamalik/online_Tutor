# Study Loop web UI guidelines

Source of truth: `supporting_docs/Design_System_Visual_Language.docx` (summarised here) and the prototype
`supporting_docs/Study_Loop_UI_UX_Prototype.html`. Every screen is built from the components below — no ad-hoc styling.

## Look & feel
- Inter, 8pt spacing (4/8/12/16/24/32/48/64 → Tailwind 1/2/3/4/6/8/12/16). Background `bg-paper` (#F4F6F9), surfaces white cards.
- Brand navy `brand-navy` (#1F3864) for primary actions/nav; teal `brand-teal` for AI/tutor surfaces.
- Text: `text-neutral-900` primary, `text-neutral-600` secondary, `text-caption` (13px) metadata.
- Type scale classes: `text-h1` (screen title, use PageHeader), `text-h2` (section), `text-body-lg` (question stems), `text-caption`.
- Answer colours: `answer-correct` green, `answer-partial` amber, `answer-incorrect` red (accent only, never full-screen red).
- Mastery: use `MasteryRing` / `MasteryBadge` (grey "Just getting started" → amber → green → teal "Mastered"). Never call low mastery "weak".
- Parent / school / staff screens are "Tier 4 Professional": neutral, data-forward, tables and stat tiles, no illustration.
- Student screens are "Tier 2 Core": calm, one primary action per screen, encouraging but brief copy.
- Icons: `@phosphor-icons/react` (import named icons, size 18–22). In server components use `@phosphor-icons/react/dist/ssr`.

## Building blocks (`@/components/ui/...`)
- `AppPage` (inside signed-in shells; `width="content"` for reading/question screens, `"wide"` default for dashboards) and `PublicPage` (inside `PublicFrame`).
- `PageHeader title description eyebrow actions` — every screen starts with one.
- `Card`, `CardHeader title description action`, `CardBody`.
- `Button` / `ButtonLink` variants `primary | secondary | tertiary | destructive`, sizes `sm | md | lg`, `loading` prop. One primary per screen.
- `Field label hint error` wrapping `Input`, `Textarea`, `Select`; `Checkbox label`.
- `Badge tone` (neutral, brand, teal, success, warning, danger, info) for statuses. `Callout tone title` for inline messages.
- `StatTile label value hint icon` for KPIs; `Table` + `Th` + `Td` for lists; `KeyValue items` for detail rows.
- States: `LoadingState` (skeleton), `EmptyState title body action`, `ErrorState body action`, `ForbiddenState`, `OfflineState`. Every data screen handles loading, empty, error and forbidden (403 → ForbiddenState).

## Page frames
- Signed-in route groups `(student) (parent) (school) (staff)`, `/notifications`, `/search`, `/settings` already render the AppShell (sidebar, top bar, logout). Pages must NOT render their own nav; `<AppNav/>` is a no-op inside the shell and can be removed.
- Public pages wrap their content in `<PublicFrame>` (header, footer, cookie banner) and use `PublicPage`.
- Auth pages (login, signup, child login, verify, staff login) use `AuthCard` from `@/components/shell/AuthLayout`.

## Rules
- Keep every API call, route and behaviour that already exists; only change presentation, unless fixing a bug.
- Never show raw JSON or `ReadableData` dumps to users — read the API function in `src/lib/api/*.ts` (and, if needed, the Spring controller/service under `backend/core-api`) to learn the response shape and render real UI.
- Format dates with `toLocaleDateString("en-GB", …)`, money from pence with `£`, numbers with `tabular` class.
- Copy is UK English, short and specific. Errors say what happened and what to do next.
- Accessibility: labels on every input, `aria-live="polite"` on async results, focus-visible styles come from the components.
