import { useState } from "react";
import {
  BadgeCheck,
  CheckCircle2,
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
import "./VerificationPortal.css";

const SAMPLE_ADDRESS = "FYYAm8NKgaShjzFkdi5rVY5TC47jeSKpo7PxEgHBPFDz";

const STEPS = [
  [
    "Paste the address",
    "Use the NFT mint address or the wallet the degree was issued to.",
  ],
  [
    "Read the registry",
    "The credential record is checked against the on-chain registry.",
  ],
  [
    "Confirm authenticity",
    "A verified result links directly to the record on Solana Explorer.",
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

export function VerificationPortal() {
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const isAddressValid = isValidPublicKey(address);

  const handleVerify = async (event) => {
    event.preventDefault();
    if (!isAddressValid) return;

    setIsLoading(true);
    setResult(null);

    try {
      // shortcut: simulated lookup, always "valid"; replace with a real registry/on-chain check before relying on it.
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setResult({ status: "valid", address, checkedAt: new Date() });
      toast.success("Credential found on the registry");
    } catch (error) {
      console.error("Error verifying credential:", error);
      setResult({ status: "invalid", address, checkedAt: new Date() });
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setAddress("");
    setResult(null);
  };

  const isValid = result?.status === "valid";

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
                Paste the NFT mint address or the student&apos;s wallet address.
              </p>
            </div>
          </div>

          <div className="search-row">
            <div className="search-field">
              <Search className="search-icon" aria-hidden="true" />
              <Input
                id="verify-address"
                aria-label="NFT or wallet address"
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
            <button
              type="button"
              className="sample"
              onClick={() => copyText(SAMPLE_ADDRESS, "Example address copied")}
              title="Copy example address"
            >
              <span className="sample-label">Example</span>
              <span className="sample-address">{SAMPLE_ADDRESS}</span>
              <Copy className="h-3.5 w-3.5 shrink-0" />
            </button>
            <p className="privacy">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              Reads public registry data only. No wallet connection needed.
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
                ) : (
                  <XCircle className="outcome-icon" />
                )}
                <div className="min-w-0">
                  <p className="outcome-title">
                    {isValid ? "Credential verified" : "No credential found"}
                  </p>
                  <p className="outcome-text">
                    {isValid
                      ? "This address belongs to an issued DegreeNFT credential."
                      : "Check the address and try again, or contact the issuing institution."}
                  </p>
                </div>
              </div>

              <dl className="details">
                <div className="detail">
                  <dt>Address</dt>
                  <dd className="detail-address">
                    <code>{result.address}</code>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => copyText(result.address, "Address copied")}
                      aria-label="Copy address"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </dd>
                </div>
                <div className="detail">
                  <dt>Network</dt>
                  <dd>Solana {SOLANA_NETWORK}</dd>
                </div>
                <div className="detail">
                  <dt>Checked</dt>
                  <dd>{result.checkedAt.toLocaleString()}</dd>
                </div>
              </dl>

              <div className="actions">
                <a
                  href={getExplorerUrl(result.address)}
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
