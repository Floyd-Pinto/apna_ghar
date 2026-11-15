import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Camera,
  FileLock2,
  Link2,
  MapPin,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LoginDialog from "@/components/LoginDialog";
import RegisterDialog from "@/components/RegisterDialog";
import ProjectCard, { ProjectCardSkeleton } from "@/components/ProjectCard";
import { useToast } from "@/hooks/use-toast";
import { useSavedProjects } from "@/hooks/useSavedProjects";
import { API_BASE_URL } from "@/lib/config";
import type { ProjectSummary } from "@/types/project";
import { useAuth } from "../contexts/AuthContext";

const POPULAR_CITIES = ["Mumbai", "Bangalore", "Pune", "Delhi", "Hyderabad"];

const features = [
  {
    icon: Camera,
    title: "Geotagged site updates",
    body: "Builders post construction progress straight from the site camera. Every photo carries GPS and a timestamp, and gallery uploads are blocked.",
  },
  {
    icon: Link2,
    title: "Anchored on Hyperledger Fabric",
    body: "Milestones, documents and unit records are written to a permissioned blockchain, so the history can't be quietly rewritten.",
  },
  {
    icon: FileLock2,
    title: "Documents on IPFS",
    body: "Approvals and agreements are pinned to IPFS and checked with SHA-256 hashes, so you can verify you're reading the original file.",
  },
  {
    icon: Bot,
    title: "Ask the AI assistant",
    body: "Questions about a project, builder or legal document get answered from the actual records, not marketing copy.",
  },
];

const steps = [
  { title: "Browse verified projects", body: "Filter by city, budget and status. Each listing shows its verification state." },
  { title: "Follow construction live", body: "Track milestones and site photos, each one backed by an on-chain record." },
  { title: "Book with confidence", body: "Reserve a unit, pay through Razorpay and keep every receipt in your dashboard." },
];

