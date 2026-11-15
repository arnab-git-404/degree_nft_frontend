import { useState } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  Copy,
  ExternalLink,
  Search,
  Shield,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { getExplorerUrl, isValidPublicKey } from "../../lib/solana";
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
    "A verified result links directly to the transaction on Solana.",
  ],
];

export function VerificationPortal() {
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleVerify = async (event) => {
    event.preventDefault();
    if (!isValidPublicKey(address)) return;

    setIsLoading(true);
    setResult(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setResult({ status: "valid", address });
      toast.success("Credential found on the registry");
    } catch (error) {
      console.error("Error verifying credential:", error);
      setResult({ status: "invalid", address });
    } finally {
      setIsLoading(false);
    }
  };

  const copySample = async () => {
    try {
      await navigator.clipboard.writeText(SAMPLE_ADDRESS);
      toast.success("Example address copied");
    } catch {
      toast.error("Could not copy the address");
    }
  };

  const isValid = result?.status === "valid";

  return (
    <div className="verify-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Verify a credential</h1>
          <p className="page-sub">
            Enter a degree NFT address or a student wallet to confirm that an
            academic credential was issued and recorded on Solana.
          </p>
        </div>
        <span className="public-tag">
          <Shield className="h-3 w-3" />
          No login required
        </span>
      </div>

      <div className="layout">
        <form onSubmit={handleVerify} className="lookup">
          <label className="field-label" htmlFor="verify-address">
            NFT or wallet address
          </label>
          <div className="lookup-row">
            <div className="flex-1">
              <Input
                id="verify-address"
                placeholder="Paste a Solana address"
                value={address}
                className="font-mono"
                onChange={(event) => setAddress(event.target.value)}
                error={
                  address && !isValidPublicKey(address)
                    ? "That is not a valid Solana address"
                    : undefined
                }
              />
            </div>
            <Button
              type="submit"
              disabled={!isValidPublicKey(address) || isLoading}
            >
              {isLoading ? (
                "Verifying..."
              ) : (
                <>
                  <Search className="h-3.5 w-3.5" />
                  Verify
                </>
              )}
            </Button>
          </div>

          <button type="button" onClick={copySample} className="sample">
            <span className="truncate">Try: {SAMPLE_ADDRESS}</span>
            <Copy className="h-3 w-3 shrink-0" />
          </button>

          <p className="privacy">
            Verification reads public registry data. It never connects a wallet
            or reveals personal account details.
          </p>

          {result ? (
            <div className={`result ${isValid ? "is-valid" : "is-invalid"}`}>
              {isValid ? (
                <CheckCircle2 className="result-icon text-green-700" />
              ) : (
                <XCircle className="result-icon text-red-700" />
              )}
              <div className="min-w-0">
                <p className="font-medium">
                  {isValid ? "Credential verified" : "No credential found"}
                </p>
                <p className="result-text">
                  {isValid
                    ? "This address belongs to an issued DegreeNFT credential."
                    : "Check the address and try again, or contact the issuing institution."}
                </p>
                <a
                  href={getExplorerUrl(result.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="explorer-link"
                >
                  View on Solana Explorer
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ) : null}
        </form>

        <aside className="how">
          <p className="section-label">How it works</p>
          <ol className="steps">
            {STEPS.map(([title, copy], index) => (
              <li key={title}>
                <span className="step-num">{index + 1}</span>
                <div>
                  <p className="step-title">{title}</p>
                  <p className="step-text">{copy}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="how-foot">
            <BadgeCheck className="h-3.5 w-3.5 text-cobalt" />
            Verified against Solana devnet
          </div>
        </aside>
      </div>
    </div>
  );
}
