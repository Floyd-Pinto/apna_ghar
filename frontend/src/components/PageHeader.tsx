import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/** Consistent title block used at the top of every inner page. */
const PageHeader = ({ title, description, eyebrow, actions, className, children }: PageHeaderProps) => (
  <div className={cn("relative border-b border-border bg-card/60", className)}>
    <div className="pointer-events-none absolute inset-0 bg-hero-glow opacity-70" aria-hidden />
    <div className="container relative py-8 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <div className="mb-2 text-sm font-medium text-primary">{eyebrow}</div>}
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  </div>
);

export default PageHeader;
