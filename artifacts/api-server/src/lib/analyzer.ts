import { ai } from "@workspace/integrations-gemini-ai";
import { db, analysesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { logger } from "./logger";

export interface DimensionScore {
  name: string;
  score: number;
  maxScore: number;
  grade: string;
  summary: string;
  issues: string[];
  suggestions: string[];
}

export interface Recommendation {
  priority: number;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
  dimension: string;
  actionItems: string[];
}

export interface PerceptionGap {
  missingConcepts: string[];
  presentConcepts: string[];
  gapSummary: string;
  improvedDescription: string;
}

export interface AnalysisResult {
  overallScore: number;
  overallGrade: string;
  aiPerception: string;
  dimensions: DimensionScore[];
  recommendations: Recommendation[];
  perceptionGap?: PerceptionGap;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreToGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 85) return "A";
  if (score >= 80) return "A-";
  if (score >= 75) return "B+";
  if (score >= 70) return "B";
  if (score >= 65) return "B-";
  if (score >= 60) return "C+";
  if (score >= 55) return "C";
  if (score >= 50) return "C-";
  if (score >= 40) return "D";
  return "F";
}

function truncate(text: string | null | undefined, maxChars = 2000): string {
  if (!text) return "";
  return text.length > maxChars ? text.slice(0, maxChars) + "... [truncated]" : text;
}

// The 6 canonical dimension names — used for padding if AI returns fewer
const EXPECTED_DIMENSIONS = [
  "Product Description Quality",
  "Policy Completeness",
  "Trust Signal Strength",
  "FAQ & Query Coverage",
  "Structured Data & Metadata",
  "Pricing & Inventory Clarity",
];

/**
 * Pad dimensions array to always have all 6 entries.
 * Prevents radar chart rendering issues when AI returns fewer than 6.
 */
