-- =============================================================================
-- V025 — Pilot-draft legal documents (privacy, terms, cookies, ai-data, safeguarding).
-- Stories: CON-05, CON-06, CON-07 (QA gap GAP-004). Screens: Shell-10 (/legal/[slug]).
-- V014 left one-line stubs as the current legal documents. This adds full pilot-draft
-- versions ('1.1-pilot-draft') built only from facts in the repo (V010 sub-processors and
-- retention config, docs 02/08/11/16/20, safeguarding templates). Anything not yet decided
-- (company legal name, address, ICO number, DPO contact, analytics tool, vendor training
-- terms) is left as a [bracketed placeholder]. Final text comes from the client's solicitor
-- before launch. Note: the web Markdown renderer has no table support, so "tables" are
-- written as bullet lists.
-- =============================================================================

UPDATE legal_document
SET is_current = FALSE
WHERE is_current = TRUE
  AND slug IN ('privacy', 'terms', 'cookies', 'ai-data', 'safeguarding');

INSERT INTO legal_document (slug, version, title, body_md, is_current, published_at) VALUES

-- -----------------------------------------------------------------------------
-- Privacy Policy
-- -----------------------------------------------------------------------------
('privacy', '1.1-pilot-draft', 'Privacy Policy', $md$# Privacy Policy

> Pilot draft — final text from the client's solicitor before launch.

This policy explains what personal data Study Loop collects, why, who we share it with, how long we keep it and what your rights are. Study Loop is used by children, so we have tried to write it in plain English. There is a short version for young people near the end.

## Who we are

Study Loop is an online revision and tutoring service for UK learners (ages 7–11, GCSE/iGCSE and A-level). It is run by [Company legal name], a company registered in England and Wales (company number [Company number]), whose registered office is at [Registered address].

For the personal data described here, [Company legal name] is the **data controller**. When a school uses Study Loop for its pupils, the **school is the controller** for its pupils' data and we act as its **processor** under a data processing agreement (DPA).

- ICO registration number: [ICO registration number]
- Data protection contact / DPO: [DPO name and email address]

## The data we collect

### Parents and carers

- Account details: name, email address, password (stored only as a secure hash) or sign-in through Google or Apple.
- The children you add and the consents you give or withdraw for them (for example, voice tutoring).
- Billing details. Card payments are handled by Stripe; card numbers never reach our servers. We keep your subscription status and billing history.
- Messages you send to our support team.

### Children and learners

- A first name or display name, year group, subjects, exam boards and the picture-PIN used to sign in (stored encrypted).
- Learning data: answers, marks, mastery levels, time spent, hints used, tutor chat messages and, where used, photos of written working (personal details are masked before marking).
- Voice tutor: if a parent has switched voice on, the child's speech is turned into text. We do **not** keep the audio. We keep the written transcript for 30 days and parents can read it.
- Safety records: if our safety checks flag a message, a record is created for our trained safeguarding staff to review.

### Schools and teachers

- Teacher and school-admin names, work email addresses and roles.
- Class lists imported by the school (by CSV upload or, where enabled, through an MIS connector), assignments and class results.
- Invoicing contact details.

### Website visitors

- Your cookie choice and a random visitor ID, so we remember that choice. See our [Cookie Policy](/legal/cookies).
- If you ask us to email you a resource, your email address.

We do not use children's data for marketing profiles, and we do not put third-party advertising trackers in learner areas.

## Why we use your data and our lawful bases

- **To provide the service** (accounts, practice, marking, tutor, reports to parents): performance of our contract with the parent; for schools, the school's public task or legitimate interests, with us as processor.
- **To take payments and manage subscriptions**: performance of contract; keeping accounting records is a legal obligation.
- **Voice tutoring**: parent consent for each child, which can be withdrawn at any time.
- **Keeping children safe** (safety checks, safeguarding review, staff vetting): legitimate interests and, where it applies, our legal obligations and vital interests. Information about a child's health or welfare that comes up in a safeguarding concern is handled under the substantial public interest condition for safeguarding children.
- **Security, fraud prevention and fixing problems**: legitimate interests.
- **Improving our questions and marking accuracy** using answers that have been stripped of identity: legitimate interests, balanced against children's interests in a legitimate interests assessment [LIA reference].
- **Optional analytics cookies on public pages**: consent.
- **Service emails** (sign-in codes, trial-end reminders, weekly reports): performance of contract. Marketing emails only with consent.

## Children and the Age Appropriate Design Code

We follow the ICO's Age Appropriate Design Code (the Children's Code):

