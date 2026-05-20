# Product Document: AI Representation Optimizer

**Hackathon Track:** Track 5 — AI Representation Optimizer  
**Participant:** Solo  
**Date:** May 2026

---

## The Problem and Why It Matters

When a shopper asks an AI assistant — ChatGPT, Gemini, Perplexity, or a Shopify-native AI agent — "find me a sustainable yoga mat under $80," the AI doesn't browse the web in real time. It reconstructs an answer from the store data it can access: product titles, descriptions, policies, reviews, and structured metadata.

If a merchant's data is thin, ambiguous, or contradictory, the AI does one of two things: it skips the merchant entirely, or it misrepresents them. Both outcomes are invisible to the merchant. There's no bounce rate for an AI recommendation that never happened.

This is the most important unmonitored revenue leak in modern e-commerce. The shift to AI-mediated discovery is happening now — Shopify's Agentic Plan signals that the platform itself is betting on it — and merchants have no diagnostic layer to understand their exposure.

The problem is not that merchants don't care. It's that they have no visibility. You cannot fix what you cannot see.

---

## Target User

**Primary user: Shopify merchant (owner or digital marketing manager)**

Current experience:
- They have no way to know how AI agents describe their store
- They assume their Shopify setup is "good enough" because it works for humans
- When AI-driven traffic drops or never materializes, they blame ad spend or seasonality — not data quality
- The closest tools they have are SEO auditors, which are optimized for keyword crawlers, not conversational AI

**What the user wants:**
1. To understand the gap between how they want to be perceived and how AI actually sees them
2. A prioritized, actionable list — not a vague report full of "consider improving your descriptions"
3. Confidence that investing time in their store data will have a measurable impact

---

## What I Built and the Core User Journey

**AI Representation Optimizer** is a merchant-facing diagnostic tool that:
1. Takes store data as input (manually entered or from a Shopify URL)
2. Analyzes it across 6 AI-readiness dimensions using Gemini AI
3. Returns an overall AI-readiness score, a per-dimension breakdown, a "how AI currently perceives you" narrative, and a prioritized action plan

**Core user journey:**
1. Merchant lands on the home page — sees recent audits, understands the value proposition
2. Clicks "Run Audit" → fills in the store form (name, URL, product descriptions, policies, FAQs, brand story, how they want to be perceived)
3. Submits → gets redirected to a real-time results page that polls for completion
4. Sees their AI-readiness score (0-100), dimension breakdown with grades (A+ to F), the AI perception narrative, and ranked recommendations
5. Downloads a full markdown report to share with their team

---

## Key Product Decisions

### 1. Manual input over live Shopify API crawling

**Decision:** Accept store data via form fields rather than live API integration.

**Reasoning:** A hackathon demo needs to work reliably without OAuth setup, app installation, or rate limit management. More importantly, the manual input model lets merchants control exactly what data gets analyzed — they can paste their strongest descriptions or their weakest ones, making the diagnostic more intentional.

**Tradeoff accepted:** Less automated than a production tool. A real v2 would add Shopify OAuth to pull live product and policy data. For this submission, the manual model is cleaner and more reliable.

### 2. Six dimensions, not a single score

**Decision:** Decompose AI readiness into 6 scored dimensions rather than one aggregate number.

**Reasoning:** A single number tells a merchant they have a problem. Six scored dimensions tell them exactly where. The dimensions were chosen to map directly to what AI agents actually use when constructing recommendations: product descriptions, policies, trust signals, FAQ coverage, structured metadata, and pricing clarity. Each dimension a merchant can independently improve.

**Tradeoff:** More complex to display clearly. Solved with a radar chart and expandable dimension cards.

### 3. Gemini AI for analysis, deterministic code for scoring

**Decision:** AI generates the perception narrative and per-dimension issues/suggestions; deterministic code handles score aggregation, grade assignment, report generation, and failure fallback.

**Reasoning:** LLMs are excellent at qualitative analysis — interpreting ambiguous descriptions, identifying policy gaps, generating actionable suggestions in natural language. They're unreliable at precise numeric computation. Drawing the line here gives us the best of both: rich qualitative insight from AI, consistent and testable quantitative output from code.

### 4. "How AI Sees You" as the emotional anchor

**Decision:** Show the AI perception narrative prominently at the top of results.

**Reasoning:** The most powerful moment in the audit is when a merchant reads exactly how an AI agent would describe their store to a customer. It's visceral — you either recognize your brand or you don't. This creates immediate motivation to act on the recommendations below it. It's the product's hook.

### 5. Prioritized action plan with impact/effort matrix

**Decision:** Rank recommendations by impact × ease, not by dimension priority.

**Reasoning:** Merchants are time-constrained. A high-impact, low-effort fix should be done before a high-impact, high-effort one — even if the latter is in a more "important" dimension. This prioritization model matches how a real consultant would advise.

---

## What I Chose NOT to Build

- **Live Shopify API integration:** Requires OAuth, app installation, and rate limit management. Not worth the hackathon risk when manual input proves the concept equally well.
- **Competitor benchmarking:** Would require a database of store audits and comparative analysis. Interesting future feature but out of scope.
- **AI agent simulation (actually querying ChatGPT about the store):** Technically interesting but expensive, slow, and inconsistent for a demo. The Gemini analysis achieves the same diagnostic value more reliably.
- **Recommendations auto-implementation:** Generating "improved" versions of descriptions would be useful but risks hallucinating product facts. Intentionally excluded.
- **User accounts and authentication:** Added unnecessary complexity for a hackathon. All audits are session-based.

---

## Tradeoffs and How I Resolved Them

**Tradeoff 1: Depth of analysis vs. speed of response**  
Full analysis with 6 dimensions and 3-6 recommendations takes 5-15 seconds of LLM processing. To avoid a blank waiting screen, the app uses async analysis with real-time status polling. The user is redirected immediately and sees a live "Analyzing..." state. The wait becomes part of the UX rather than a failure.

**Tradeoff 2: AI accuracy vs. reliability**  
LLMs can return malformed JSON or hallucinate scores. Handled by: (a) using `responseMimeType: "application/json"` in the Gemini API call, (b) extracting JSON with a regex fallback if the response has wrapping text, (c) clamping scores to 0-100, (d) setting status to "failed" with a clear error state if parsing fails after 3 retries.

**Tradeoff 3: Comprehensive form vs. low barrier to entry**  
A comprehensive form gives better analysis but increases drop-off. Resolved by making all fields except store name optional, with helpful placeholder text showing what good input looks like. Merchants can submit with just a name and get a useful (if limited) baseline audit.
