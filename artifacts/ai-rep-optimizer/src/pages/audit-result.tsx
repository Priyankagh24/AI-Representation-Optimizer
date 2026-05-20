import { Layout } from "@/components/layout";
import { useGetAnalysis, useGetAnalysisReport, getGetAnalysisQueryKey } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle, Download, ArrowRight, BrainCircuit, Activity,
  AlertTriangle, Target, CheckCircle2, Loader2, TrendingUp,
  TrendingDown, Minus, Lightbulb, Eye, GitCompare,
  MessageCircle, Send, X, Bot, User, Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine,
} from "recharts";


// ── Radar Chart ──────────────────────────────────────────────────────────────
function DimensionRadar({ dimensions }: { dimensions: Array<{ name: string; score: number; maxScore: number }> }) {
  const data = dimensions.map((d) => ({
    subject: d.name
      .replace(" & ", " &\n")
      .replace(" Quality", "")
      .replace(" Completeness", "")
      .replace(" Strength", "")
      .replace(" Coverage", "")
      .replace(" Clarity", ""),
    score: d.score,
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(v: number) => [`${v}/100`, "Score"]}
        />
        <Radar
          name="Score"
          dataKey="score"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary))"
          fillOpacity={0.2}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}


// ── Perception Gap Panel ─────────────────────────────────────────────────────
function PerceptionGapPanel({
  merchantIntent,
  aiPerception,
  gap,
}: {
  merchantIntent?: string | null;
  aiPerception?: string | null;
  gap?: {
    missingConcepts: string[];
    presentConcepts: string[];
    gapSummary: string;
    improvedDescription: string;
  } | null;
}) {
  if (!gap && !merchantIntent) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold border-b pb-3 flex items-center gap-2">
        <GitCompare className="h-5 w-5 text-primary" />
        Perception Gap Analysis
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Merchant intent */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              How You Want to Be Perceived
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground/80 leading-relaxed italic">
              {merchantIntent || "No target perception provided."}
            </p>
            {gap?.presentConcepts && gap.presentConcepts.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-emerald-600 mb-2">✓ AI currently picks up</p>
                <div className="flex flex-wrap gap-1.5">
                  {gap.presentConcepts.map((c, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI perception */}
        <Card className="border shadow-sm border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Eye className="h-4 w-4 text-amber-500" />
              How AI Actually Perceives You
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {aiPerception || "No perception generated."}
            </p>
            {gap?.missingConcepts && gap.missingConcepts.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-red-600 mb-2">✗ Missing from AI perception</p>
                <div className="flex flex-wrap gap-1.5">
                  {gap.missingConcepts.map((c, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-700 border border-red-200">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gap summary */}
      {gap?.gapSummary && (
        <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/50 flex gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-foreground/80">{gap.gapSummary}</p>
        </div>
      )}

      {/* Improved description */}
      {gap?.improvedDescription && (
        <Card className="border shadow-sm border-emerald-200 bg-emerald-50/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-emerald-600" />
              AI-Generated Fix — Use This Instead
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground/80 leading-relaxed italic border-l-2 border-emerald-400 pl-3">
              "{gap.improvedDescription}"
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              Copy this rewritten content into your store to close the most critical perception gap.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


// ── Score Delta Badge ─────────────────────────────────────────────────────────
function ScoreDelta({ delta }: { delta: number | null | undefined }) {
  if (delta == null) return null;
  if (delta > 0) return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
      <TrendingUp className="h-3 w-3" /> +{delta} since last audit
    </span>
  );
  if (delta < 0) return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
      <TrendingDown className="h-3 w-3" /> {delta} since last audit
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
      <Minus className="h-3 w-3" /> No change since last audit
    </span>
  );
}


// ── Score History Chart ───────────────────────────────────────────────────────
function ScoreHistoryChart({ analysisId }: { analysisId: number }) {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/analyses/${analysisId}/history`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setHistory(data);
      })
      .catch(() => {});
  }, [analysisId]);

  if (history.length < 2) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold border-b pb-3 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        Score History
      </h2>
      <Card className="border shadow-sm">
        <CardContent className="pt-4">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(v: number) => [`${v}/100`, "Score"]}
              />
              <ReferenceLine
                y={57}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                label={{ value: "Industry avg", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "hsl(var(--primary))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}


// ── Query Simulator ───────────────────────────────────────────────────────────
function QuerySimulator({ analysisId }: { analysisId: number }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const presets = [
    "find me a sustainable option in this category",
    "what's their shipping and return policy?",
    "is this store trustworthy?",
  ];

  async function simulate(q: string) {
    const question = q || query;
    if (!question.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await fetch(`/api/analyses/${analysisId}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: question }),
      });
      const data = await r.json();
      setResult(data);
    } catch {
      setResult({ error: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold border-b pb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        AI Query Simulator
        <span className="text-xs font-normal text-muted-foreground ml-1">
          — See what AI agents actually say about you
        </span>
      </h2>

      {/* Preset chips */}
      <div className="flex gap-2 flex-wrap">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => simulate(p)}
            className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/5 cursor-pointer transition-colors"
          >
            "{p}"
          </button>
        ))}
      </div>

      {/* Custom query input */}
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && simulate(query)}
          placeholder='Type a customer query, e.g. "best eco-friendly sneakers under $100"'
          className="flex-1 text-sm border rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary/30 bg-background"
        />
        <Button
          onClick={() => simulate(query)}
          disabled={loading || !query.trim()}
          size="sm"
          className="cursor-pointer shrink-0"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simulate"}
        </Button>
      </div>

      {/* Result */}
      {result && !result.error && (
        <Card className={`border shadow-sm ${result.wouldRecommend ? "border-emerald-200 bg-emerald-50/20" : "border-red-200 bg-red-50/20"}`}>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className={`text-sm font-semibold ${result.wouldRecommend ? "text-emerald-700" : "text-red-700"}`}>
                {result.wouldRecommend ? "✓ AI would recommend you" : "✗ AI would NOT recommend you"}
              </span>
              <Badge variant="outline" className="text-xs capitalize">{result.confidence} confidence</Badge>
            </div>

            <div className="p-3 rounded-lg bg-background border text-sm italic text-foreground/80">
              "{result.agentResponse}"
              <div className="text-xs text-muted-foreground mt-1 not-italic">
                — Simulated AI shopping agent response
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">{result.whyOrWhyNot}</p>

            {result.missingSignals?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs font-medium text-red-600">Missing signals:</span>
                {result.missingSignals.map((s: string, i: number) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {result?.error && (
        <p className="text-xs text-red-500">Simulation failed. Please try again.</p>
      )}
    </div>
  );
}


// ── Audit Chat ────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function AuditChat({ analysis }: { analysis: any }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Hi! I'm your audit assistant for **${analysis.storeName}**. Your AI-readiness score is **${analysis.overallScore}/100** (Grade ${analysis.overallGrade}). Ask me anything about your results — like "what's my biggest gap?" or "write me a better product description".`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const auditContext = JSON.stringify({
    storeName: analysis.storeName,
    overallScore: analysis.overallScore,
    overallGrade: analysis.overallGrade,
    aiPerception: analysis.aiPerception,
    dimensions: analysis.dimensions,
    recommendations: analysis.recommendations,
    perceptionGap: analysis.perceptionGap,
    merchantIntent: analysis.merchantIntent,
    category: analysis.category,
  });

  async function sendMessage(overrideText?: string) {
    const userMsg = (overrideText ?? input).trim();
    if (!userMsg || loading) return;
    setInput("");
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: userMsg }];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const response = await fetch("/api/audit-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auditContext,
          messages: nextMessages,
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error ${response.status}`);
      }
      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply || "No response." }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Sorry, something went wrong: ${err?.message || "Please try again."}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // Floating bubble when closed
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-full shadow-lg hover:opacity-90 transition-opacity font-medium text-sm cursor-pointer"
      >
        <MessageCircle className="h-5 w-5" />
        Ask your audit
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] flex flex-col bg-background border rounded-2xl shadow-2xl overflow-hidden" style={{ maxHeight: "560px" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4" />
          <span className="font-semibold text-sm">Audit Assistant</span>
        </div>
        <button onClick={() => setOpen(false)} className="opacity-80 hover:opacity-100 cursor-pointer">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "380px" }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-muted text-foreground rounded-bl-sm"
            }`}>
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
                <User className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="h-3.5 w-3.5 text-primary animate-pulse" />
            </div>
            <div className="bg-muted px-3 py-2 rounded-xl text-sm text-muted-foreground">Thinking...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts — only show on first message */}
      {messages.length === 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
          {["What's my biggest gap?", "Write a better description", "What would AI say about me?"].map((p) => (
            <button
              key={p}
              onClick={() => sendMessage(p)}
              className="text-xs px-2.5 py-1 rounded-full border border-primary/30 text-primary hover:bg-primary/5 cursor-pointer transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="p-3 border-t flex gap-2 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask anything about your audit..."
          className="flex-1 text-sm bg-muted rounded-lg px-3 py-2 outline-none border border-transparent focus:border-primary/30 transition-colors"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="h-9 w-9 flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}


// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AuditResult() {
  const { id } = useParams();
  const numericId = parseInt(id || "0", 10);
  const queryClient = useQueryClient();

  const { data: analysis, isLoading, error } = useGetAnalysis(numericId, {
    query: { enabled: !!numericId, queryKey: getGetAnalysisQueryKey(numericId) },
  });

  const { refetch: fetchReport, isFetching: isDownloading } = useGetAnalysisReport(numericId, {
    query: { enabled: false },
  });

  const isProcessing = analysis?.status === "pending" || analysis?.status === "analyzing";

  useEffect(() => {
    if (!numericId || !isProcessing) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: getGetAnalysisQueryKey(numericId) });
    }, 3000);
    return () => clearInterval(interval);
  }, [numericId, isProcessing, queryClient]);

  const handleDownload = async () => {
    const { data: report } = await fetchReport();
    if (report?.markdown) {
      const blob = new Blob([report.markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ai-audit-${analysis?.storeName || "report"}-${new Date().toISOString().split("T")[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-emerald-600";
    if (score >= 50) return "text-amber-600";
    return "text-red-600";
  };

  // ── Loading ──
  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6 animate-pulse">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-56 w-full md:col-span-2" />
          </div>
        </div>
      </Layout>
    );
  }

  // ── Error ──
  if (error || !analysis) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Could not load audit</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            Unable to retrieve this audit. It may have been deleted or the ID is invalid.
          </p>
        </div>
      </Layout>
    );
  }

  // ── Processing ──
  if (isProcessing) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-xl mx-auto space-y-8 text-center">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <BrainCircuit className="h-10 w-10 text-primary animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">
              {analysis.status === "pending" ? "Initializing Audit" : "Analyzing Your Store"}
            </h2>
            <p className="text-muted-foreground text-sm">
              AI engine is analyzing{" "}
              <span className="font-medium text-foreground">{analysis.storeName}</span>.
              This typically takes 30–60 seconds.
            </p>
          </div>
          <div className="w-full space-y-2">
            <Progress value={analysis.status === "pending" ? 20 : 65} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{analysis.status === "pending" ? "Setting up context..." : "Processing content signals..."}</span>
              <span className="text-primary font-medium animate-pulse">In progress</span>
            </div>
          </div>
          <div className="w-full bg-muted/50 rounded-xl p-4 text-left space-y-2 border">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Analysis Log</div>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Connecting to inference engine
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Loading store context: {analysis.storeName}
            </div>
            {analysis.status === "analyzing" && (
              <>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Parsing unstructured content
                </div>
                <div className="text-sm text-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-primary shrink-0 animate-spin" /> Generating AI representation matrix...
                </div>
              </>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  // ── Failed ──
  if (analysis.status === "failed") {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Analysis Failed</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            The AI engine encountered an error while processing this store. Please try running a new audit.
          </p>
          <Button variant="outline" onClick={() => (window.location.href = "/audit/new")}>
            Try Again
          </Button>
        </div>
      </Layout>
    );
  }

  const perceptionGap = (analysis as any).perceptionGap as {
    missingConcepts: string[];
    presentConcepts: string[];
    gapSummary: string;
    improvedDescription: string;
  } | null;

  const scoreDelta = (analysis as any).scoreDelta as number | null;

  return (
    <Layout>
      <div className="space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge className="bg-emerald-50 text-emerald-700 border-0 font-medium">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Report Ready
              </Badge>
              <span className="text-xs text-muted-foreground">
                ID #{analysis.id.toString().padStart(5, "0")}
              </span>
              <ScoreDelta delta={scoreDelta} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{analysis.storeName}</h1>
            {analysis.storeUrl && (
              <a
                href={analysis.storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline text-sm mt-1 block"
              >
                {analysis.storeUrl}
              </a>
            )}
          </div>
          <Button onClick={handleDownload} disabled={isDownloading} variant="outline" className="font-medium cursor-pointer">
            {isDownloading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
            ) : (
              <><Download className="mr-2 h-4 w-4" /> Download Report</>
            )}
          </Button>
        </div>

        {/* ── Score + Radar ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border shadow-sm flex flex-col justify-center items-center py-10">
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
              AI Readiness Score
            </div>
            <div className={`text-7xl font-extrabold tracking-tighter ${getScoreColor(analysis.overallScore || 0)}`}>
              {analysis.overallScore}
            </div>
            <div className="text-sm text-muted-foreground mt-1">out of 100</div>
            <div className="mt-5 px-6 py-2 rounded-full bg-primary/10 text-primary font-bold text-lg">
              Grade {analysis.overallGrade}
            </div>
            {scoreDelta != null && (
              <div className="mt-4">
                <ScoreDelta delta={scoreDelta} />
              </div>
            )}
          </Card>

          <Card className="border shadow-sm md:col-span-2">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Dimension Radar
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {analysis.dimensions && analysis.dimensions.length > 0 ? (
                <DimensionRadar dimensions={analysis.dimensions as any} />
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">No dimension data available.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Score History ── */}
        <ScoreHistoryChart analysisId={analysis.id} />

        {/* ── Perception Gap ── */}
        <PerceptionGapPanel
          merchantIntent={analysis.merchantIntent}
          aiPerception={analysis.aiPerception}
          gap={perceptionGap}
        />

        {/* ── Query Simulator ── */}
        <QuerySimulator analysisId={analysis.id} />

        {/* ── Dimensional Analysis ── */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-3 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Dimensional Analysis
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.dimensions?.map((dim, i) => (
              <Card key={i} className="border shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-semibold">{dim.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-base ${getScoreColor((dim.score / dim.maxScore) * 100)}`}>
                        {dim.score}/{dim.maxScore}
                      </span>
                      <span className="inline-flex w-7 h-7 items-center justify-center rounded-md bg-primary/10 text-primary font-bold text-sm">
                        {dim.grade}
                      </span>
                    </div>
                  </div>
                  <Progress value={(dim.score / dim.maxScore) * 100} className="h-1.5 mt-2" />
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{dim.summary}</p>
                  {dim.issues && dim.issues.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Identified Issues
                      </div>
                      <ul className="text-xs space-y-1.5">
                        {dim.issues.map((issue, j) => (
                          <li key={j} className="flex items-start gap-2">
                            <span className="text-red-400 mt-0.5 shrink-0">•</span>
                            <span className="text-foreground/80">{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {dim.suggestions && dim.suggestions.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-primary mb-2 flex items-center gap-1">
                        <ArrowRight className="h-3 w-3" /> Opportunities
                      </div>
                      <ul className="text-xs space-y-1.5">
                        {dim.suggestions.map((s, j) => (
                          <li key={j} className="flex items-start gap-2">
                            <span className="text-primary mt-0.5 shrink-0">→</span>
                            <span className="text-foreground/80">{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Recommendations ── */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Prioritized Action Plan
          </h2>
          <div className="space-y-4">
            {analysis.recommendations?.map((rec, i) => (
              <Card key={i} className="border shadow-sm overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  <div className="bg-muted/40 p-5 md:w-56 border-b md:border-b-0 md:border-r flex flex-col gap-3">
                    <div className="text-xs font-semibold text-muted-foreground">Priority #{rec.priority}</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Impact</span>
                        <Badge className={`text-xs border-0 font-medium ${
                          rec.impact === "high" ? "bg-emerald-50 text-emerald-700" :
                          rec.impact === "medium" ? "bg-amber-50 text-amber-700" :
                          "bg-muted text-muted-foreground"
                        }`}>{rec.impact}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Effort</span>
                        <Badge className={`text-xs border-0 font-medium ${
                          rec.effort === "low" ? "bg-emerald-50 text-emerald-700" :
                          rec.effort === "medium" ? "bg-amber-50 text-amber-700" :
                          "bg-red-50 text-red-700"
                        }`}>{rec.effort}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{rec.dimension}</Badge>
                      <h3 className="font-semibold text-sm">{rec.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{rec.description}</p>
                    {rec.actionItems && rec.actionItems.length > 0 && (
                      <div className="space-y-2 bg-muted/30 p-4 rounded-lg border">
                        <div className="text-xs font-semibold text-foreground">Action Steps</div>
                        <ul className="text-sm space-y-2">
                          {rec.actionItems.map((item, j) => (
                            <li key={j} className="flex items-start gap-2">
                              <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              <span className="text-foreground/90">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

      </div>

      {/* ── Floating Chat ── */}
      <AuditChat analysis={analysis} />

    </Layout>
  );
}