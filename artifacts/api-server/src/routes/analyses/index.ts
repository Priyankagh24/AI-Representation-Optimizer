import { Router, type IRouter } from "express";
import { eq, desc, avg, count } from "drizzle-orm";
import { db, analysesTable } from "@workspace/db";
import {
  CreateAnalysisBody,
  GetAnalysisParams,
  GetAnalysisReportParams,
} from "@workspace/api-zod";
import { runAnalysis } from "../../lib/analyzer";
import { ai } from "@workspace/integrations-gemini-ai";

const router: IRouter = Router();


// ── GET /analyses ─────────────────────────────────────────────────────────────
router.get("/analyses", async (req, res): Promise<void> => {
  const analyses = await db
    .select()
    .from(analysesTable)
    .orderBy(desc(analysesTable.createdAt))
    .limit(50);
  res.json(analyses);
});


// ── POST /analyses ────────────────────────────────────────────────────────────
router.post("/analyses", async (req, res): Promise<void> => {
  const parsed = CreateAnalysisBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Guard: prevent duplicate concurrent audits for same store
  const existing = await db
    .select()
    .from(analysesTable)
    .where(eq(analysesTable.storeName, parsed.data.storeName))
    .orderBy(desc(analysesTable.createdAt))
    .limit(1);

  if (
    existing.length > 0 &&
    (existing[0].status === "pending" || existing[0].status === "analyzing")
  ) {
    res.status(409).json({
      error: "An audit for this store is already in progress. Please wait for it to complete.",
      existingId: existing[0].id,
    });
    return;
  }

  const [analysis] = await db
    .insert(analysesTable)
    .values({
      storeName: parsed.data.storeName,
      storeUrl: parsed.data.storeUrl ?? null,
      storeDescription: parsed.data.storeDescription ?? null,
      productSamples: parsed.data.productSamples ?? null,
      shippingPolicy: parsed.data.shippingPolicy ?? null,
      returnPolicy: parsed.data.returnPolicy ?? null,
      faqContent: parsed.data.faqContent ?? null,
      aboutContent: parsed.data.aboutContent ?? null,
      merchantIntent: parsed.data.merchantIntent ?? null,
      category: parsed.data.category ?? null,
      status: "pending",
    })
    .returning();

  runAnalysis(analysis.id).catch((err) => {
    req.log.error({ err, analysisId: analysis.id }, "Analysis failed");
  });

  res.status(201).json(analysis);
});


// ── GET /analyses/summary ─────────────────────────────────────────────────────
router.get("/analyses/summary", async (_req, res): Promise<void> => {
  const [totals] = await db
    .select({ total: count(analysesTable.id) })
    .from(analysesTable);

  const [completed] = await db
    .select({
      completed: count(analysesTable.id),
      avgScore: avg(analysesTable.overallScore),
    })
    .from(analysesTable)
    .where(eq(analysesTable.status, "completed"));

  const recent = await db
    .select()
    .from(analysesTable)
    .orderBy(desc(analysesTable.createdAt))
    .limit(5);

  res.json({
    totalAnalyses: totals?.total ?? 0,
    completedAnalyses: completed?.completed ?? 0,
    averageScore: completed?.avgScore ? Math.round(Number(completed.avgScore)) : null,
    topIssue: null,
    recentAnalyses: recent,
  });
});


// ── GET /analyses/:id ─────────────────────────────────────────────────────────
router.get("/analyses/:id", async (req, res): Promise<void> => {
  const params = GetAnalysisParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [analysis] = await db
    .select()
    .from(analysesTable)
    .where(eq(analysesTable.id, params.data.id));

  if (!analysis) {
    res.status(404).json({ error: "Analysis not found" });
    return;
  }

  res.json(analysis);
});


