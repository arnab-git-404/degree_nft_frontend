import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Loader2,
  MailWarning,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Input } from "../components/Input";
import { getErrorMessage } from "../lib/api";
import { getHomePath } from "../lib/roles";

export function Activate() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { activateAccount, isAuthenticated, user } = useAuth();
  const startedRef = useRef(false);

  const [manualToken, setManualToken] = useState("");
  const [status, setStatus] = useState(token ? "loading" : "idle");
  const [error, setError] = useState("");
  const [activatedUser, setActivatedUser] = useState(null);

  useEffect(() => {
    if (!token || startedRef.current) return;

    startedRef.current = true;
    setStatus("loading");
    setError("");

    activateAccount(token)
      .then((nextUser) => {
        setActivatedUser(nextUser);
        setStatus("success");
      })
      .catch((activationError) => {
        setError(
          getErrorMessage(
            activationError,
            "This activation link is invalid or has expired."
          )
        );
        setStatus("error");
      });
  }, [token, activateAccount]);

  const handleManualActivate = async (event) => {
    event.preventDefault();
    setStatus("loading");
    setError("");

    try {
      const nextUser = await activateAccount(manualToken.trim());
      setActivatedUser(nextUser);
      setStatus("success");
    } catch (activationError) {
      setError(
        getErrorMessage(
          activationError,
          "This activation link is invalid or has expired."
        )
      );
      setStatus("error");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
      <div
        className="pointer-events-none absolute inset-0 hero-grid"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg border border-ink/20 bg-paper-soft p-6 shadow-[16px_16px_0_0_rgba(17,16,14,0.08)] sm:p-9">
        <div className="flex items-center justify-between border-b border-ink/15 pb-4">
          <p className="eyebrow">Account activation</p>
          <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-ink/35">
            One-time link
          </p>
        </div>

        {status === "loading" ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Loader2 className="h-9 w-9 animate-spin text-cobalt" />
            <h1 className="mt-6 font-serif text-4xl tracking-tight">
              Activating account.
            </h1>
            <p className="mt-3 text-sm text-ink/55">
              Checking the link and switching the registry on.
            </p>
          </div>
        ) : null}

        {status === "success" ? (
          <div className="py-8">
            <span className="flex h-14 w-14 items-center justify-center border border-cobalt/30 bg-cobalt/5 text-cobalt">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <h1 className="mt-6 font-serif text-5xl leading-[0.92] tracking-[-0.03em]">
              Account{" "}
              <em className="italic text-cobalt">activated.</em>
            </h1>
            <p className="mt-4 text-sm leading-6 text-ink/60">
              {activatedUser?.email || user?.email
                ? `${activatedUser?.email || user?.email} is ready to use.`
                : "Your registry account is ready to use."}
            </p>

            <div className="mt-6 flex items-center gap-3 border border-ink/15 bg-paper-deep p-3 text-xs text-ink/60">
              <BadgeCheck className="h-4 w-4 shrink-0 text-cobalt" />
              You are signed in. Your profile is where identity, wallets, and
              security are managed.
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(getHomePath(activatedUser || user), { replace: true })
              }
              className="btn-primary mt-7 w-full"
            >
              Open dashboard
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {status === "idle" ? (
          <div className="py-8">
            <span className="flex h-14 w-14 items-center justify-center border border-ink/20 bg-paper-deep text-ink/55">
              <MailWarning className="h-7 w-7" />
            </span>
            <h1 className="mt-6 font-serif text-5xl leading-[0.92] tracking-[-0.03em]">
              Activate your{" "}
              <em className="italic text-cobalt">account.</em>
            </h1>
            <p className="mt-4 text-sm leading-6 text-ink/60">
              Open the link from the activation email, or paste the token from
              that link below.
            </p>

            <form onSubmit={handleManualActivate} className="mt-7 space-y-4">
              <Input
                label="Activation token"
                placeholder="Paste the token from your email"
                value={manualToken}
                onChange={(event) => setManualToken(event.target.value)}
                required
              />
              <button type="submit" className="btn-primary w-full">
                Activate account
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="py-8">
            <span className="flex h-14 w-14 items-center justify-center border border-red-600/30 bg-red-600/5 text-red-700">
              <MailWarning className="h-7 w-7" />
            </span>
            <h1 className="mt-6 font-serif text-5xl leading-[0.92] tracking-[-0.03em]">
              Link not{" "}
              <em className="italic text-cobalt">valid.</em>
            </h1>
            <p className="mt-4 border border-red-600/20 bg-red-600/5 p-3 text-sm leading-6 text-red-700">
              {error}
            </p>
            <p className="mt-4 text-sm leading-6 text-ink/60">
              Activation links expire. Sign in with your email and request a
              fresh link from the sign-in screen.
            </p>
            <Link to="/login" className="btn-primary mt-7 w-full">
              Go to sign in
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : null}

        <div className="mt-8 flex items-center justify-between border-t border-ink/15 pt-4 font-mono text-[8px] uppercase tracking-[0.16em] text-ink/35">
          <span>DegreeNFT / Activation</span>
          {isAuthenticated ? (
            <Link
              to="/profile"
              className="transition-colors hover:text-cobalt"
            >
              Profile
            </Link>
          ) : (
            <Link to="/login" className="transition-colors hover:text-cobalt">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
