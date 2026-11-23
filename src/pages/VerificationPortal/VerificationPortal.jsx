import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  CircleHelp,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Lock,
  RotateCcw,
  ScanSearch,
  Search,
  Shield,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { getExplorerUrl, isValidPublicKey, SOLANA_NETWORK } from "../../lib/solana";
import api, { getErrorMessage } from "../../lib/api";
import "./VerificationPortal.css";

const STEPS = [
  [
    "Scan or paste",
    "Scan the credential's QR code, or paste the credential (NFT) address.",
  ],
  [
    "Checked from both sides",
    "Our record, the college's official collection and the Solana chain must all agree.",
  ],
  [
    "Official status",
    "Owning the NFT is not enough: a suspended or revoked credential is shown as such.",
  ],
];

const copyText = async (text, message) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(message);
  } catch {
    toast.error("Could not copy the address");
  }
};

// What each verification status means to the person checking (VERIFIED is the only "good" one).
const OUTCOMES = {
  VERIFIED: { title: "Credential verified", text: "Issued by the college below, held by the wallet it was issued to, and currently valid.", good: true },
  SUSPENDED: { title: "Credential suspended", text: "The issuing college has suspended this credential. It is not valid at the moment." },
  REVOKED: { title: "Credential revoked", text: "The issuing college has revoked this credential. It is no longer valid." },
  SUPERSEDED: { title: "Credential superseded", text: "This credential was corrected after it was issued; ask the holder for the current one." },
  NOT_FOUND: { title: "No credential found", text: "This address is not a DegreeNFT credential. Check it, or contact the issuing college." },
  VERIFICATION_UNAVAILABLE: { title: "Could not verify right now", text: "A check could not be completed (for example the Solana network did not answer). Try again shortly." },
};

