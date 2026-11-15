import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import toast from "react-hot-toast";
import { Brand } from "../../components/Brand";
import { Input } from "../../components/Input";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../lib/api";
import { getHomePath } from "../../lib/roles";
import { shortenAddress } from "../../lib/utils";
import "./Login.css";

const safeNextPath = (value, fallback = "/profile") =>
  value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : fallback;

const HIGHLIGHTS = [
  {
    icon: BadgeCheck,
    title: "Free wallet sign-in",
    text: "A message signature only. It never moves funds or creates a transaction.",
  },
  {
    icon: Building2,
    title: "Issued accounts",
    text: "Institutions join through an approved registration link.",
  },
  {
    icon: GraduationCap,
    title: "Student access",
    text: "Students get access once an institution issues a credential to their wallet.",
  },
];

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
    <div className="login-page">
      {/* Left: brand panel (desktop only) */}
      <aside className="brand-panel">
        <div className="brand-row">
          <span className="brand-mark">
            <GraduationCap className="h-4 w-4" />
          </span>
          <span className="font-semibold text-white">DegreeNFT</span>
        </div>

        <div>
          <h2 className="brand-headline">
            Tamper-proof academic credentials on Solana.
          </h2>
          <ul className="highlights">
            {HIGHLIGHTS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title}>
                  <span className="highlight-icon">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="highlight-title">{item.title}</span>
                    <span className="highlight-text">{item.text}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <Link to="/verify" className="verify-link">
          <ShieldCheck className="h-3.5 w-3.5" />
          Verify a credential publicly
        </Link>
      </aside>

      {/* Right: sign-in form */}
      <main className="form-side">
        <div className="form-wrap">
          <div className="mobile-brand">
            <Brand showTag={false} to="/login" />
          </div>

          <h1 className="form-title">Sign in</h1>
          <p className="form-sub">
            Use your registered email or the wallet linked to your account.
          </p>

          <form onSubmit={handleLogin} className="form">
            <Input
              label="Email address"
              type="email"
              placeholder="you@institution.edu"
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
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="eye-btn"
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
              <div role="alert" className="form-error">
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

          <div className="divider">
            <span />
            <span className="divider-text">or</span>
            <span />
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

          {/* On phones the brand panel is hidden, so keep the key notes here */}
          <p className="mobile-note">
            Wallet sign-in is a free message signature and never moves funds.
            Accounts are issued by DegreeNFT.{" "}
            <Link to="/verify" className="link-underline">
              Public verification
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
