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
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center text-center">
      <span className="flex h-16 w-16 items-center justify-center border border-ink/20 bg-paper-soft text-cobalt">
        <ShieldCheck className="h-8 w-8" />
      </span>
      <p className="eyebrow mt-6">Access restricted</p>
      <h2 className="mt-3 font-serif text-4xl leading-tight tracking-tight">
        {title}
      </h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-ink/60">
        {description}
      </p>
      {authError ? (
        <p className="mt-3 text-sm text-red-700">{authError}</p>
      ) : null}

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        {connected ? (
          <button
            type="button"
            className="btn-primary"
            onClick={handleSignIn}
            disabled={isAuthenticating}
          >
            {isAuthenticating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {isAuthenticating ? "Signing in..." : "Sign in with wallet"}
          </button>
        ) : null}
        <Link to={`/login?next=${next}`} className="btn-primary">
          Sign in
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <p className="mt-5 text-xs text-ink/45">
        New here?{" "}
        <Link
          to="/login?mode=signup"
          className="border-b border-ink/40 text-ink transition-colors hover:border-cobalt hover:text-cobalt"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
