import { Link, useLocation } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function SignInRequired({
  title = "Sign in to continue",
  description = "Use your email and password or a Solana wallet to access this desk.",
}) {
  const { connected } = useWallet();
  const { isAuthenticating, authError, signIn } = useAuth();
  const location = useLocation();
  const next = encodeURIComponent(location.pathname);

  const handleSignIn = async () => {
    try {
      await signIn();
    } catch {
      // Auth context exposes the error below.
    }
  };

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex w-full max-w-md items-start gap-3 rounded-md border border-ink/10 bg-paper-soft p-4 shadow-xs">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-acid text-cobalt">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] text-ink/50">Access restricted</p>
          <h2 className="text-base leading-tight font-semibold">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-ink/60">{description}</p>
          {authError ? (
            <p className="mt-1 text-xs text-red-700">{authError}</p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {connected ? (
              <button
                type="button"
                className="btn-outline"
                onClick={handleSignIn}
                disabled={isAuthenticating}
              >
                {isAuthenticating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                {isAuthenticating ? "Signing in..." : "Sign in with wallet"}
              </button>
            ) : null}
            <Link to={`/login?next=${next}`} className="btn-primary">
              Sign in
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
