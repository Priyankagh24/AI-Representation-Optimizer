# Technical Document: AI Representation Optimizer

**Hackathon Track:** Track 5 — AI Representation Optimizer  
**Stack:** Node.js 24, TypeScript 5.9, React 19, Express 5, PostgreSQL, Drizzle ORM, Google Gemini AI  
**Architecture:** pnpm monorepo with shared backend API and React + Vite frontend

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (React + Vite)                   │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌─────────────┐  │
│  │ Landing  │  │ Audit    │  │  Results   │  │  Dashboard  │  │
│  │  Page    │  │  Form    │  │   Page     │  │             │  │
│  └──────────┘  └──────────┘  └──────┬─────┘  └─────────────┘  │
│                                      │ polls every 3s           │
└──────────────────────────────────────┼─────────────────────────┘
                                       │ HTTP (REST)
┌──────────────────────────────────────┼─────────────────────────┐
│              Express 5 API Server    │                         │
│  ┌─────────────────────────────────────────┐                   │
│  │  POST /api/analyses        → creates DB  │                   │
│  │  GET  /api/analyses        → lists       │                   │
│  │  GET  /api/analyses/summary → stats      │                   │
│  │  GET  /api/analyses/:id    → single      │                   │
│  │  GET  /api/analyses/:id/report → MD      │                   │
│  └─────────────┬───────────────────────────┘                   │
│                │ async (fire-and-forget)                        │
│  ┌─────────────▼───────────────────────────┐                   │
│  │         AI Analysis Engine              │                   │
│  │  • Builds structured prompt             │                   │
│  │  • Calls Gemini 2.5 Flash               │                   │
│  │  • Parses JSON response                 │                   │
│  │  • Aggregates scores deterministically  │                   │
│  │  • Writes results to DB                 │                   │
│  └─────────────┬───────────────────────────┘                   │
└────────────────┼────────────────────────────────────────────────┘
                 │
┌────────────────┼────────────────────────────────────────────────┐
│  ┌─────────────▼──────────┐   ┌──────────────────────────────┐  │
│  │  PostgreSQL (Drizzle)  │   │  Google Gemini AI (via       │  │
│  │  - analyses table      │   │  Replit AI Integration proxy)│  │
│  └────────────────────────┘   └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Components and Data Flow

### 1. Frontend (React + Vite, TypeScript)
- **Routing:** Wouter (lightweight, client-side)
- **API calls:** Orval-generated React Query hooks (`@workspace/api-client-react`)
- **State management:** TanStack Query (server state), React hooks (local state)
- **Charts:** Recharts (RadarChart for dimension scores)
- **Forms:** React Hook Form + Zod validation
- **Styling:** Tailwind CSS v4 + shadcn/ui components

### 2. API Server (Express 5, TypeScript, Node.js 24)
- **Routes:** `/api/analyses` (CRUD + report), `/api/healthz`
- **Validation:** Zod schemas generated from OpenAPI spec via Orval
- **Logging:** Pino (structured JSON in production, pretty in development)
- **DB access:** Drizzle ORM with PostgreSQL

### 3. AI Analysis Engine (`artifacts/api-server/src/lib/analyzer.ts`)
- Triggered async on POST /api/analyses — returns 201 immediately, analysis runs in the background
- Builds a structured prompt with all store data fields
- Calls Gemini 2.5 Flash with `responseMimeType: "application/json"` to constrain output format
- Parses the JSON response and validates/clamps all numeric fields deterministically
- Writes results to the database with status transitions: `pending → analyzing → completed` (or `failed`)

### 4. Database (PostgreSQL + Drizzle ORM)
- Single `analyses` table with JSONB columns for `dimensions` and `recommendations`
- JSONB avoids schema migration complexity for deeply nested structured data that may evolve
- Drizzle provides type-safe queries and schema-first migration push

### 5. API Contract (OpenAPI → Orval codegen)
- `lib/api-spec/openapi.yaml` is the single source of truth
- Orval generates: React Query hooks (frontend), Zod validation schemas (backend)
- This ensures frontend and backend stay in sync without manual type duplication

---

## Key Implementation Decisions

### AI vs. Deterministic Boundary

