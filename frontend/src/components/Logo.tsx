import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showTagline?: boolean;
  onClick?: () => void;
}

const Logo = ({ className, showTagline = true, onClick }: LogoProps) => (
  <Link to="/" onClick={onClick} className={cn("flex items-center gap-2.5 shrink-0", className)}>
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
      <Home className="h-[18px] w-[18px]" strokeWidth={2.4} />
    </span>
    <span className="flex flex-col leading-none">
      <span className="font-display text-lg font-bold tracking-tight text-foreground">
        Apna<span className="text-primary">Ghar</span>
      </span>
      {showTagline && (
        <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Verified on-chain
        </span>
      )}
    </span>
  </Link>
);

export default Logo;
