import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { AlertTriangle, BadgeCheck, CircleCheck, Loader2, ShieldCheck, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../../lib/api";
import { Brand } from "../../components/Brand";
import { Button } from "../../components/Button";
import { useAuth } from "../../context/AuthContext";
import { getHomePath } from "../../lib/roles";
import { shortenAddress } from "../../lib/utils";
import "./StudentClaim.css";

// Public page behind the emailed invite link: the student connects a wallet and signs a free message to prove it
// is theirs. The server then links the college's profile to that wallet's account and signs them in.
export function StudentClaim() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { setVisible } = useWalletModal();
  const { connected, publicKey } = useWallet();
  const { claimStudentInvite, isAuthenticating } = useAuth();
  const [invite, setInvite] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [signError, setSignError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/auth/student-invite/${token}`)
      .then(({ data }) => !cancelled && setInvite(data.invite))
      .catch((error) => !cancelled && setLoadError(getErrorMessage(error, "This invite link is not valid.")));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const address = publicKey?.toBase58() || "";
  const hint = invite?.walletHint || "";
  const matchesHint = Boolean(address && hint && address === hint);

  const claim = useCallback(async () => {
    setSignError("");
    try {
      const user = await claimStudentInvite(token);
      toast.success("Wallet linked. Welcome!");
      navigate(getHomePath(user), { replace: true });
    } catch (error) {
      setSignError(getErrorMessage(error, "Failed to link the wallet"));
    }
  }, [claimStudentInvite, token, navigate]);

  return (
    <div className="student-claim">
      <div className="claim-card">
        <div className="claim-brand">
          <Brand showTag={false} to="/login" />
        </div>

        {!invite && !loadError && (
          <div className="claim-loading">
            <Loader2 className="h-6 w-6 animate-spin text-cobalt" />
          </div>
        )}

        {loadError && (
          <div className="claim-state">
            <AlertTriangle className="claim-state__icon is-bad" aria-hidden="true" />
            <h1 className="claim-title">This link can't be used</h1>
            <p className="claim-text">{loadError}</p>
          </div>
        )}

        {invite && (
          <>
            <h1 className="claim-title">Connect your wallet</h1>
            <p className="claim-text">
              Hi <strong>{invite.studentName}</strong>. <strong>{invite.collegeName}</strong> will issue your credentials to the wallet you
              connect here.
              {invite.registrationNo ? ` Registration no. ${invite.registrationNo}.` : ""}
            </p>

            <ol className="claim-steps">
              <li className={connected ? "is-done" : "is-now"}>
                <span className="claim-steps__n">{connected ? <CircleCheck className="h-4 w-4" /> : 1}</span>
                <span>
                  <b>Connect your Solana wallet</b>
                  {connected && <span className="claim-steps__sub">{shortenAddress(address, 4)}</span>}
                </span>
              </li>
              <li className={connected ? "is-now" : ""}>
                <span className="claim-steps__n">2</span>
                <span>
                  <b>Sign a free message</b>
                  <span className="claim-steps__sub">Proves the wallet is yours. It never moves funds.</span>
                </span>
              </li>
            </ol>

            {connected && hint && (
              <p className={`claim-hint ${matchesHint ? "is-ok" : "is-warn"}`}>
                {matchesHint ? (
                  <>
                    <BadgeCheck className="h-4 w-4 shrink-0" /> This matches the wallet your college entered.
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 shrink-0" /> Your college entered a different wallet ({shortenAddress(hint, 4)}). Credentials go to the
                    wallet you sign with.
                  </>
                )}
              </p>
            )}

            {signError && (
              <div role="alert" className="claim-error">
                {signError}
              </div>
            )}

            {connected ? (
              <Button className="w-full" onClick={claim} isLoading={isAuthenticating}>
                <ShieldCheck className="h-4 w-4" /> Sign and link wallet
              </Button>
            ) : (
              <Button className="w-full" onClick={() => setVisible(true)}>
                <Wallet className="h-4 w-4" /> Connect wallet
              </Button>
            )}
            <p className="claim-foot">This link works once and expires on {new Date(invite.expiresAt).toLocaleDateString()}.</p>
          </>
        )}
      </div>
    </div>
  );
}
