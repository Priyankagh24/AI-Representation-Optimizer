# Decision Log

A running record of key decisions made during the build of AI Representation Optimizer.

---

## D001 — Chose Track 5 over Track 1 (AI Shopping Agent)

**Considered:** Track 1 (AI Shopping Agent), Track 4 (Customer Support Agent), Track 5 (AI Representation Optimizer)  
**Chose:** Track 5  
**Because:** Track 5 is the most differentiated problem space — fewer submissions will attempt it, it maps directly to Kasparro's core work, and it requires deeper product thinking than building another chatbot. The evaluation criteria explicitly rewards originality and product insight.

---

## D002 — Manual form input over live Shopify API integration

**Considered:** Shopify Admin API OAuth flow to pull live store data automatically  
**Chose:** Manual form input  
**Because:** OAuth setup, app installation, and Shopify rate limits introduce reliability risk in a hackathon context. Manual input proves the diagnostic concept equally well, lets merchants deliberately curate what they want analyzed, and eliminates external dependency failures during a demo. v2 adds live API integration.

---

## D003 — Six specific dimensions over a general "quality score"

**Considered:** Single composite score, three broad categories, or six specific dimensions  
**Chose:** Six dimensions: Product Description Quality, Policy Completeness, Trust Signal Strength, FAQ & Query Coverage, Structured Data & Metadata, Pricing & Inventory Clarity  
**Because:** Each dimension maps to a specific type of data that AI agents use when constructing recommendations. Six is enough to be meaningful without being overwhelming. A single score diagnoses existence of a problem; six dimensions tell you where and why.

---

## D004 — Gemini 2.5 Flash over GPT-4o for analysis

**Considered:** GPT-4o (via Replit OpenAI integration), Gemini 2.5 Flash, Gemini 3.1 Pro  
**Chose:** Gemini 2.5 Flash  
**Because:** Available for free via Replit AI Integrations proxy (no API key needed), fast enough for hackathon demo purposes, and handles the JSON-mode analysis task well. Gemini 3.1 Pro would be stronger for complex reasoning but is slower and costs more credits.

---

## D005 — Async analysis with polling over SSE streaming

**Considered:** Server-Sent Events (SSE) for streaming analysis progress, polling, WebSockets  
**Chose:** Polling (every 3 seconds)  
**Because:** Analysis is a single atomic operation (one Gemini call + DB write) — there's no intermediate state worth streaming. SSE adds infrastructure complexity (proxy headers, connection management). Polling with 3-second intervals is simpler, debuggable, and works correctly across Replit's proxy. The 5-20 second analysis window makes polling overhead negligible.

---

## D006 — JSON mode for Gemini calls

**Considered:** Free-form text response with regex parsing, JSON mode, structured output with schema  
**Chose:** JSON mode (`responseMimeType: "application/json"`) with regex fallback  
**Because:** JSON mode dramatically reduces parse failures while avoiding the schema validation overhead of fully structured output. The regex fallback (`responseText.match(/\{[\s\S]*\}/)`) handles the edge case where the model wraps JSON in markdown code fences despite the constraint.

---

## D007 — JSONB columns for dimensions and recommendations

**Considered:** Separate tables for dimensions and recommendations with foreign keys, JSONB columns  
**Chose:** JSONB columns on the analyses table  
**Because:** Dimensions and recommendations are always read together with the analysis — never queried independently. Separate tables would add JOIN complexity for no query benefit. JSONB is PostgreSQL-native, indexed if needed, and allows the data structure to evolve without migrations.

---

## D008 — Deterministic report generation over AI-generated reports

**Considered:** A separate Gemini call to generate the markdown report in natural prose  
**Chose:** Server-side template from structured data  
**Because:** LLM-generated reports are slower (another API call), more expensive (more tokens), and inconsistent (the report might describe scores differently than the UI shows them). A deterministic template from already-structured data is instant, consistent, and free. The AI's qualitative writing is already captured in the dimension summaries and recommendations.

---

## D009 — Impact × Effort prioritization for recommendations

**Considered:** Priority by dimension importance, priority by score gap, impact × effort matrix  
**Chose:** Impact × effort — highest impact + lowest effort = top priority  
**Because:** This is how a real consultant would advise a time-constrained merchant. A quick-win fix with high impact should be done before a transformative but expensive initiative. This framing also maps well to the UI (impact/effort tags make prioritization transparent).

---

## D010 — "How AI Sees You" as the primary emotional hook

**Considered:** Leading results with the score, leading with the action plan, leading with the AI perception narrative  
**Chose:** AI perception narrative prominently above the dimension breakdown  
**Because:** The most powerful moment in the product is when a merchant reads exactly how an AI agent would describe their store. It creates immediate emotional resonance — you either recognize your brand or you don't. This visceral gap between perception and intent motivates action more than any score.

---

## D011 — Score clamping and grade assignment in deterministic code

**Considered:** Letting AI assign final scores and grades, computing grades from AI scores in code  
**Chose:** AI assigns raw dimension scores (0-100); code clamps, aggregates, and grades  
**Because:** LLMs drift on numeric precision but are reliable on qualitative reasoning. Clamping to `Math.min(100, Math.max(0, score))` ensures no AI error can produce an impossible score. Grade assignment (A+ through F) from a deterministic lookup table ensures grade consistency across all analyses.

---

## D012 — pnpm monorepo with shared OpenAPI contract

**Considered:** Separate frontend/backend repositories, monorepo with manual types, contract-first OpenAPI codegen  
**Chose:** pnpm monorepo with OpenAPI spec and Orval codegen  
**Because:** The generated React Query hooks and Zod validation schemas eliminate an entire class of frontend/backend type drift bugs. Changing an endpoint requires updating the spec, running codegen, and the TypeScript compiler catches any integration mismatches automatically. This is the correct architecture for a team environment.