export function VerificationPortal() {
  const { assetAddress } = useParams(); // /verify/:assetAddress, the link behind every credential's QR code
  const navigate = useNavigate();
  const [address, setAddress] = useState(assetAddress || "");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const isAddressValid = isValidPublicKey(address);

  const runCheck = useCallback(async (target) => {
    setIsLoading(true);
    setResult(null);
    try {
      const { data } = await api.get(`/verify/${target}`);
      setResult({ ...data, checkedAt: new Date(data.checkedAt) });
    } catch (error) {
      toast.error(getErrorMessage(error, "Verification failed"));
      setResult({ status: "VERIFICATION_UNAVAILABLE", assetAddress: target, checkedAt: new Date() });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (assetAddress && isValidPublicKey(assetAddress)) {
      setAddress(assetAddress);
      runCheck(assetAddress);
    }
  }, [assetAddress, runCheck]);

  const handleVerify = (event) => {
    event.preventDefault();
    if (!isAddressValid) return;
    // Put the address in the URL so the result page can be shared or bookmarked.
    if (address === assetAddress) runCheck(address);
    else navigate(`/verify/${address}`);
  };

  const reset = () => {
    setAddress("");
    setResult(null);
    navigate("/verify");
  };

  const outcome = result && OUTCOMES[result.status];
  const isValid = Boolean(outcome?.good);
  const shareUrl = result && `${window.location.origin}/verify/${result.assetAddress}`;

  return (
    <div className="verify-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Verify a credential</h1>
          <p className="page-sub">
            Confirm that an academic credential was issued by a registered
            institution and recorded on Solana.
          </p>
        </div>
        <div className="tags">
          <span className="tag">
            <Shield className="h-3.5 w-3.5" />
            No login required
          </span>
          <span className="tag">
            <Globe className="h-3.5 w-3.5" />
            Solana {SOLANA_NETWORK}
          </span>
        </div>
      </div>

      <form onSubmit={handleVerify} className="lookup">
        <div className="lookup-grid hero-grid" aria-hidden="true" />
        <div className="lookup-body">
          <div className="lookup-head">
            <span className="lookup-icon">
              <BadgeCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="lookup-title">Look up a degree NFT</h2>
              <p className="lookup-sub">
                Paste the credential (NFT) address, or open the link from its QR code.
              </p>
            </div>
          </div>

          <div className="search-row">
            <div className="search-field">
              <Search className="search-icon" aria-hidden="true" />
              <Input
                id="verify-address"
                aria-label="Credential (NFT) address"
                placeholder="e.g. FYYAm8NKgaShjzFkdi5rVY5TC47..."
                value={address}
                autoComplete="off"
                spellCheck={false}
                className="search-input"
                onChange={(event) => setAddress(event.target.value.trim())}
                error={
                  address && !isAddressValid
                    ? "That is not a valid Solana address"
                    : undefined
                }
              />
            </div>
            <Button
              type="submit"
              className="search-btn"
              disabled={!isAddressValid}
              isLoading={isLoading}
            >
              {isLoading ? "Verifying..." : "Verify"}
            </Button>
          </div>

          <div className="lookup-foot">
            <p className="privacy">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              Shows only public facts and the holder's initials. No wallet connection needed.
            </p>
          </div>
        </div>
      </form>

      <div className="layout">
        <section className="result-card" aria-live="polite">
          <h2 className="section-label">Result</h2>

          {isLoading ? (
            <div className="state">
              <Loader2 className="state-icon animate-spin text-cobalt" />
              <p className="state-title">Checking the registry...</p>
              <p className="state-text">This usually takes a few seconds.</p>
            </div>
          ) : result ? (
            <div className={`outcome ${isValid ? "is-valid" : "is-invalid"}`}>
              <div className="outcome-head">
                {isValid ? (
                  <CheckCircle2 className="outcome-icon" />
                ) : result.status === "VERIFICATION_UNAVAILABLE" ? (
                  <CircleHelp className="outcome-icon" />
                ) : result.status === "NOT_FOUND" ? (
                  <XCircle className="outcome-icon" />
                ) : (
                  <AlertTriangle className="outcome-icon" />
                )}
                <div className="min-w-0">
                  <p className="outcome-title">{outcome.title}</p>
                  <p className="outcome-text">{outcome.text}</p>
                </div>
              </div>

              <dl className="details">
                {result.credential && (
                  <>
                    <div className="detail">
                      <dt>Credential</dt>
                      <dd>
                        {result.credential.title} ({result.credential.type})
                      </dd>
                    </div>
                    <div className="detail">
                      <dt>Issued by</dt>
                      <dd>{result.college?.name}</dd>
                    </div>
                    {result.credential.holder && (
                      <div className="detail">
                        <dt>Holder</dt>
                        <dd>{result.credential.holder}</dd>
                      </div>
                    )}
                    {result.credential.issuedAt && (
                      <div className="detail">
                        <dt>Issued on-chain</dt>
                        <dd>{new Date(result.credential.issuedAt).toLocaleDateString()}</dd>
                      </div>
                    )}
                  </>
                )}
                <div className="detail">
                  <dt>Address</dt>
                  <dd className="detail-address">
                    <code>{result.assetAddress}</code>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => copyText(result.assetAddress, "Address copied")}
                      aria-label="Copy address"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </dd>
                </div>
                <div className="detail">
                  <dt>Network</dt>
                  <dd>Solana {result.chain?.network || SOLANA_NETWORK}</dd>
                </div>
                <div className="detail">
                  <dt>Checked</dt>
                  <dd>{result.checkedAt.toLocaleString()}</dd>
                </div>
              </dl>

              {result.checks && (
                <ul className="checks">
                  {result.checks.map((check) => (
                    <li key={check.key} className={check.ok === true ? "is-ok" : check.ok === false ? "is-bad" : "is-unknown"}>
                      {check.ok === true ? <CheckCircle2 className="h-3.5 w-3.5" /> : check.ok === false ? <XCircle className="h-3.5 w-3.5" /> : <CircleHelp className="h-3.5 w-3.5" />}
                      {check.label}
                    </li>
                  ))}
                </ul>
              )}

              {result.credential && (
                <div className="share">
                  <QRCodeSVG value={shareUrl} size={112} marginSize={1} aria-label="QR code of this verification page" />
                  <div className="min-w-0">
                    <p className="share-title">Share this check</p>
                    <button type="button" className="btn-ghost" onClick={() => copyText(shareUrl, "Verification link copied")}>
                      <Copy className="h-3.5 w-3.5" /> Copy verification link
                    </button>
                  </div>
                </div>
              )}

              <div className="actions">
                <a
                  href={getExplorerUrl(result.assetAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline"
                >
                  View on Solana Explorer
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button type="button" onClick={reset} className="btn-ghost">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Verify another
                </button>
              </div>
            </div>
          ) : (
            <div className="state is-empty">
              <ScanSearch className="state-icon text-ink/30" />
              <p className="state-title">No lookup yet</p>
              <p className="state-text">
                Enter an address above and the verification result will appear
                here.
              </p>
            </div>
          )}
        </section>

        <aside className="how">
          <h2 className="section-label">How it works</h2>
          <ol className="steps">
            {STEPS.map(([title, copy], index) => (
              <li key={title} className="step">
                <span className="step-num">{index + 1}</span>
                <div>
                  <p className="step-title">{title}</p>
                  <p className="step-text">{copy}</p>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
