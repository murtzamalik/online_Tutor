# Study Loop — Progress Update · Look & Feel

**20 October 2026 · Confidential · For stakeholder review**

> Prefer the HTML pack for sharing: [`CLIENT_STATUS_LOOK_AND_FEEL.html`](CLIENT_STATUS_LOOK_AND_FEEL.html)  
> Open in a browser → **Print → Save as PDF**. Keep the `client_screenshots/` folder beside the HTML file.

## In short

Study Loop is running as a full web application. Families can sign in, learners practise with instant marking and an AI tutor, parents oversee progress and privacy, and staff can review content and A-Level marking queues. The look and feel is calm, modern, and education-focused.

## What’s ready to review

- **Public site** — home, pricing, library, FAQ, signup/login shells  
- **Student loop** — picture-PIN child login, home, adaptive practice, AI tutor, revise, mock exams, progress  
- **Parent portal** — dashboard, child overview, AI controls, privacy, billing/trial entry points  
- **Staff tools** — A-Level review workbench; content Question QC and past-paper authoring  
- **Live AI path** — tutor and marking via the AI gateway in the demo environment  

## How we use AI (plain English)

AI in Study Loop works like a **supervised teaching assistant**. Requests go through our **AI Gateway** (safety, privacy, model choice). Children’s personal details are not sent to AI vendors.

| Provider | Simple meaning | Used for |
|----------|----------------|----------|
| **Google Gemini** (Flash) | Fast general AI from Google | Everyday tutor help and many marking tasks |
| **Groq** (open models) | Very fast open-model hosting | Heavier reasoning / stronger second opinion |
| **Ollama** (local) | Backup AI on our machine | Fallback if cloud is slow/unavailable |
| **Anthropic Claude** (optional) | Paid alternative, switchable | Rollback path if we route to it later |

**Where families feel the benefit:** instant mark-scheme feedback, anytime tutor chat, safety screening, faster question drafting (staff still approve), clearer parent summaries, A-Level provisional marks with human review.

See the HTML/PDF for the full tables and flow diagram.

## Screenshots

### Marketing

![Homepage](client_screenshots/01_home.png)

![Pricing](client_screenshots/02_pricing.png)

### Access

![Parent login](client_screenshots/03_login.png)

![Child picture-PIN login](client_screenshots/04_child_login.png)

### Student

![Student home](client_screenshots/05_student_home.png)

![Practice](client_screenshots/06_practice.png)

![AI tutor](client_screenshots/07_tutor.png)

![Revise](client_screenshots/08_revise.png)

![Mock exam](client_screenshots/09_mock.png)

### Parent

![Parent dashboard](client_screenshots/10_parent_dashboard.png)

![Child detail](client_screenshots/11_parent_child.png)

### Staff & content

![A-Level review](client_screenshots/12_staff_review.png)

![Question QC](client_screenshots/13_content_qc.png)

## Suggested walkthrough

1. Homepage and pricing  
2. Parent login → dashboard → child profile  
3. Child login → Practice → Tutor → Revise / Mock  
4. Optional: staff review or content QC  

## What’s next (polish before full UAT)

- Diagnostic question display clarity  
- Marking edge cases on short answers  
- Secondary student routes and legal copy depth  
- Voice tutor entry polish  

## Demo access (local)

| Surface | Login |
|---------|--------|
| App | http://localhost:8080 |
| Parent | `demo.family@studyloop.local` / `DemoFamily!234` |
| Student (Alex) | `/child-login` · `learner-e9ae-7469` · PIN cat → dog → tree |
| Staff reviewer | `reviewer@studyloop.local` / `ReviewerDemo!23` |
| Content admin | `content@studyloop.local` / `ReviewerDemo!23` |
