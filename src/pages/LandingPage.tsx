import { Link } from "react-router-dom";
import { Brain, Upload, Shield, Share2, BarChart3, Zap, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RetroGrid } from "@/components/ui/retro-grid";
import { Wordmark } from "@/components/brand/Wordmark";

const features = [
  {
    icon: Brain,
    title: "AI Search Readiness",
    description:
      "Grade every prospect's visibility in AI search engines like ChatGPT and Google AI Overviews. Know who's ready before you call.",
  },
  {
    icon: Upload,
    title: "Smart Import & Enrichment",
    description:
      "Paste from LinkedIn Sales Nav or upload a CSV. Auto-dedupe, auto-enrich industry and contacts — zero manual data entry.",
  },
  {
    icon: Shield,
    title: "Secure Google OAuth",
    description:
      "Enterprise-grade auth with Google single sign-on. Your data stays private with row-level security at the database level.",
  },
  {
    icon: Share2,
    title: "Share Anywhere",
    description:
      "Google Docs-style sharing. Generate a link, send it to your manager — anyone can view without logging in.",
  },
];

const secondaryFeatures = [
  {
    icon: BarChart3,
    title: "Prospect Scoring",
    description: "Automated 0-100 scoring with A+ through D grades based on locations, industry, and engagement.",
  },
  {
    icon: Zap,
    title: "Signals & Triggers",
    description: "AI-categorized buying signals from funding rounds, leadership changes, and expansion news.",
  },
  {
    icon: LayoutGrid,
    title: "Territory Views",
    description: "Table, Kanban, and Insights views with inline editing, bulk actions, and dark mode.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Wordmark className="text-xl" />
          <Link to="/auth">
            <Button variant="outline" size="sm">
              Sign In
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-24 md:py-36">
        <RetroGrid className="opacity-40" />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">
            <span className="gradient-text">AI-Powered</span>{" "}
            Territory Planning
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            The prospecting command center for modern AEs. Score prospects, track signals, enrich data, and share territories — all in one place.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link to="/auth?signup=true">
              <Button size="lg" className="px-8 text-base font-semibold">
                Get Started — Free
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="lg" className="px-8 text-base">
                See How It Works
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section id="features" className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-primary">
            Marquee Features
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center text-2xl font-bold md:text-3xl">
            Everything you need to own your territory
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="glass-card rounded-xl p-8 animate-fade-in-up"
                style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-bold">{f.title}</h3>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Secondary Features */}
      <section className="border-t border-border bg-secondary/30 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 md:grid-cols-3">
            {secondaryFeatures.map((f, i) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-card p-6 animate-fade-in-up"
                style={{ animationDelay: `${(i + 4) * 100}ms`, animationFillMode: "both" }}
              >
                <f.icon className="mb-3 h-5 w-5 text-primary" />
                <h3 className="mb-1 text-lg font-bold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-black md:text-4xl">
            Ready to plan smarter?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join your team and start managing your territory in minutes.
          </p>
          <Link to="/auth?signup=true">
            <Button size="lg" className="mt-8 px-10 text-base font-semibold">
              Create Your Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <p className="text-center text-sm text-muted-foreground">
          Built with Lovable · Territory Planner © {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
