import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { cn } from "../lib/utils";

export function Brand({ className, showTag = true, to = "/" }) {
  return (
    <Link to={to} className={cn("flex min-w-0 items-center gap-3", className)}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-cobalt text-white">
        <GraduationCap className="h-4 w-4" />
      </span>
      <span className="text-base font-semibold">DegreeNFT</span>
      {showTag ? (
        <span className="hidden text-xs text-ink/50 sm:inline">
          Academic registry
        </span>
      ) : null}
    </Link>
  );
}
