import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { ArrowRight, BadgeCheck, Eye, EyeOff, Loader2, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import { Brand } from "../components/Brand";
import { Input } from "../components/Input";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../lib/api";
import { getHomePath } from "../lib/roles";
import { shortenAddress } from "../lib/utils";

const safeNextPath = (value, fallback = "/profile") =>
  value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : fallback;

export function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setVisible } = useWalletModal();
  const { connected, publicKey } = useWallet();
  const {
    user,
    isAuthenticated,
    isAuthenticating,
    loginWithEmail,
    resendActivation,
    signIn,
  } = useAuth();

  const nextPath = safeNextPath(searchParams.get("next"), getHomePath(user));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [needsActivation, setNeedsActivation] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [pendingWallet, setPendingWallet] = useState(false);

  const walletLabel = useMemo(
    () => (publicKey ? shortenAddress(publicKey.toBase58(), 4) : ""),
    [publicKey]
  );

  useEffect(() => {
    if (isAuthenticated) {
      navigate(nextPath, { replace: true });
    }
  }, [isAuthenticated, navigate, nextPath]);

  const completeWalletSignIn = useCallback(async () => {
    setError("");

    try {
      await signIn();
      toast.success("Signed in with wallet");
    } catch (walletError) {
      setError(getErrorMessage(walletError, "Failed to sign in with wallet"));
    } finally {
      setPendingWallet(false);
    }
  }, [signIn]);

  useEffect(() => {
    if (pendingWallet && connected && publicKey) {
      completeWalletSignIn();
    }
  }, [pendingWallet, connected, publicKey, completeWalletSignIn]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setNeedsActivation(false);

    try {
      await loginWithEmail(email, password);
      toast.success("Welcome back");
    } catch (loginError) {
      setError(getErrorMessage(loginError, "Failed to sign in"));
      setNeedsActivation(
        loginError.response?.data?.code === "EMAIL_NOT_VERIFIED"
      );
    }
  };

  const handleWalletSignIn = async () => {
    setError("");

    if (!connected || !publicKey) {
      setPendingWallet(true);
      setVisible(true);
      return;
    }

    await completeWalletSignIn();
  };

  const handleResend = async () => {
    setIsResending(true);

    try {
      await resendActivation(email);
      setNeedsActivation(false);
      setError("");
      toast.success("If the account is pending activation, a new link was sent");
    } catch (resendError) {
      toast.error(
        getErrorMessage(resendError, "Could not resend the activation link")
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-[440px]">
        <div className="flex justify-center">
          <Brand showTag={false} to="/login" />
        </div>

        <div className="panel mt-8 p-6 sm:p-8">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-ink/55">
            Use your registered email or the wallet linked to your account.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="you@university.edu"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-[30px] text-ink/40 transition-colors hover:text-cobalt"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {error ? (
              <div
                role="alert"
                className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error}
                {needsActivation ? (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="ml-2 font-medium underline"
                  >
                    {isResending ? "Sending..." : "Resend activation"}
                  </button>
                ) : null}
              </div>
            ) : null}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isAuthenticating}
            >
              {isAuthenticating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {isAuthenticating ? "Signing in..." : "Sign in"}
              {!isAuthenticating ? <ArrowRight className="h-4 w-4" /> : null}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-ink/10" />
            <span className="text-xs text-ink/40">or</span>
            <span className="h-px flex-1 bg-ink/10" />
          </div>

          <button
            type="button"
            onClick={handleWalletSignIn}
            disabled={isAuthenticating}
            className="btn-outline w-full"
          >
            {pendingWallet || isAuthenticating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="h-4 w-4" />
            )}
            {connected && walletLabel
              ? `Sign in as ${walletLabel}`
              : pendingWallet
                ? "Waiting for wallet..."
                : "Sign in with wallet"}
          </button>

          <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-ink/50">
            <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cobalt" />
            <p>
              Wallet sign-in uses a free message signature. It never moves funds
              or creates a blockchain transaction.
            </p>
          </div>

          <p className="mt-6 rounded-md bg-paper px-3 py-2.5 text-xs leading-5 text-ink/60">
            Accounts are issued by DegreeNFT. Universities join through an
            approved registration; students get access once a university issues
            a credential to their wallet.
          </p>

          <div className="mt-6 flex justify-end border-t border-ink/10 pt-4 text-xs text-ink/45">
            <Link to="/verify" className="hover:text-cobalt">
              Public verification
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
