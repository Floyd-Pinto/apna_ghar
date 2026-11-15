import { Link } from "react-router-dom";
import { BadgeCheck, Building2, Heart, MapPin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatPrice, humanize } from "@/lib/format";
import type { ProjectSummary } from "@/types/project";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=70";

const statusVariant: Record<string, "info" | "success" | "warning" | "secondary"> = {
  ongoing: "info",
  under_construction: "info",
  completed: "success",
  ready_to_move: "success",
  upcoming: "warning",
};

interface ProjectCardProps {
  project: ProjectSummary;
  saved?: boolean;
  onToggleSave?: (projectId: string) => void;
  className?: string;
}

const ProjectCard = ({ project, saved = false, onToggleSave, className }: ProjectCardProps) => {
  const amenities = project.amenities ?? [];

  return (
    <Link
      to={`/projects/${project.id}`}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <img
          src={project.cover_image || FALLBACK_IMAGE}
          alt={project.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
          }}
        />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <div className="flex flex-wrap gap-1.5">
            {project.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold text-success shadow-sm backdrop-blur">
                <BadgeCheck className="h-3.5 w-3.5" /> Verified
              </span>
            )}
            {project.status && (
              <span className="inline-flex items-center rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur">
                {humanize(project.status)}
              </span>
            )}
          </div>
          {onToggleSave && (
            <button
              type="button"
              aria-label={saved ? "Remove from saved" : "Save project"}
              aria-pressed={saved}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleSave(project.id);
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur transition-colors hover:text-destructive"
            >
              <Heart className={cn("h-4 w-4", saved && "fill-destructive text-destructive")} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-1 font-display text-base font-semibold sm:text-lg">{project.name}</h3>
          {project.average_rating > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              {Number(project.average_rating).toFixed(1)}
            </span>
          )}
        </div>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {project.city}
            {project.state ? `, ${project.state}` : ""}
          </span>
        </p>
        {project.developer_name && (
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{project.developer_name}</span>
          </p>
        )}

        {amenities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {amenities.slice(0, 3).map((amenity) => (
              <Badge key={amenity} variant="secondary" className="font-medium">
                {amenity}
              </Badge>
            ))}
            {amenities.length > 3 && (
              <Badge variant="outline" className="font-medium text-muted-foreground">
                +{amenities.length - 3}
              </Badge>
            )}
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-4 mt-4">
          <div>
            <div className="text-xs text-muted-foreground">Starting from</div>
            <div className="font-display text-lg font-bold text-foreground">{formatPrice(project.starting_price)}</div>
          </div>
          {project.total_units > 0 && (
            <Badge variant={statusVariant[project.status] ?? "secondary"}>
              {project.available_units}/{project.total_units} available
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
};

export const ProjectCardSkeleton = () => (
  <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
    <div className="aspect-[16/10] animate-pulse bg-muted" />
    <div className="space-y-3 p-5">
      <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
      <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
      <div className="mt-4 h-10 animate-pulse rounded bg-muted" />
    </div>
  </div>
);

export default ProjectCard;