// ── GET /analyses/:id/report ──────────────────────────────────────────────────
router.get("/analyses/:id/report", async (req, res): Promise<void> => {
  const params = GetAnalysisReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [analysis] = await db
    .select()
    .from(analysesTable)
    .where(eq(analysesTable.id, params.data.id));

  if (!analysis) {
    res.status(404).json({ error: "Analysis not found" });
    return;
  }

  if (analysis.status !== "completed") {
    res.status(400).json({ error: "Analysis not yet completed" });
    return;
  }

  const dims = (analysis.dimensions as unknown as Array<{
    name: string; score: number; grade: string; summary: string;
    issues: string[]; suggestions: string[];
  }>) || [];

  const recs = (analysis.recommendations as unknown as Array<{
    priority: number; title: string; description: string;
    impact: string; effort: string; dimension: string; actionItems: string[];
  }>) || [];

  const gap = analysis.perceptionGap as unknown as {
    missingConcepts: string[];
    presentConcepts: string[];
    gapSummary: string;
    improvedDescription: string;
  } | null;

  const scoreDeltaLine =
    (analysis as any).scoreDelta != null
      ? `**Score Change Since Last Audit:** ${(analysis as any).scoreDelta > 0 ? "+" : ""}${(analysis as any).scoreDelta} points\n`
      : "";

  const markdown = `# AI Representation Audit Report
## ${analysis.storeName}
${analysis.storeUrl ? `**Store URL:** ${analysis.storeUrl}  \n` : ""}**Generated:** ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}  
**Overall AI-Readiness Score:** ${analysis.overallScore}/100 (Grade: ${analysis.overallGrade})  
${scoreDeltaLine}
---

## How AI Agents Currently Perceive Your Store

${analysis.aiPerception}

${gap ? `---

## Perception Gap Analysis

**Gap Summary:** ${gap.gapSummary}

**Concepts AI DOES pick up:** ${gap.presentConcepts.join(", ")}

**Missing from AI perception:** ${gap.missingConcepts.join(", ")}

**Suggested Improved Content:**
> ${gap.improvedDescription}
` : ""}

---

## Dimension Scores

| Dimension | Score | Grade | Summary |
|-----------|-------|-------|---------|
${dims.map((d) => `| ${d.name} | ${d.score}/100 | ${d.grade} | ${d.summary} |`).join("\n")}

---

## Detailed Analysis

${dims
  .map(
    (d) => `### ${d.name} — ${d.score}/100 (${d.grade})

${d.summary}

**Issues Identified:**
${d.issues.map((i) => `- ${i}`).join("\n")}

**Recommendations:**
${d.suggestions.map((s) => `- ${s}`).join("\n")}
`
  )
  .join("\n")}

---

## Prioritized Action Plan

${recs
  .map(
    (r) => `### ${r.priority}. ${r.title}
**Dimension:** ${r.dimension} | **Impact:** ${r.impact} | **Effort:** ${r.effort}

${r.description}

**Action Items:**
${r.actionItems.map((a) => `- [ ] ${a}`).join("\n")}
`
  )
  .join("\n")}

---

*Generated by AI Representation Optimizer — helping Shopify merchants understand and improve how AI shopping agents perceive their store.*
`;

  res.json({
    id: analysis.id,
    markdown,
    generatedAt: new Date().toISOString(),
  });
});


// ── GET /analyses/:id/history ─────────────────────────────────────────────────
// Returns score history for all completed audits of the same store (for chart)
router.get("/analyses/:id/history", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [current] = await db
    .select()
    .from(analysesTable)
    .where(eq(analysesTable.id, id));

  if (!current) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const history = await db
    .select()
    .from(analysesTable)
    .where(eq(analysesTable.storeName, current.storeName))
    .orderBy(desc(analysesTable.createdAt))
    .limit(10);

  const result = history
    .filter((a) => a.status === "completed" && a.overallScore != null)
    .reverse()
    .map((a) => ({
      date: new Date(a.completedAt || a.createdAt).toLocaleDateString(),
      score: a.overallScore,
      grade: a.overallGrade,
      id: a.id,
    }));

  res.json(result);
});