- Children under 13 can only use Study Loop through a parent's account. Young people aged 13–15 may have their own account, with their parent told by email. [Age thresholds to be confirmed by legal advice.]
- Settings are high-privacy by default. Voice and other optional features are off until a parent switches them on.
- No profiling for marketing, no third-party advertising trackers in learner areas, no pressure techniques or dark patterns. We limit reminders ("nudges") to a small number per session.
- Parents can see what their child does, including tutor and voice transcripts. We explain this to children in the app.

## How we use AI

Study Loop uses AI to mark answers, run the tutor, create practice questions and check messages for safety. All AI requests go through our own **AI gateway**, which:

- never sends names, dates of birth, email addresses, school names or account IDs to AI providers;
- removes personal details (such as phone numbers, emails and postcodes) from learner text and masks photos before they are sent;
- uses a random one-off token instead of who you are, so the AI provider cannot tell who wrote an answer.

In the pilot the AI providers are **Google (Gemini)** and **Groq**, reached through our gateway. Full details are in [AI and your data](/legal/ai-data).

## Voice

Voice tutoring is the one feature where personal data (the child's voice) goes to an outside provider. Audio is streamed to Google Cloud Speech-to-Text and Text-to-Speech so the tutor can listen and reply, and is **not stored** by us. The written transcript is kept for 30 days and is visible to the parent. Voice only works after a parent has given consent for that child, and the parent can turn it off at any time.

## Who we share data with (sub-processors)

We only share what each provider needs to do its job, under a contract that protects your data.

- **Google (Gemini, via our AI gateway)** — AI marking, tutoring, question generation and safety checks. Receives question text and redacted learner answers only, with no identity data. Location: [to confirm].
- **Groq (via our AI gateway)** — AI tutoring and safety checks. Receives redacted text only, with no identity data. Location: [to confirm].
- **Google Cloud Speech-to-Text / Text-to-Speech** — voice tutor speech recognition and synthesis. Receives voice audio (with separate parent consent). Location: EU/UK region where available.
- **Stripe** — payments, subscriptions and school invoicing. Receives parent or school billing details. Location: EU/US.
- **Postmark** — transactional email. Receives parent or teacher email address and message content. Location: US/EU.
- **OneSignal** — push notifications. Receives device identifiers and notification content. Location: US/EU.
- **Hetzner** — hosting. Stores all platform data at rest. Location: EU (Germany/Finland).
- **uCheck** — DBS and Barred List checks for our staff. Receives staff vetting data only, never learner data. Location: UK.

The current list is also published on our sub-processor page and given to schools. We may also share data where the law requires it, for example with the police or children's social care when a child is at risk.

## International transfers

Our servers are in the EU (Germany/Finland). Some providers above may process data in the United States. Where data leaves the UK, we rely on UK adequacy regulations or the UK International Data Transfer Agreement / Addendum, plus extra safeguards. [Transfer mechanism for each provider to be confirmed.] UK-only hosting for schools is under review.

## How long we keep data

- Voice audio: not kept.
- Voice transcripts: 30 days.
- Tutor chat transcripts: 90 days [to confirm in DPIA].
- Photos of written working (masked): 30 days, for marking disputes.
- Raw activity events: 90 days, then only kept as totals.
- Redacted copies of what was sent to AI providers: 14 days, for checking by our data protection lead.
- Audit logs: 7 years.
- Account and learning records: while the account is open. When you ask us to delete an account there is a 14-day cooling-off period, then we delete within 30 days of your request, except records we must keep by law (for example billing records).
- Backups: deleted data drops out of encrypted backups within [backup retention period].

## Your rights

You have the right to: access your data; correct it; delete it; restrict or object to some uses; get a copy to move elsewhere; and withdraw consent at any time (this does not affect what we did before). Parents can usually exercise these rights for younger children. Older children may be able to exercise them themselves.

You can download or delete your data from your account settings, or email [DPO email address]. We reply within one month. For school accounts, we pass the request to the school.

## For young people — the short version

- We only collect what we need to help you learn.
- We never send your name, email or school to the AI.
- Your parent can see your tutor chats and voice transcripts.
- If you tell the tutor something that makes us worried about your safety, a trained adult on our team will look at it.
- You can ask your parent, or us, to see or delete your data.

## Contact and complaints

Write to [Company legal name], [Registered address], or email [privacy contact email]. If you are unhappy with our answer, you can complain to the Information Commissioner's Office (ICO): [ico.org.uk](https://ico.org.uk) or 0303 123 1113.

## Changes to this policy

If we make important changes we will tell parents and schools by email or in the app before they take effect. The version number and date are shown at the top of this page.
$md$, TRUE, now()),