function padDimensions(dimensions: DimensionScore[]): DimensionScore[] {
  const result = [...dimensions];
  for (const expectedName of EXPECTED_DIMENSIONS) {
    const alreadyPresent = result.some(
      (d) => d.name.toLowerCase().includes(expectedName.toLowerCase().slice(0, 8))
    );
    if (!alreadyPresent) {
      result.push({
        name: expectedName,
        score: 0,
        maxScore: 100,
        grade: "F",
        summary: "No data available for this dimension.",
        issues: ["Insufficient data provided to evaluate this dimension."],
        suggestions: ["Provide relevant store content to enable evaluation of this dimension."],
      });
    }
  }
  return result.slice(0, 6); // Never more than 6
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(data: {
  storeName: string;
  storeUrl?: string | null;
  storeDescription?: string | null;
  productSamples?: string | null;
  shippingPolicy?: string | null;
  returnPolicy?: string | null;
  faqContent?: string | null;
  aboutContent?: string | null;
  merchantIntent?: string | null;
  category?: string | null;
}): string {
  return `You are an expert AI commerce analyst. Analyze the following Shopify merchant store data and evaluate how well AI shopping agents (like ChatGPT Shopping, Google Gemini, and Perplexity) can understand, discover, and recommend this store's products.

STORE DATA:
Store Name: ${data.storeName}
${data.storeUrl ? `Store URL: ${data.storeUrl}` : ""}
${data.category ? `Category: ${data.category}` : ""}
${data.merchantIntent ? `How the merchant WANTS to be perceived: ${truncate(data.merchantIntent, 500)}` : ""}
${data.storeDescription ? `Store Description: ${truncate(data.storeDescription)}` : "No store description provided."}
${data.productSamples ? `Product Samples/Catalog: ${truncate(data.productSamples)}` : "No product information provided."}
${data.shippingPolicy ? `Shipping Policy: ${truncate(data.shippingPolicy)}` : "No shipping policy provided."}
${data.returnPolicy ? `Return Policy: ${truncate(data.returnPolicy)}` : "No return policy provided."}
${data.faqContent ? `FAQ Content: ${truncate(data.faqContent)}` : "No FAQ content provided."}
${data.aboutContent ? `About/Brand Story: ${truncate(data.aboutContent)}` : "No about content provided."}

EVALUATION TASK:
Score this store across 6 AI-readiness dimensions. Also analyze the gap between how the merchant wants to be perceived vs how AI currently perceives them. For the lowest scoring dimension, generate an improved version of that content.

Respond ONLY with valid JSON in this exact format:
{
  "aiPerception": "A 2-3 sentence description of how an AI shopping agent would currently perceive and represent this store. Be specific and honest.",
  "perceptionGap": {
    "missingConcepts": ["concept1", "concept2", "concept3"],
    "presentConcepts": ["concept1", "concept2"],
    "gapSummary": "1-2 sentence summary of the gap between merchant intent and AI perception",
    "improvedDescription": "A rewritten version of the weakest content area (2-4 sentences) that would dramatically improve AI representation. Be specific and use the merchant's actual product/brand details."
  },
  "dimensions": [
    {
      "name": "Product Description Quality",
      "score": <0-100>,
      "summary": "<1 sentence summary>",
      "issues": ["<specific issue 1>", "<specific issue 2>"],
      "suggestions": ["<specific actionable suggestion 1>", "<specific actionable suggestion 2>"]
    },
    {
      "name": "Policy Completeness",
      "score": <0-100>,
      "summary": "<1 sentence summary>",
      "issues": ["<issue>"],
      "suggestions": ["<suggestion>"]
    },
    {
      "name": "Trust Signal Strength",
      "score": <0-100>,
      "summary": "<1 sentence summary>",
      "issues": ["<issue>"],
      "suggestions": ["<suggestion>"]
    },
    {
      "name": "FAQ & Query Coverage",
      "score": <0-100>,
      "summary": "<1 sentence summary>",
      "issues": ["<issue>"],
      "suggestions": ["<suggestion>"]
    },
    {
      "name": "Structured Data & Metadata",
      "score": <0-100>,
      "summary": "<1 sentence summary>",
      "issues": ["<issue>"],
      "suggestions": ["<suggestion>"]
    },
    {
      "name": "Pricing & Inventory Clarity",
      "score": <0-100>,
      "summary": "<1 sentence summary>",
      "issues": ["<issue>"],
      "suggestions": ["<suggestion>"]
    }
  ],
  "recommendations": [
    {
      "priority": 1,
      "title": "<short action title>",
      "description": "<2-3 sentence explanation>",
      "impact": "<high|medium|low>",
      "effort": "<low|medium|high>",
      "dimension": "<dimension name>",
      "actionItems": ["<concrete step 1>", "<concrete step 2>", "<concrete step 3>"]
    }
  ]
}

SCORING GUIDELINES:
- Score 0-20: Critical gaps — AI agents will skip or badly misrepresent this store
- Score 21-40: Major gaps — AI agents will give very generic, unhelpful responses
- Score 41-60: Moderate gaps — AI agents can partially represent the store but miss key details
- Score 61-80: Good — AI agents can represent this store reasonably well
- Score 81-100: Excellent — AI agents can represent this store accurately and compellingly

For perceptionGap.missingConcepts: list 3-5 key concepts/attributes the merchant WANTS but are absent from the current content.
For perceptionGap.presentConcepts: list 2-4 concepts that ARE present and would be picked up by AI agents.
Generate 3-6 recommendations total, ranked by impact × ease.`;
}

// ── Main analysis runner ──────────────────────────────────────────────────────

export async function runAnalysis(analysisId: number): Promise<void> {
  logger.info({ analysisId }, "Starting AI analysis");

  const [analysis] = await db
    .select()
    .from(analysesTable)
    .where(eq(analysesTable.id, analysisId));

  if (!analysis) {
    logger.error({ analysisId }, "Analysis not found");
    return;
  }

  // Guard: if already completed or failed, skip
  if (analysis.status === "completed" || analysis.status === "failed") {
    logger.warn({ analysisId, status: analysis.status }, "Analysis already in terminal state, skipping");
    return;
  }

  try {
    await db
      .update(analysesTable)
      .set({ status: "analyzing" })
      .where(eq(analysesTable.id, analysisId));

    const prompt = buildPrompt(analysis);

    // ── Call Gemini with retry ──
    let responseText = "";
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
          },
        });
        responseText = response.text ?? "";
        break;
      } catch (err) {
        attempts++;
        logger.warn({ analysisId, attempts, err }, "Gemini API call failed, retrying");
        if (attempts === maxAttempts) throw err;
        await new Promise((r) => setTimeout(r, 2000 * attempts));
      }
    }

    // ── Parse JSON response ──
    // Strategy 1: responseMimeType should give clean JSON
    // Strategy 2: extract JSON object from markdown code block
    // Strategy 3: extract first {...} block via regex
    let parsed: {
      aiPerception: string;
      perceptionGap?: {
        missingConcepts: string[];
        presentConcepts: string[];
        gapSummary: string;
        improvedDescription: string;
      };
      dimensions: Array<{
        name: string;
        score: number;
        summary: string;
        issues: string[];
        suggestions: string[];
      }>;
      recommendations: Array<{
        priority: number;
        title: string;
        description: string;
        impact: string;
        effort: string;
        dimension: string;
        actionItems: string[];
      }>;
    };

    try {
      // First try direct parse (responseMimeType should give clean JSON)
      let jsonStr = responseText.trim();

      // Strip markdown code fences if present
      const mdMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (mdMatch) {
        jsonStr = mdMatch[1].trim();
      }

      // Extract first complete {...} block as fallback
      if (!jsonStr.startsWith("{")) {
        const objMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (objMatch) jsonStr = objMatch[0];
      }

      parsed = JSON.parse(jsonStr);
    } catch {
      logger.error({ analysisId, responseText: responseText.slice(0, 500) }, "Failed to parse AI response as JSON");
      await db
        .update(analysesTable)
        .set({ status: "failed" })
        .where(eq(analysesTable.id, analysisId));
      return;
    }

    // ── Build dimensions — robust, never crash on bad AI output ──
    const rawDimensions = Array.isArray(parsed.dimensions) ? parsed.dimensions : [];
    const parsedDimensions: DimensionScore[] = rawDimensions.map((d) => {
      const rawScore = typeof d.score === "number" && !isNaN(d.score) ? d.score : 50;
      const score = Math.min(100, Math.max(0, rawScore));
      return {
        name: typeof d.name === "string" && d.name ? d.name : "Unknown",
        score,
        maxScore: 100,
        grade: scoreToGrade(score),
        summary: typeof d.summary === "string" ? d.summary : "",
        issues: Array.isArray(d.issues) ? d.issues.filter((i) => typeof i === "string") : [],
        suggestions: Array.isArray(d.suggestions) ? d.suggestions.filter((s) => typeof s === "string") : [],
      };
    });

    // Pad to always have all 6 dimensions — prevents radar chart from breaking
    const dimensions = padDimensions(parsedDimensions);

    const overallScore =
      dimensions.length > 0
        ? Math.round(dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length)
        : 0;

    // ── Build recommendations ──
    const rawRecs = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
    const recommendations: Recommendation[] = rawRecs.map((r, i) => ({
      priority: typeof r.priority === "number" ? r.priority : i + 1,
      title: typeof r.title === "string" ? r.title : "Untitled",
      description: typeof r.description === "string" ? r.description : "",
      impact: (["high", "medium", "low"].includes(r.impact) ? r.impact : "medium") as "high" | "medium" | "low",
      effort: (["low", "medium", "high"].includes(r.effort) ? r.effort : "medium") as "low" | "medium" | "high",
      dimension: typeof r.dimension === "string" ? r.dimension : "",
      actionItems: Array.isArray(r.actionItems) ? r.actionItems.filter((a) => typeof a === "string") : [],
    }));

    // ── Score delta: compare to previous completed audit for same store ──
    const previousAudits = await db
      .select()
      .from(analysesTable)
      .where(eq(analysesTable.storeName, analysis.storeName))
      .orderBy(desc(analysesTable.completedAt))
      .limit(5);

    const previousCompleted = previousAudits.find(
      (a) => a.id !== analysisId && a.status === "completed" && a.overallScore !== null
    );
    const scoreDelta =
      previousCompleted && previousCompleted.overallScore !== null
        ? overallScore - previousCompleted.overallScore
        : null;

    // ── Save results ──
    await db
      .update(analysesTable)
      .set({
        status: "completed",
        overallScore,
        overallGrade: scoreToGrade(overallScore),
        aiPerception: typeof parsed.aiPerception === "string" ? parsed.aiPerception : "",
        dimensions: dimensions as unknown as Record<string, unknown>[],
        recommendations: recommendations as unknown as Record<string, unknown>[],
        perceptionGap: parsed.perceptionGap
          ? (parsed.perceptionGap as unknown as Record<string, unknown>)
          : null,
        scoreDelta,
        completedAt: new Date(),
      })
      .where(eq(analysesTable.id, analysisId));

    logger.info({ analysisId, overallScore, scoreDelta }, "Analysis completed successfully");
  } catch (err) {
    logger.error({ analysisId, err }, "Analysis failed");
    // Separate try/catch so a DB error here doesn't swallow the original error log
    try {
      await db
        .update(analysesTable)
        .set({ status: "failed" })
        .where(eq(analysesTable.id, analysisId));
    } catch (dbErr) {
      logger.error({ analysisId, dbErr }, "Failed to mark analysis as failed in DB");
    }
  }
}

// ── Stale analysis recovery ───────────────────────────────────────────────────
/**
 * Call this on a schedule (e.g. every 60s) to unstick analyses
 * that have been stuck in "analyzing" for more than 3 minutes.
 * Handles crashes, network timeouts, and process restarts.
 */
export async function unstickStaleAnalyses(): Promise<void> {
  const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
  const stale = await db
    .select()
    .from(analysesTable)
    .where(eq(analysesTable.status, "analyzing"));

  for (const a of stale) {
    if (a.createdAt < threeMinutesAgo) {
      logger.warn({ analysisId: a.id }, "Marking stale analysis as failed");
      await db
        .update(analysesTable)
        .set({ status: "failed" })
        .where(eq(analysesTable.id, a.id));
    }
  }
}