| AI (Gemini) Handles | Deterministic Code Handles |
|---------------------|---------------------------|
| Qualitative gap analysis per dimension | Score aggregation (average of 6 dimensions) |
| Issues identified in natural language | Grade assignment (score → letter grade) |
| Actionable suggestions | Impact/effort ranking |
| "How AI sees you" narrative | Report markdown generation |
| Recommendation descriptions | Status transitions |

**Why this split:** LLMs are excellent at qualitative interpretation but unreliable at precise numeric computation. The AI scores each dimension (0-100) with rich qualitative justification; the server clamps those scores to valid ranges and computes the overall score deterministically. This means the AI can never produce an impossible score or a summary that contradicts the numeric result.

### Async Analysis Pattern

POST /api/analyses responds with 201 immediately after creating the DB record. The analysis runs as an async background process (not queued — it's a fire-and-forget Promise). The frontend polls GET /api/analyses/:id every 3 seconds until status is `completed` or `failed`.

**Why not SSE or WebSockets:** For a hackathon, polling is simpler, more debuggable, and works correctly across the proxy infrastructure. Analysis takes 5-20 seconds — polling overhead is negligible at that timescale.

### JSON-mode Gemini calls

The analysis prompt explicitly requests JSON output and the Gemini API call uses `responseMimeType: "application/json"`. This dramatically reduces parsing failures. A regex fallback (`responseText.match(/\{[\s\S]*\}/)`) handles the edge case where the model includes wrapper text despite the constraint.

### Report Generation — Server Side, Not AI

The markdown report is generated by server-side deterministic code from structured data already in the database. No additional LLM call is needed for report generation.

**Why:** LLM-generated reports are slower, more expensive, and inconsistent. A templated report from structured data is faster (instant), cheaper (free), and fully consistent with the scores shown in the UI.

---

## Failure Handling

### Shopify API down (not applicable — no live API integration)
The tool accepts manual input, eliminating dependency on Shopify uptime during analysis.

### Gemini API fails or returns garbage
1. The analysis engine retries up to 3 times with 2-second exponential backoff
2. If all retries fail, the analysis status is set to `failed` and the frontend shows an error state with a retry prompt
3. If the API returns non-JSON or malformed JSON: regex extraction attempted first, then JSON.parse; if both fail, status → `failed`
4. Scores are always clamped to 0-100 with `Math.min(100, Math.max(0, score))` — no AI score can produce an out-of-range result

### Unexpected user input
- Server validates all request bodies with Zod schemas before processing
- All form fields except `storeName` are optional — the engine handles empty/null fields gracefully
- Empty analysis (only store name provided) produces a valid but low-scored audit with recommendations to add more data

### Database errors
- Drizzle queries throw on DB failure — Express 5's async error forwarding propagates these to the global error handler, which returns a 500 with a structured error response
- The frontend shows a generic error state on 5xx responses

### Frontend polling failure
- If `useGetAnalysis` returns an error, the polling interval is cleared and an error message is shown
- Analysis stuck in `analyzing` for >5 minutes (timeout guard) shows a "Taking too long" message

---

## Known Limitations and v2 Improvements

| Limitation | v2 Improvement |
|-----------|---------------|
| Manual data entry only | Shopify OAuth + Admin API to pull live product/policy data automatically |
| No user accounts | Auth + saved audits per merchant |
| Single LLM call per analysis | Multi-turn analysis with follow-up questions for ambiguous data |
| No competitor benchmarking | Aggregate anonymized scores to show how a store compares to category peers |
| English-only analysis | Multi-language support matching Shopify's global merchant base |
| No implementation assistance | Auto-generate improved descriptions and policies for copy-paste |
| Fire-and-forget async | Proper job queue (BullMQ) for reliability at scale |

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 24 |
| Language | TypeScript 5.9 (strict) |
| Frontend framework | React 19 + Vite |
| Backend framework | Express 5 |
| Database | PostgreSQL (Replit managed) |
| ORM | Drizzle ORM |
| Validation | Zod v4 + Orval codegen |
| AI | Google Gemini 2.5 Flash (via Replit AI proxy) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Charts | Recharts |
| HTTP client | TanStack React Query (Orval hooks) |
| Monorepo | pnpm workspaces |
| Logging | Pino |
