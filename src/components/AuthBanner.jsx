import { Link, useLocation } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const AUTH_BANNER_PATHS = ["/batch-upload"];

export function AuthBanner() {
  const { pathname } = useLocation();
  const { isAuthenticated, isRestoring } = useAuth();

  const shouldShow = AUTH_BANNER_PATHS.some((path) =>
    pathname.startsWith(path)
  );

  if (!shouldShow || isAuthenticated || isRestoring) {
    return null;
  }

  const next = encodeURIComponent(pathname);

  return (
    <div className="border-b border-cobalt/20 bg-cobalt/5">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-cobalt" />
          <div>
            <p className="text-sm font-medium text-ink">
              Sign in to use the batch upload desk.
            </p>
            <p className="text-xs text-ink/55">
              Use email or a Solana wallet. Signing in is free.
            </p>
          </div>
        </div>

        <Link
          to={`/login?next=${next}`}
          className="inline-flex h-9 items-center justify-center bg-cobalt px-4 font-mono text-[9px] uppercase tracking-[0.16em] text-paper transition-colors hover:bg-ink"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
