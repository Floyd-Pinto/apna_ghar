import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-hero-glow" aria-hidden />
      <div className="relative max-w-md text-center">
        <span className="icon-chip mx-auto h-12 w-12">
          <Compass className="h-6 w-6" />
        </span>
        <p className="mt-6 font-display text-sm font-semibold text-primary">404</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Page not found</h1>
        <p className="mt-3 text-muted-foreground">
          We couldn't find <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{location.pathname}</code>. It may
          have moved, or the link might be wrong.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild>
            <Link to="/">
              <ArrowLeft /> Back to home
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/explore-projects">Explore projects</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
