import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Loader2,
  MailWarning,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Brand } from "../../components/Brand";
import { Input } from "../../components/Input";
import { getErrorMessage } from "../../lib/api";
import { getHomePath } from "../../lib/roles";
import "./Activate.css";

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
    <div className="activate-page">
      <div className="hero-grid backdrop" aria-hidden="true" />

      <div className="card">
        <div className="card-head">
          <Brand showTag={false} to={isAuthenticated ? "/profile" : "/login"} />
          <span className="tag">Account activation</span>
        </div>

        <div className="card-body">
          {status === "loading" ? (
            <div className="state state-center">
              <Loader2 className="h-7 w-7 animate-spin text-cobalt" />
              <h1 className="title">Activating account…</h1>
              <p className="text">Checking the link and switching the registry on.</p>
            </div>
          ) : null}

          {status === "success" ? (
            <div className="state">
              <div className="state-head">
                <span className="icon icon-ok">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div>
                  <h1 className="title">Account activated</h1>
                  <p className="text">
                    {activatedUser?.email || user?.email
                      ? `${activatedUser?.email || user?.email} is ready to use.`
                      : "Your registry account is ready to use."}
                  </p>
                </div>
              </div>

              <div className="note">
                <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-cobalt" />
                You are signed in. Your profile is where identity, wallets, and
                security are managed.
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate(getHomePath(activatedUser || user), { replace: true })
                }
                className="btn-primary w-full"
              >
                Open dashboard
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          {status === "idle" ? (
            <div className="state">
              <div className="state-head">
                <span className="icon icon-muted">
                  <MailWarning className="h-5 w-5" />
                </span>
                <div>
                  <h1 className="title">Activate your account</h1>
                  <p className="text">
                    Open the link from the activation email, or paste the token
                    from that link below.
                  </p>
                </div>
              </div>

              <form onSubmit={handleManualActivate} className="state">
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
            <div className="state">
              <div className="state-head">
                <span className="icon icon-bad">
                  <MailWarning className="h-5 w-5" />
                </span>
                <div>
                  <h1 className="title">Link not valid</h1>
                  <p className="text">
                    Activation links expire. Sign in with your email and request
                    a fresh link from the sign-in screen.
                  </p>
                </div>
              </div>
              <p className="error-box">{error}</p>
              <Link to="/login" className="btn-primary w-full">
                Go to sign in
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : null}
        </div>

        <div className="card-foot">
          <span>One-time link</span>
          {isAuthenticated ? (
            <Link to="/profile" className="hover:text-cobalt">
              Profile
            </Link>
          ) : (
            <Link to="/login" className="hover:text-cobalt">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