-- -----------------------------------------------------------------------------
-- Terms of Service
-- -----------------------------------------------------------------------------
('terms', '1.1-pilot-draft', 'Terms of Service', $md$# Terms of Service

> Pilot draft — final text from the client's solicitor before launch.

These terms are an agreement between you and [Company legal name] ("we", "us"), the provider of Study Loop. Please read them with our [Privacy Policy](/legal/privacy), [Cookie Policy](/legal/cookies), [AI and your data](/legal/ai-data) and [Safeguarding Policy](/legal/safeguarding).

## About the pilot

Study Loop is currently in a **pilot**. That means:

- some subjects, exam boards and features are not yet available, or are marked as coming soon;
- features may change, and we may pause a feature (for example the AI tutor) if a safety check or provider is not working;
- we welcome feedback and may contact you about your experience.

Study Loop is a revision tool. It does not replace a school, a qualified teacher or official exam-board guidance.

## Accounts and parent responsibility

- Parent and carer accounts are for adults aged 18 or over.
- Children under 13 use Study Loop only through a parent's account. Young people aged 13–15 may have their own account, with their parent told by email. [Age thresholds to be confirmed.]
- If you add a child, you confirm you are their parent or legal guardian, or have their permission, and you are responsible for how the account is used and for the consents you give (for example voice tutoring).
- Keep passwords and children's picture-PINs private. Tell us straight away if you think someone else has used your account.
- School accounts are set up by the school under a separate agreement and data processing agreement. Where those conflict with these terms, the school agreement applies.

## Subscriptions, trials and payment

- Prices are shown on our pricing page before you subscribe. [VAT treatment — inclusive or exclusive — to be confirmed.]
- New family subscriptions may start with a free trial of [7] days. We will remind you by email at least 3 days before the trial ends. If you do not cancel before the trial ends, your subscription starts and you will be charged.
- Subscriptions renew automatically each month or year until cancelled. Payments are taken by **Stripe**; we never see or store your full card details.
- You can change plan at any time; we show you any price difference before you confirm.
- **Cancelling:** you can cancel at any time from your account. Your subscription stays active until the end of the period you have paid for and then stops. There is no cancellation fee.
- If a payment fails, we will email you and your child keeps access for a grace period of [14] days while you update your card.
- **Your right to cancel:** as a consumer you have 14 days from purchase to cancel. [Solicitor to confirm how the statutory cancellation right and digital-content waiver apply, and the refund policy.]
- Schools are invoiced per pupil under their school agreement.

## Acceptable use

You and your child must not:

- share account details, or let someone else use a child's account;
- try to get around safety checks, or try to make the tutor produce harmful content;
- post personal details, links or contact details in tutor chats (we remove them automatically);
- copy, scrape or resell our questions, explanations or other content;
- try to break, overload, probe or reverse-engineer the service;
- upload anything unlawful, abusive or that belongs to someone else without permission.

We may suspend or close an account that breaks these rules, and we will tell you why unless the law or a safeguarding concern prevents it.

## AI marking and the AI tutor

- Answers are marked by AI against exam-board style mark schemes. For GCSE and iGCSE, marks are not routinely checked by a person; answers where the AI is unsure, or where two marking passes disagree, go to a human review queue.
- For A-level, AI marks are **provisional** until a trained reviewer has checked them.
- AI can make mistakes. Marks, predicted grades and tutor explanations are guidance for revision only. They are not official exam-board marks and are not a guarantee of exam results.
- Totals, grades and prices are always calculated by our software, not by the AI.
- **Disagree with a mark?** Use the "dispute" option on the result. A person will review it, normally within [72] hours, and you will see the outcome in the app.
- The tutor is an AI, not a person. It will not help with anything outside schoolwork, and it will pause and point a child towards a trusted adult if a message suggests they may be at risk.

## Our content

All questions, explanations, designs and software in Study Loop belong to us or our licensors. You may use them for your own or your child's personal study only. Exam-board names are used for reference; we are not endorsed by any exam board. [Exam-board licensing position to be confirmed.]

## Our responsibility to you

- We will provide the service with reasonable care and skill. We aim for high availability but cannot promise the service will always be available or error-free.
- Nothing in these terms limits our liability for death or personal injury caused by our negligence, for fraud, or for anything else that cannot be limited by law, and nothing affects your statutory rights as a consumer.
- [Liability cap and exclusions to be drafted by the client's solicitor.]

## Ending the agreement

You can close your account at any time from settings. We may end or suspend the service with reasonable notice, or straight away for serious breaches of these terms. If we end a paid subscription without a good reason, we will refund any unused part.

## Changes to these terms

We may update these terms, for example when the pilot ends or features change. We will tell you about important changes before they take effect. If you do not agree, you can cancel before they apply.

## Complaints

Contact [support email]. We aim to reply within [5] working days.

## Law and courts

These terms are governed by the law of England and Wales, and the courts of England and Wales have jurisdiction. If you live in Scotland or Northern Ireland, you can also bring proceedings in your local courts.

## Contact

[Company legal name], [Registered address], company number [Company number]. Email: [support email].
$md$, TRUE, now()),

-- -----------------------------------------------------------------------------
-- Cookie Policy
-- -----------------------------------------------------------------------------
('cookies', '1.1-pilot-draft', 'Cookie Policy', $md$# Cookie Policy

> Pilot draft — final text from the client's solicitor before launch.

This policy explains the cookies and similar browser storage Study Loop uses, and how you can choose which ones are allowed.

## What cookies are

Cookies are small files a website saves in your browser. Similar technologies, such as your browser's local storage and session storage, work in the same way. In this policy "cookies" covers all of them.

## Essential cookies

These are needed for Study Loop to work, so they are always on. Under UK law (PECR) they do not need consent.

- **Sign-in session** — keeps you signed in and protects you from fake requests (sign-in tokens and a security token). Lasts for your session; sign-in can be refreshed for up to 30 days.
- **Cookie choice** (cookieConsent) — remembers whether you allowed analytics. Kept until you change it or clear your browser.
- **Visitor ID** (visitorId) — a random ID that lets us record your cookie choice. It does not identify you. Kept until you clear your browser.
- **Onboarding progress** — remembers which subject a learner was setting up. Cleared when the browser tab closes.

## Optional analytics cookies

Analytics cookies help us understand how people use our **public pages** (such as the home page and pricing) so we can improve them.

- They are **off unless you choose "Allow analytics"**.
- They are **never used in learner areas** — the parts of Study Loop children use for practice, the tutor and results.
- We do not use advertising or social-media tracking cookies.
- Analytics provider: [Analytics provider — not yet chosen]. Cookie names and how long they last: [to be listed once a provider is chosen].

## How to change your choice

- Use the buttons at the bottom of this page ("Accept analytics" or "Essential only"). Your new choice applies straight away.
- Or use the cookie banner shown when you first visit.
- You can also block or delete cookies in your browser settings. If you block essential cookies, you will not be able to sign in.

## Changes

If we add or change cookies we will update this page and, where needed, ask for your choice again.

## Contact

Questions about cookies: [privacy contact email]. See also our [Privacy Policy](/legal/privacy).
$md$, TRUE, now()),

-- -----------------------------------------------------------------------------
-- AI and your data
-- -----------------------------------------------------------------------------
('ai-data', '1.1-pilot-draft', 'How we use AI with your data', $md$# AI and your data

> Pilot draft — final text from the client's solicitor before launch.

Study Loop uses artificial intelligence (AI) to help children revise. This page explains what the AI does, what information it sees, and the protections we have put around it.

## What the AI does

- **Marking** — checks written answers against the mark scheme and explains which marking points were earned. GCSE and iGCSE answers are marked twice; if the two passes disagree, or the AI is not confident, the answer goes to a person.
- **Tutor** — explains topics, gives hints and answers questions about schoolwork, by text or (if a parent allows it) by voice.
- **Question generation** — writes new practice questions in the style of each exam board. Every new question passes automatic quality checks (matched to the specification, consistent with its mark scheme, answerable, not a duplicate) before learners see it. Questions that fail go to a person.
- **Safety checks** — a separate AI check reads every learner message and every tutor reply, looking for signs that a child might be at risk or that a reply is not suitable.

## What the AI does not do

- It does not do maths for marks or grades. Mark totals, numeric answers, mastery levels, grades and prices are calculated by our own software.
- It does not draw diagrams. Diagrams come from our own library or are drawn by code.
- It does not decide on safeguarding. Its job is to flag; trained people decide what happens next.
- It does not write the safety messages children see. Those are fixed, pre-approved texts.

## People in the loop

- **Marking exceptions** — low-confidence answers, disagreements between marking passes and disputes raised by families go to a review queue handled by trained staff, normally within [72] hours.
- **A-level** — every AI mark is provisional until a reviewer has checked it.
- **Question quality** — questions that fail automatic checks are reviewed by people before use.
- **Safety** — flagged messages go to our Designated Safeguarding Lead (DSL). See the [Safeguarding Policy](/legal/safeguarding).

Everyone who can see children's content has an Enhanced DBS check with Barred List check before they get access.

## What data the AI providers receive

All AI requests go through our own **AI gateway**. Our other systems cannot contact AI providers directly. The gateway:

- **never sends** names, dates of birth, email addresses, school names or account IDs;
- **removes** phone numbers, emails, postcodes and social-media handles from learner text, and masks personal details in photos of written work;
- replaces who you are with a **random one-off token**, so the provider cannot link answers to a person or to each other;
- keeps a redacted copy of exactly what was sent for 14 days so our data protection lead can check it, then deletes it.

What is sent is the question, the mark scheme or topic, and the redacted learner answer or message.

In the pilot, the AI models are provided by **Google (Gemini)** and **Groq**. If they are unavailable, a fallback model running on our own servers may be used. We can change provider without changing these protections, and we will update our sub-processor list if we do.

## Voice

Voice is different: to understand speech, Google Cloud Speech-to-Text has to receive the child's voice audio, and Google Text-to-Speech creates the tutor's spoken reply. This is the only place an outside provider receives personal data. That is why voice needs a separate parent consent for each child and can be turned off at any time. We do **not** keep the audio. The written transcript is kept for 30 days and parents can read it.

## Training AI models

AI providers never receive names, emails, schools or account IDs, so nothing they receive can be linked back to a child. Our own search for similar questions uses an open-source model on our own servers, and only exam content (questions, specifications, notes) is put into it — never learner data.

Answers whose marks are corrected by our reviewers may be kept, without identity, to test and improve marking accuracy.

[To confirm before launch: our formal statement on model training, and each provider's contract terms on training and data retention for Google Gemini and Groq. Until confirmed, the pilot uses redacted or synthetic data only.]

## Your choices

- Parents can switch voice on or off for each child.
- Parents can read tutor chat and voice transcripts.
- Parents can set a daily limit on AI use for each child.
- Anyone can dispute a mark, and a person will review it.
- You can ask what data we hold — see the [Privacy Policy](/legal/privacy).

## Questions

Email [DPO email address].
$md$, TRUE, now()),

-- -----------------------------------------------------------------------------
-- Safeguarding Policy
-- -----------------------------------------------------------------------------
('safeguarding', '1.1-pilot-draft', 'Safeguarding Policy', $md$# Safeguarding Policy

> Pilot draft — final text from the client's solicitor before launch.

Keeping children safe is our first priority. This page explains how Study Loop spots possible risks, who looks at them and what happens next. [Full KCSIE-mapped safeguarding pack to be supplied by the client.]

## Our commitment

- We have a **Designated Safeguarding Lead (DSL)**: [DSL name and contact details].
- Everyone on our team who can see children's content has an **Enhanced DBS check with Barred List check** (through uCheck) before they are given access, and we follow safer-recruitment practice.
- We follow the ICO Children's Code, the Online Safety Act 2023 and, for schools, Keeping Children Safe in Education (KCSIE).

## How the platform keeps children safe

- **Built-in rules** — phone numbers, email addresses, postcodes and social-media handles typed by a child are removed automatically, with a gentle reminder not to share them. Links are blocked, and there are limits on message length and how often messages can be sent.
- **Safety checks on every message** — a separate AI safety check reads every message a child sends to the tutor, and every reply from the tutor before the child sees it. If the safety check is not working, the tutor pauses rather than carrying on unchecked.
- **Voice** — spoken replies are checked sentence by sentence before they are played.
- **Shared content** — shared study materials are checked before others can see them.
- **The tutor is an AI, not a person** — and it only helps with schoolwork.

## What a child sees if we are worried

If a message suggests a child may be at risk, the tutor does not try to counsel them. It shows a **fixed, pre-approved message** (never written by AI) and pauses the session for a short time. For example:

> Thank you for telling me. I'm an AI tutor, so I'm not the right one to help with this, but it's important that you talk to someone who can. Please tell a trusted adult today — a parent, carer, teacher or someone at school. If you feel unsafe right now, call 999. You can also talk to Childline for free on 0800 1111, any time.

There are similar messages for worries about home, bullying, contact from adults online and eating. Helpline numbers are checked before every release.

## Who reviews concerns, and how quickly

Each flag goes to our DSL team with a priority level:

- **Immediate** — reviewed within 15 minutes.
- **Same day** — reviewed within 4 hours.
- **Routine** — reviewed within 24 hours.

[Review times to be confirmed by the client's DSL.] Every decision and every view of a concern is recorded in an audit log.

## Telling parents, schools and other services

- The DSL decides whether to contact a parent or carer. This is a deliberate decision, not an automatic message, because telling a parent is not always the safest step.
- For pupils using Study Loop through school, we tell the **school's safeguarding contact** in line with our agreement with the school and KCSIE.
- If a child is in immediate danger, or the law requires it, we will contact the police or local children's social care.

## Information for schools

- Schools remain responsible for their own safeguarding duties under KCSIE. Study Loop supports them; it does not replace them.
- Each school gives us a named safeguarding contact when it joins. [School escalation process to be set out in the school agreement / DPA.]
- School data is kept separate from other schools' data, and teachers only see their own classes.

## For parents

- You can read your child's tutor chats and voice transcripts.
- You can switch voice off at any time.
- If you are worried about something your child has seen or said on Study Loop, contact our DSL at [DSL email].

## For young people

If something is worrying you, tell a trusted adult — a parent, carer or teacher. You can call **Childline** free on **0800 1111**, any time. If you are in danger right now, call **999**.

## Reporting a concern

Email [safeguarding email] or contact our support team in the app [in-app reporting route to be confirmed]. If a child is in immediate danger, call 999 first.
$md$, TRUE, now())

ON CONFLICT (slug, version) DO UPDATE
SET title = EXCLUDED.title,
    body_md = EXCLUDED.body_md,
    is_current = TRUE,
    published_at = now();
