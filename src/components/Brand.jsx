import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { cn } from "../lib/utils";

export function Brand({ className, showTag = true, to = "/" }) {
  return (
    <Link to={to} className={cn("flex min-w-0 items-center gap-3", className)}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-ink text-paper">
        <GraduationCap className="h-5 w-5" />
      </span>
      <span className="text-lg font-semibold tracking-[-0.02em]">DegreeNFT</span>
      {showTag ? (
        <span className="hidden font-mono text-[9px] uppercase tracking-[0.18em] text-ink/50 sm:inline">
          Academic registry
        </span>
      ) : null}
    </Link>
  );
}
