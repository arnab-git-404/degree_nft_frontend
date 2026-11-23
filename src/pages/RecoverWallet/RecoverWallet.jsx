import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Buffer } from "buffer";
import { AlertTriangle, CircleCheck, Loader2, ShieldCheck, Wallet } from "lucide-react";
import api, { getErrorMessage } from "../../lib/api";
import { Brand } from "../../components/Brand";
import { Button } from "../../components/Button";
import { shortenAddress } from "../../lib/utils";
// Same card layout as the invite claim page.
import "../StudentClaim/StudentClaim.css";

// Public page behind the emailed recovery link: the student connects the NEW wallet and signs a free message.
// Nothing moves yet; two college officials approve the move afterwards.
export function RecoverWallet() {
  const { token } = useParams();
  const { setVisible } = useWalletModal();
  const { connected, publicKey, signMessage } = useWallet();
  const [recovery, setRecovery] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [signError, setSignError] = useState("");
  const [isSigning, setIsSigning] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/auth/recovery/${token}`)
      .then(({ data }) => !cancelled && setRecovery(data.recovery))
      .catch((error) => !cancelled && setLoadError(getErrorMessage(error, "This recovery link is not valid.")));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const address = publicKey?.toBase58() || "";

  const prove = async () => {
    setSignError("");
    if (typeof signMessage !== "function") {
      setSignError("This wallet cannot sign messages. Try another wallet app.");
      return;
    }
    setIsSigning(true);
    try {
      const { data: nonce } = await api.post("/auth/nonce", { walletAddress: address });
      const signature = Buffer.from(await signMessage(new TextEncoder().encode(nonce.message))).toString("base64");
      await api.post(`/auth/recovery/${token}/prove`, { walletAddress: address, signature });
      setDone(true);
    } catch (error) {
      setSignError(getErrorMessage(error, "Could not confirm the new wallet"));
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="student-claim">
      <div className="claim-card">
        <div className="claim-brand">
          <Brand showTag={false} to="/login" />
        </div>

        {!recovery && !loadError && (
          <div className="claim-loading">
            <Loader2 className="h-6 w-6 animate-spin text-cobalt" />
          </div>
        )}

        {loadError && (
          <div className="claim-state">
            <AlertTriangle className="claim-state__icon is-bad" aria-hidden="true" />
            <h1 className="claim-title">This link can&apos;t be used</h1>
            <p className="claim-text">{loadError}</p>
          </div>
        )}

        {recovery && done && (
          <div className="claim-state">
            <CircleCheck className="claim-state__icon" aria-hidden="true" />
            <h1 className="claim-title">New wallet confirmed</h1>
            <p className="claim-text">
              {recovery.collegeName} will now approve moving your credentials to {shortenAddress(address, 4)}. Once two officials approve, sign in with this
              new wallet to see them.
            </p>
          </div>
        )}

        {recovery && !done && (
          <>
            <h1 className="claim-title">Connect your new wallet</h1>
            <p className="claim-text">
              Hi <strong>{recovery.studentName}</strong>. <strong>{recovery.collegeName}</strong> is moving your credentials to a new wallet because the old
              one can no longer be used. Connect the <strong>new</strong> wallet here.
            </p>

            <ol className="claim-steps">
              <li className={connected ? "is-done" : "is-now"}>
                <span className="claim-steps__n">{connected ? <CircleCheck className="h-4 w-4" /> : 1}</span>
                <span>
                  <b>Connect your new Solana wallet</b>
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

            {signError && (
              <div role="alert" className="claim-error">
                {signError}
              </div>
            )}

            {connected ? (
              <Button className="w-full" onClick={prove} isLoading={isSigning}>
                <ShieldCheck className="h-4 w-4" /> Sign and confirm new wallet
              </Button>
            ) : (
              <Button className="w-full" onClick={() => setVisible(true)}>
                <Wallet className="h-4 w-4" /> Connect wallet
              </Button>
            )}
            <p className="claim-foot">This link works once and expires on {new Date(recovery.expiresAt).toLocaleDateString()}.</p>
          </>
        )}
      </div>
    </div>
  );
}
