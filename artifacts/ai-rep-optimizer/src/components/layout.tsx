import { Link, useLocation } from "wouter";
import { BrainCircuit, Plus, LayoutDashboard } from "lucide-react";
import { Button } from "./ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <BrainCircuit className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-base text-foreground">AI Rep Optimizer</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link href="/dashboard">
                <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  location === '/dashboard'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}>
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </span>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/audit/new">
              <Button size="sm" className="h-9 px-4 text-sm font-medium">
                <Plus className="mr-1.5 h-4 w-4" />
                New Audit
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto py-8 px-4 md:px-8">
        {children}
      </main>

      <footer className="border-t bg-white">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 py-6 md:h-14 md:py-0 md:flex-row px-4 md:px-8">
          <p className="text-sm text-muted-foreground">
            AI Representation Optimizer
          </p>
          <p className="text-sm text-muted-foreground">v1.0.0</p>
        </div>
      </footer>
    </div>
  );
}