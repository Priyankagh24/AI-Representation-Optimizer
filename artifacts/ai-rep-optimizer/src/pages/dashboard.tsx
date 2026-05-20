import { Layout } from "@/components/layout";
import { useGetAnalysesSummary, useListAnalyses } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Plus, CheckCircle2, Clock, AlertTriangle, Search,
  BarChart2, TrendingUp, Activity, TrendingDown, Minus, GitCompare,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend, Tooltip,
} from "recharts";


// ── Industry benchmarks ───────────────────────────────────────────────────────
const INDUSTRY_BENCHMARKS: Record<string, number> = {
  "fashion": 58,
  "apparel": 58,
  "clothing": 58,
  "streetwear": 58,
  "electronics": 62,
  "tech": 62,
  "home": 55,
  "furniture": 55,
  "food": 52,
  "coffee": 54,
  "beauty": 60,
  "skincare": 60,
  "health": 57,
  "sports": 56,
  "outdoor": 56,
  "toys": 53,
  "default": 57,
};

function getIndustryBenchmark(category?: string | null): number {
  if (!category) return INDUSTRY_BENCHMARKS.default;
  const key = category.toLowerCase();
  return (
    Object.entries(INDUSTRY_BENCHMARKS).find(([k]) => key.includes(k))?.[1] ??
    INDUSTRY_BENCHMARKS.default
  );
}


// ── Score delta badge ─────────────────────────────────────────────────────────
function ScoreDeltaBadge({ delta }: { delta: number | null | undefined }) {
  if (delta == null) return null;
  if (delta > 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
        <TrendingUp className="h-3 w-3" />+{delta}
      </span>
    );
  if (delta < 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-500">
        <TrendingDown className="h-3 w-3" />{delta}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Minus className="h-3 w-3" />0
    </span>
  );
}


// ── Competitor compare panel ──────────────────────────────────────────────────
function ComparePanel({
  analyses,
  compareIds,
  onClear,
}: {
  analyses: any[];
  compareIds: number[];
  onClear: () => void;
}) {
  if (compareIds.length !== 2) return null;

  const a1 = analyses.find((a) => a.id === compareIds[0]);
  const a2 = analyses.find((a) => a.id === compareIds[1]);
  if (!a1 || !a2) return null;

  const dims1: any[] = (a1.dimensions as any[]) || [];
  const dims2: any[] = (a2.dimensions as any[]) || [];

  const radarData = dims1.map((d, i) => ({
    subject: d.name
      .replace(" Quality", "")
      .replace(" Completeness", "")
      .replace(" Strength", "")
      .replace(" Coverage", "")
      .replace(" Clarity", ""),
    [a1.storeName]: d.score,
    [a2.storeName]: dims2[i]?.score ?? 0,
  }));

  const score1 = a1.overallScore ?? 0;
  const score2 = a2.overallScore ?? 0;
  const winner = score1 > score2 ? a1.storeName : score2 > score1 ? a2.storeName : null;

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <GitCompare className="h-4 w-4 text-primary" />
          Comparing: {a1.storeName} vs {a2.storeName}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onClear} className="cursor-pointer">
          Clear
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score summary */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className={`text-3xl font-bold ${score1 >= score2 ? "text-primary" : "text-muted-foreground"}`}>
              {score1}
            </div>
            <div className="text-xs text-muted-foreground truncate">{a1.storeName}</div>
            <div className="text-xs font-medium text-muted-foreground">{a1.overallGrade ?? "--"}</div>
          </div>
          <div className="flex items-center justify-center">
            <span className="text-sm font-bold text-muted-foreground">VS</span>
          </div>
          <div className="space-y-1">
            <div className={`text-3xl font-bold ${score2 >= score1 ? "text-emerald-600" : "text-muted-foreground"}`}>
              {score2}
            </div>
            <div className="text-xs text-muted-foreground truncate">{a2.storeName}</div>
            <div className="text-xs font-medium text-muted-foreground">{a2.overallGrade ?? "--"}</div>
          </div>
        </div>

        {winner && (
          <div className="text-center text-xs font-medium text-emerald-700 bg-emerald-50 py-1.5 rounded-md border border-emerald-200">
            {winner} scores higher by {Math.abs(score1 - score2)} points
          </div>
        )}

        {/* Radar */}
        {radarData.length > 0 && (
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
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
              />
              <Radar
                name={a1.storeName}
                dataKey={a1.storeName}
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.2}
                strokeWidth={2}
              />
              <Radar
                name={a2.storeName}
                dataKey={a2.storeName}
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.2}
                strokeWidth={2}
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}


// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { data: summary, isLoading: isSummaryLoading } = useGetAnalysesSummary();
  const { data: analyses, isLoading: isAnalysesLoading } = useListAnalyses();
  const [search, setSearch] = useState("");
  const [compareIds, setCompareIds] = useState<number[]>([]);

  const filtered = useMemo(() => {
    if (!analyses) return [];
    if (!search.trim()) return analyses;
    const q = search.toLowerCase();
    return analyses.filter(
      (a) =>
        a.storeName.toLowerCase().includes(q) ||
        (a.storeUrl && a.storeUrl.toLowerCase().includes(q))
    );
  }, [analyses, search]);

  // Industry benchmark — use first audited category
  const categories = analyses
    ?.filter((a) => (a as any).category)
    .map((a) => (a as any).category as string) ?? [];
  const topCategory = categories[0] ?? null;
  const benchmark = getIndustryBenchmark(topCategory);

  function toggleCompare(id: number) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length < 2) return [...prev, id];
      // Replace oldest selection
      return [prev[1], id];
    });
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-0 font-medium hover:bg-emerald-50">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
          </Badge>
        );
      case "analyzing":
        return (
          <Badge className="bg-blue-50 text-blue-700 border-0 font-medium hover:bg-blue-50">
            <Activity className="h-3 w-3 mr-1 animate-pulse" /> Analyzing
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-50 text-amber-700 border-0 font-medium hover:bg-amber-50">
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-50 text-red-700 border-0 font-medium hover:bg-red-50">
            <AlertTriangle className="h-3 w-3 mr-1" /> Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-8">

        {/* ── Page header ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Overview of all your AI representation audits
            </p>
          </div>
          <Link href="/audit/new" onClick={() => window.scrollTo(0, 0)}>
            <Button className="font-medium cursor-pointer">
              <Plus className="mr-2 h-4 w-4" /> New Audit
            </Button>
          </Link>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-2 pt-5 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Audits</CardTitle>
                <BarChart2 className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {isSummaryLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold">{summary?.totalAnalyses || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="pb-2 pt-5 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {isSummaryLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold text-emerald-600">
                  {summary?.completedAnalyses || 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="pb-2 pt-5 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {isSummaryLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div>
                  <div className="text-3xl font-bold">
                    {summary?.averageScore ? Math.round(summary.averageScore) : "--"}
                  </div>
                  {summary?.averageScore && (
                    <div
                      className={`text-xs mt-1 ${
                        summary.averageScore >= benchmark ? "text-emerald-600" : "text-amber-600"
                      }`}
                    >
                      Industry avg: {benchmark}{" "}
                      {summary.averageScore >= benchmark ? "▲ Above" : "▼ Below"}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="pb-2 pt-5 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Industry Benchmark
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="text-3xl font-bold">{benchmark}</div>
              <div className="text-xs text-muted-foreground mt-1 truncate">
                {topCategory ? `${topCategory} avg` : "General avg"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Compare hint ── */}
        {compareIds.length === 1 && (
          <div className="text-xs text-muted-foreground bg-muted/40 border rounded-lg px-4 py-2 flex items-center gap-2">
            <GitCompare className="h-3.5 w-3.5 text-primary shrink-0" />
            Select one more completed audit to compare side-by-side.
          </div>
        )}

        {/* ── Competitor compare panel ── */}
        <ComparePanel
          analyses={analyses ?? []}
          compareIds={compareIds}
          onClear={() => setCompareIds([])}
        />

        {/* ── Audit table ── */}
        <Card className="border shadow-sm">
          <div className="p-4 border-b flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-base">All Audits</h2>
              {compareIds.length > 0 && (
                <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                  {compareIds.length}/2 selected for compare
                </span>
              )}
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by store..."
                className="pl-9 h-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 text-xs font-medium text-muted-foreground">
                  <span title="Select to compare">⇄</span>
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Store</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Score</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">vs Industry</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Change</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Date</TableHead>
                <TableHead className="text-right text-xs font-medium text-muted-foreground">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isAnalysesLoading ? (
                Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <TableRow key={i}>
                      {Array(8)
                        .fill(0)
                        .map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-5 w-20" />
                          </TableCell>
                        ))}
                    </TableRow>
                  ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-40 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <BarChart2 className="h-8 w-8 opacity-30" />
                      <span className="text-sm">
                        {search ? "No audits match your search." : "No audits yet. Run your first one!"}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((analysis) => {
                  const cat = (analysis as any).category;
                  const bench = getIndustryBenchmark(cat);
                  const score = analysis.overallScore;
                  const vsIndustry = score != null ? score - bench : null;
                  const delta = (analysis as any).scoreDelta as number | null;
                  const isCompleted = analysis.status === "completed";
                  const isSelected = compareIds.includes(analysis.id);

                  return (
                    <TableRow
                      key={analysis.id}
                      className={`group ${isSelected ? "bg-primary/5" : ""}`}
                    >
                      {/* Compare checkbox */}
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleCompare(analysis.id)}
                          disabled={!isCompleted}
                          title={isCompleted ? "Select to compare" : "Only completed audits can be compared"}
                          className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-30 accent-primary"
                        />
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{analysis.storeName}</span>
                          {analysis.storeUrl && (
                            <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                              {analysis.storeUrl}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>{getStatusBadge(analysis.status)}</TableCell>

                      <TableCell>
                        <span className="font-semibold">{score != null ? score : "--"}</span>
                      </TableCell>

                      <TableCell>
                        {vsIndustry != null ? (
                          <span
                            className={`text-xs font-medium ${
                              vsIndustry >= 0 ? "text-emerald-600" : "text-red-500"
                            }`}
                          >
                            {vsIndustry >= 0 ? "+" : ""}
                            {vsIndustry} vs avg
                          </span>
                        ) : (
                          "--"
                        )}
                      </TableCell>

                      <TableCell>
                        <ScoreDeltaBadge delta={delta} />
                      </TableCell>

                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(analysis.createdAt).toLocaleDateString()}
                      </TableCell>

                      <TableCell className="text-right">
                        <Link href={`/audit/${analysis.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>

      </div>
    </Layout>
  );
}