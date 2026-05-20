import { Layout } from "@/components/layout";
import { useGetAnalysesSummary } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart2, ShieldCheck, Target, Zap, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const { data: summary, isLoading } = useGetAnalysesSummary();

  return (
    <Layout>
      <div className="flex flex-col gap-16 py-8">
        {/* Hero */}
        <div className="flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto">
          <Badge variant="secondary" className="px-3 py-1 text-sm font-medium text-primary bg-primary/10 border-0 rounded-full">
            <Zap className="mr-1.5 h-3.5 w-3.5" />
            AI Commerce Intelligence
          </Badge>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
            Control How AI Shopping Agents{" "}
            <span className="text-primary">Perceive Your Store</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            Search is fundamentally changing. AI agents are replacing traditional search engines. Discover exactly how AI perceives your products, identify blind spots, and optimize your representation.
          </p>

         <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link href="/audit/new" onClick={() => window.scrollTo(0, 0)}>
              <Button size="lg" className="h-12 px-8 text-base font-semibold cursor-pointer">
                Start Your Audit
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/dashboard" onClick={() => window.scrollTo(0, 0)}>
              <Button variant="outline" size="lg" className="h-12 px-8 text-base font-medium cursor-pointer">
                View Dashboard
              </Button>
            </Link>
          </div>

          {!isLoading && summary && (
            <p className="text-sm text-muted-foreground">
              {summary.totalAnalyses} store{summary.totalAnalyses !== 1 ? 's' : ''} analyzed so far
            </p>
          )}
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full">
          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg font-semibold">Precision Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We analyze your entire store footprint to understand the precise data signals you are sending to LLMs.
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg font-semibold">Brand Authority</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ensure your brand is positioned as the authoritative answer for specific shopping queries.
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <BarChart2 className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg font-semibold">Actionable Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Get prioritized, high-impact recommendations to improve your AI discoverability instantly.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent analyses */}
        <div className="max-w-5xl mx-auto w-full">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-foreground">Recent Analyses</h2>
            {summary && (
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-primary text-sm font-medium cursor-pointer">
                  View all <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : summary?.recentAnalyses && summary.recentAnalyses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {summary.recentAnalyses.map(analysis => (
                <Link key={analysis.id} href={`/audit/${analysis.id}`}>
                  <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-medium text-foreground truncate">{analysis.storeName}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {new Date(analysis.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0 ml-3">
                        {analysis.status === 'completed' ? (
                          <>
                            <div className="text-lg font-bold text-primary">{analysis.overallScore}/100</div>
                            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0 mt-0.5">
                              Grade {analysis.overallGrade}
                            </Badge>
                          </>
                        ) : (
                          <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-0 capitalize">
                            {analysis.status}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
              <BarChart2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No analyses yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Run your first audit to get started</p>
              <Link href="/audit/new">
                <Button size="sm" className="mt-4">Start First Audit</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}