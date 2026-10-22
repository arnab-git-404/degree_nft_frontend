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
  Mail,
  Wallet,
} from "lucide-react";
import toast from "react-hot-toast";
import { Brand } from "../components/Brand";
import { Input } from "../components/Input";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../lib/api";
import { getHomePath } from "../lib/roles";
import { shortenAddress } from "../lib/utils";

const ROLES = [
  {
    value: "student",
    label: "Student",
    description: "Claim and share your credentials.",
    icon: GraduationCap,
  },
  {
    value: "university",
    label: "University",
    description: "Issue credentials to your graduates.",
    icon: Building2,
  },
];

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
    registerWithEmail,
    resendActivation,
    signIn,
  } = useAuth();

  const modeParam = searchParams.get("mode") === "signup" ? "signup" : "login";
  const nextPath = safeNextPath(searchParams.get("next"), getHomePath(user));

  const [mode, setMode] = useState(modeParam);
  const [role, setRole] = useState("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [needsActivation, setNeedsActivation] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [pendingWallet, setPendingWallet] = useState(false);
  const [registered, setRegistered] = useState(null);

  const walletLabel = useMemo(
    () => (publicKey ? shortenAddress(publicKey.toBase58(), 4) : ""),
    [publicKey]
  );

  useEffect(() => {
    setMode(modeParam);
  }, [modeParam]);

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

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setNeedsActivation(false);
    setRegistered(null);
  };

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

  const handleRegister = async (event) => {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const data = await registerWithEmail({
        name,
        email,
        password,
        role,
      });
      setRegistered({ ...data, email });
      toast.success("Account created");
    } catch (registerError) {
      setError(getErrorMessage(registerError, "Failed to create account"));
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
      const data = await resendActivation(email || registered?.email);
      setRegistered((current) => ({
        ...(current || {}),
        ...data,
        email: email || current?.email,
      }));
      setNeedsActivation(false);
      toast.success("Activation link sent");
    } catch (resendError) {
      toast.error(
        getErrorMessage(resendError, "Could not resend the activation link")
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-[480px]">
        <div className="flex justify-center">
          <Brand showTag={false} to="/login" />
        </div>

        <div className="mt-8 border border-ink/20 bg-paper-soft p-6 shadow-[12px_12px_0_0_rgba(17,16,14,0.06)] sm:p-8">
          <div className="flex items-center justify-between border-b border-ink/20 pb-4">
            <p className="eyebrow">Account access</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink/35">
              Step 01 / 01
            </p>
          </div>

          {registered ? (
            <div className="mt-8">
              <span className="flex h-12 w-12 items-center justify-center border border-cobalt/30 bg-cobalt/5 text-cobalt">
                <Mail className="h-6 w-6" />
              </span>
              <h2 className="mt-6 font-serif text-4xl leading-none tracking-tight">
                Check your inbox.
              </h2>
              <p className="mt-4 text-sm leading-6 text-ink/65">
                Your account was created for{" "}
                <span className="font-medium text-ink">
                  {registered.email}
                </span>
                . Open the activation link to switch the account on.
              </p>

              {registered.emailDelivery === "sent" ? (
                <p className="mt-4 border-l-2 border-cobalt pl-3 text-xs leading-5 text-ink/55">
                  The activation email has been sent. If it does not arrive,
                  check spam or send a fresh link below.
                </p>
              ) : (
                <div className="mt-4 border border-ink/15 bg-paper-deep p-3 text-xs leading-5 text-ink/65">
                  Email delivery is not configured in this environment. Use the
                  development activation link below.
                </div>
              )}

              {registered.activationUrl ? (
                <a
                  href={registered.activationUrl}
                  className="mt-5 inline-flex items-center gap-2 border-b border-cobalt pb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-cobalt"
                >
                  Open activation link
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              ) : null}

              <div className="mt-8 flex flex-col gap-3 border-t border-ink/15 pt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="btn-outline flex-1"
                >
                  {isResending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  {isResending ? "Sending..." : "Resend link"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRegistered(null);
                    switchMode("login");
                  }}
                  className="btn-primary flex-1"
                >
                  Back to sign in
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-8 grid grid-cols-2 border border-ink/20">
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className={`h-11 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
                    mode === "login"
                      ? "bg-ink text-paper"
                      : "bg-paper-soft text-ink/55 hover:text-cobalt"
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className={`h-11 border-l border-ink/20 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
                    mode === "signup"
                      ? "bg-ink text-paper"
                      : "bg-paper-soft text-ink/55 hover:text-cobalt"
                  }`}
                >
                  Create account
                </button>
              </div>

              <div className="mt-8">
                <h2 className="font-serif text-4xl leading-none tracking-[-0.02em] sm:text-5xl">
                  {mode === "login" ? (
                    <>
                      Welcome <em className="italic text-cobalt">back.</em>
                    </>
                  ) : (
                    <>
                      Join the <em className="italic text-cobalt">registry.</em>
                    </>
                  )}
                </h2>
                <p className="mt-3 text-sm leading-6 text-ink/55">
                  {mode === "login"
                    ? "Use the email you activated, or sign in with a wallet."
                    : "Create an email account. We will send an activation link before the first sign in."}
                </p>
              </div>

              {/* Login form */}
              {mode === "login" ? (
                <form onSubmit={handleLogin} className="mt-7 space-y-5">
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
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {error ? (
                    <div className="border border-red-600/30 bg-red-600/5 p-3 text-xs leading-5 text-red-700">
                      {error}
                      {needsActivation ? (
                        <button
                          type="button"
                          onClick={handleResend}
                          disabled={isResending}
                          className="ml-2 border-b border-red-600 font-medium"
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
                    {!isAuthenticating ? (
                      <ArrowRight className="h-4 w-4" />
                    ) : null}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="mt-7 space-y-5">
                  <div>
                    <p className="field-label mb-2">Account type</p>
                    <div className="grid grid-cols-2 gap-2">
                      {ROLES.map((option) => {
                        const Icon = option.icon;
                        const isSelected = role === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setRole(option.value)}
                            className={`flex flex-col items-start gap-2 border p-3 text-left transition-colors ${
                              isSelected
                                ? "border-cobalt bg-cobalt/5"
                                : "border-ink/20 bg-paper-soft hover:border-cobalt/50"
                            }`}
                          >
                            <span
                              className={`flex h-8 w-8 items-center justify-center ${
                                isSelected
                                  ? "bg-cobalt text-paper"
                                  : "bg-paper-deep text-ink/50"
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            <span>
                              <span className="block text-sm font-medium">
                                {option.label}
                              </span>
                              <span className="mt-0.5 block text-[11px] leading-4 text-ink/50">
                                {option.description}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Input
                    label="Full name"
                    placeholder="Aarav Sharma"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    required
                  />

                  <Input
                    label="Email address"
                    type="email"
                    placeholder="you@university.edu"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                  />

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Input
                      label="Password"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                    <Input
                      label="Confirm password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 text-xs text-ink/50">
                    <input
                      type="checkbox"
                      checked={showPassword}
                      onChange={(event) =>
                        setShowPassword(event.target.checked)
                      }
                      className="h-3.5 w-3.5 accent-[#2b2bea]"
                    />
                    Show passwords
                  </label>

                  {error ? (
                    <div className="border border-red-600/30 bg-red-600/5 p-3 text-xs leading-5 text-red-700">
                      {error}
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
                    {isAuthenticating ? "Creating account..." : "Create account"}
                    {!isAuthenticating ? (
                      <ArrowRight className="h-4 w-4" />
                    ) : null}
                  </button>

                  <p className="text-[11px] leading-5 text-ink/45">
                    After creating the account we send a one-time activation
                    link to this email address. The account cannot sign in
                    until it is activated.
                  </p>
                </form>
              )}

              <div className="my-7 flex items-center gap-3">
                <span className="h-px flex-1 bg-ink/15" />
                <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-ink/35">
                  or continue with
                </span>
                <span className="h-px flex-1 bg-ink/15" />
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
                    : "Connect wallet"}
              </button>

              <div className="mt-5 flex items-start gap-2 text-[11px] leading-5 text-ink/45">
                <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cobalt" />
                <p>
                  Wallet sign-in uses a free message signature. It never moves
                  funds or creates a blockchain transaction.
                </p>
              </div>
            </>
          )}

          <div className="mt-10 flex items-center justify-between border-t border-ink/15 pt-4 font-mono text-[8px] uppercase tracking-[0.16em] text-ink/35">
            <span>DegreeNFT / Access</span>
            <Link to="/verify" className="transition-colors hover:text-cobalt">
              Public verification
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