const Homepage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { savedIds, toggleSaved } = useSavedProjects();
  const [searchQuery, setSearchQuery] = useState("");
  const [featuredProjects, setFeaturedProjects] = useState<ProjectSummary[]>([]);
  const [totalProjects, setTotalProjects] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const ordering = isAuthenticated ? "-views_count" : "popular";
    const pageSize = isAuthenticated ? 6 : 3;

    setLoading(true);
    fetch(`${API_BASE_URL}/api/projects/projects/?ordering=${ordering}&page_size=${pageSize}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => {
        const projects: ProjectSummary[] = data.results ?? data;
        setFeaturedProjects(projects.slice(0, pageSize));
        // Paginated responses include the total; plain lists don't
        setTotalProjects(typeof data.count === "number" ? data.count : projects.length);
      })
      .catch((err) => {
        if (err.name !== "AbortError") console.error("Error fetching featured projects:", err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [isAuthenticated]);

  const goToSearch = (query: string) => {
    if (!isAuthenticated) {
      setLoginDialogOpen(true);
      return;
    }
    const params = new URLSearchParams();
    if (query.trim()) params.set("search", query.trim());
    navigate(`/explore-projects${params.toString() ? `?${params}` : ""}`);
  };

  const handleToggleSave = (projectId: string) =>
    toggleSaved(projectId).catch(() =>
      toast({ title: "Couldn't update saved projects", variant: "destructive" }),
    );

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-grid" aria-hidden />
        <div className="container relative py-16 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-3xl text-center animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Every construction update is recorded on-chain
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] sm:text-5xl lg:text-6xl">
              Buy property you can <span className="gradient-text">actually verify</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              ApnaGhar shows you geotagged, timestamped proof of construction for every project, backed by a
              blockchain ledger and documents you can check yourself.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                goToSearch(searchQuery);
              }}
              className="mx-auto mt-8 flex max-w-xl flex-col gap-2 rounded-xl border border-border bg-card p-2 shadow-elevated sm:flex-row"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="City, locality, builder or project"
                  className="h-11 w-full rounded-lg bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground"
                  aria-label="Search projects"
                />
              </div>
              <Button type="submit" size="lg" className="h-11">
                Search projects
              </Button>
            </form>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="text-muted-foreground">Popular:</span>
              {POPULAR_CITIES.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => goToSearch(city)}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <MapPin className="h-3 w-3" /> {city}
                </button>
              ))}
            </div>
          </div>

          <dl className="mx-auto mt-14 grid max-w-3xl grid-cols-3 divide-x divide-border rounded-xl border border-border bg-card shadow-card">
            {[
              { label: "Listed projects", value: totalProjects === null ? "—" : totalProjects.toLocaleString("en-IN") },
              { label: "Records on-chain", value: "100%" },
              { label: "AI assistant", value: "24/7" },
            ].map((stat) => (
              <div key={stat.label} className="px-3 py-5 text-center sm:px-6">
                <dt className="text-xs text-muted-foreground sm:text-sm">{stat.label}</dt>
                <dd className="mt-1 font-display text-xl font-bold sm:text-3xl">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Features */}
      <section className="container py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-primary">Why ApnaGhar</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Transparency built into every step</h2>
          <p className="mt-4 text-muted-foreground">
            Delayed and misrepresented projects happen when buyers can't see what's going on. We make every
            update provable.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-6 shadow-card">
              <span className="icon-chip">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured projects */}
      <section className="border-y border-border bg-card/50">
        <div className="container py-16 sm:py-20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">
                {isAuthenticated ? "Trending now" : "Top reviewed"}
              </p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                {isAuthenticated ? "Featured verified projects" : "Projects buyers love"}
              </h2>
            </div>
            {isAuthenticated && (
              <Button asChild variant="outline">
                <Link to="/explore-projects">
                  View all projects <ArrowRight />
                </Link>
              </Button>
            )}
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              Array.from({ length: isAuthenticated ? 6 : 3 }).map((_, i) => <ProjectCardSkeleton key={i} />)
            ) : featuredProjects.length > 0 ? (
              featuredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  saved={savedIds.has(project.id)}
                  onToggleSave={isAuthenticated ? handleToggleSave : undefined}
                />
              ))
            ) : (
              <div className="col-span-full rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
                No projects to show yet.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container py-16 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-primary">How it works</p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">From first look to keys in hand</h2>
            <p className="mt-4 text-muted-foreground">
              Builders get a simple dashboard to publish verified progress. Buyers get one place to research,
              book, pay and keep track of everything.
            </p>
          </div>
          <ol className="space-y-4">
            {steps.map((step, i) => (
              <li key={step.title} className="flex gap-4 rounded-xl border border-border bg-card p-5 shadow-card">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-16 sm:pb-24">
        <div className="relative overflow-hidden rounded-2xl bg-primary px-6 py-12 text-center text-primary-foreground sm:px-12 sm:py-16">
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{ background: "radial-gradient(60% 80% at 50% 0%, white, transparent 70%)" }}
            aria-hidden
          />
          <div className="relative mx-auto max-w-2xl">
            <BadgeCheck className="mx-auto h-10 w-10 opacity-90" />
            <h2 className="mt-4 text-3xl font-bold text-primary-foreground sm:text-4xl">
              Start with projects you can trust
            </h2>
            <p className="mt-3 opacity-90">
              Create a free account to save projects, follow construction and book units.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              {isAuthenticated ? (
                <Button asChild size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
                  <Link to="/explore-projects">
                    Browse projects <ArrowRight />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    variant="secondary"
                    className="bg-white text-primary hover:bg-white/90"
                    onClick={() => setRegisterDialogOpen(true)}
                  >
                    Create free account
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    className="text-primary-foreground ring-1 ring-inset ring-white/40 hover:bg-white/10 hover:text-primary-foreground"
                    onClick={() => setLoginDialogOpen(true)}
                  >
                    I already have an account
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <LoginDialog
        open={loginDialogOpen}
        onOpenChange={setLoginDialogOpen}
        onSwitchToRegister={() => {
          setLoginDialogOpen(false);
          setRegisterDialogOpen(true);
        }}
      />
      <RegisterDialog
        open={registerDialogOpen}
        onOpenChange={setRegisterDialogOpen}
        onSwitchToLogin={() => {
          setRegisterDialogOpen(false);
          setLoginDialogOpen(true);
        }}
      />
    </div>
  );
};

export default Homepage;