// ── POST /analyses/:id/simulate ───────────────────────────────────────────────
// Simulates what an AI shopping agent would say about this store for a given query
router.post("/analyses/:id/simulate", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const { query } = req.body;
  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "query is required" });
    return;
  }

  const [analysis] = await db
    .select()
    .from(analysesTable)
    .where(eq(analysesTable.id, id));

  if (!analysis) {
    res.status(404).json({ error: "Analysis not found" });
    return;
  }

  if (analysis.status !== "completed") {
    res.status(400).json({ error: "Completed analysis required" });
    return;
  }

  try {
    const prompt = `You are simulating how an AI shopping agent (like ChatGPT Shopping or Google Gemini) would respond to a customer query, based ONLY on the store data available below.

STORE DATA AVAILABLE TO THE AI AGENT:
Store: ${analysis.storeName}
Category: ${analysis.category || "General"}
Description: ${analysis.storeDescription?.slice(0, 800) || "None provided"}
Products: ${analysis.productSamples?.slice(0, 600) || "None provided"}
About: ${analysis.aboutContent?.slice(0, 400) || "None provided"}
Shipping Policy: ${analysis.shippingPolicy?.slice(0, 200) || "None provided"}
Return Policy: ${analysis.returnPolicy?.slice(0, 200) || "None provided"}

CUSTOMER QUERY: "${query}"

Respond ONLY with valid JSON (no markdown, no preamble):
{
  "wouldRecommend": true,
  "confidence": "high",
  "agentResponse": "The 2-3 sentence response an AI shopping agent would give to the customer. Be realistic — if data is thin, the response should be vague or absent.",
  "whyOrWhyNot": "1-2 sentences explaining WHY the agent responded this way, referencing what data signals it used or lacked.",
  "missingSignals": ["signal1", "signal2"]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 1024, responseMimeType: "application/json" },
    });

    let parsed: any;
    try {
      const raw = response.text ?? "{}";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      res.status(500).json({ error: "Failed to parse simulation response" });
      return;
    }

    res.json({ query, ...parsed });
  } catch (err) {
    res.status(500).json({ error: "Simulation failed" });
  }
});


// ── POST /audit-chat ──────────────────────────────────────────────────────────
// Conversational assistant that answers questions about a specific audit result
router.post("/audit-chat", async (req, res): Promise<void> => {
  const { auditContext, messages } = req.body;

  if (!auditContext || !Array.isArray(messages)) {
    res.status(400).json({ error: "Missing auditContext or messages" });
    return;
  }

  try {
    const systemInstruction = `You are an expert AI commerce consultant. You have full access to a merchant's AI-readiness audit results. Answer their questions concisely and practically. Always reference specific scores, dimensions, or recommendations from their actual audit data. If asked to rewrite content, produce actual copy they can use immediately. Keep answers under 150 words unless you are writing actual store content.

AUDIT DATA:
${auditContext}`;

    // Map conversation messages — must start with a user turn for Gemini
    const conversationMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Gemini requires the first turn to be "user" — filter out any leading model turns
    const firstUserIdx = conversationMessages.findIndex((m: { role: string }) => m.role === "user");
    const contents = firstUserIdx >= 0 ? conversationMessages.slice(firstUserIdx) : conversationMessages;

    if (contents.length === 0) {
      res.status(400).json({ error: "No user message found in conversation" });
      return;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction,
        maxOutputTokens: 512,
      },
    });

    const reply =
      response.text?.trim() ||
      response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "I couldn't generate a response. Please try again.";

    res.json({ reply });
  } catch (err: any) {
    const message = err?.message || "Unknown error";
    console.error("[audit-chat] Gemini error:", message);
    res.status(500).json({ error: "Chat failed", detail: message });
  }
});


// ── POST /import-url ──────────────────────────────────────────────────────────
// Fetches a public storefront URL and extracts visible text for auto-fill
router.post("/import-url", async (req, res): Promise<void> => {
  const { url } = req.body;
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "URL is required" });
    return;
  }

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AIRepOptimizer/1.0)" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      res.status(400).json({ error: `Could not fetch URL: ${response.status}` });
      return;
    }

    const html = await response.text();

    const clean = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s{3,}/g, "\n\n")
      .trim()
      .slice(0, 5000);

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";

    const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    const metaDescription = metaMatch ? metaMatch[1].trim() : "";

    res.json({ text: clean, title, metaDescription });
  } catch (err) {
    res.status(400).json({ error: "Failed to fetch URL. Make sure it is a public website." });
  }
});


export default router;