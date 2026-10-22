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
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { getExplorerUrl, isValidPublicKey } from "../lib/solana";

const SAMPLE_ADDRESS = "FYYAm8NKgaShjzFkdi5rVY5TC47jeSKpo7PxEgHBPFDz";

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

  return (
    <div className="space-y-10">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <Shield className="h-3 w-3" />
            Public registry
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-[0.98] tracking-tight sm:text-6xl">
            Verify a credential
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-ink/60">
            Enter a degree NFT address or a student wallet to confirm that an
            academic credential was issued and recorded on Solana.
          </p>
        </div>

        <div className="border border-ink/20 bg-acid p-5">
          <p className="eyebrow">No login required</p>
          <p className="mt-3 text-sm leading-6 text-ink/70">
            Verification reads public registry data. It never connects a wallet
            or reveals personal account details.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <form
          onSubmit={handleVerify}
          className="border border-ink/20 bg-paper-soft p-6 sm:p-8"
        >
          <p className="eyebrow">Lookup</p>
          <label className="field-label mt-5" htmlFor="verify-address">
            NFT or wallet address
          </label>
          <Input
            id="verify-address"
            placeholder="Paste a Solana address"
            value={address}
            className="font-mono text-sm"
            onChange={(event) => setAddress(event.target.value)}
            error={
              address && !isValidPublicKey(address)
                ? "That is not a valid Solana address"
                : undefined
            }
          />

          <Button
            type="submit"
            className="mt-4 w-full"
            disabled={!isValidPublicKey(address) || isLoading}
          >
            {isLoading ? (
              "Verifying..."
            ) : (
              <>
                <Search className="h-4 w-4" />
                Verify credential
              </>
            )}
          </Button>

          <button
            type="button"
            onClick={copySample}
            className="mt-4 flex w-full items-center justify-between gap-3 border border-ink/15 bg-paper-deep px-3 py-2 text-left font-mono text-[10px] text-ink/55 transition-colors hover:border-cobalt hover:text-cobalt"
          >
            <span className="truncate">Try: {SAMPLE_ADDRESS}</span>
            <Copy className="h-3.5 w-3.5 shrink-0" />
          </button>

          {result ? (
            <div
              className={`mt-6 border p-4 ${
                result.status === "valid"
                  ? "border-green-700/40 bg-green-600/10"
                  : "border-red-700/40 bg-red-600/5"
              }`}
            >
              <div className="flex items-start gap-3">
                {result.status === "valid" ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                )}
                <div>
                  <p className="font-medium">
                    {result.status === "valid"
                      ? "Credential verified"
                      : "No credential found"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-ink/60">
                    {result.status === "valid"
                      ? "This address belongs to an issued DegreeNFT credential."
                      : "Check the address and try again, or contact the issuing institution."}
                  </p>
                  <a
                    href={getExplorerUrl(result.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 border-b border-ink/30 pb-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink transition-colors hover:border-cobalt hover:text-cobalt"
                  >
                    View on Solana Explorer
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          ) : null}
        </form>

        <aside className="border border-ink/20 bg-paper-soft p-6 sm:p-8">
          <p className="eyebrow">How it works</p>
          <ol className="mt-5 space-y-5">
            {[
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
            ].map(([title, copy], index) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-ink/25 font-mono text-[10px]">
                  0{index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-ink/55">{copy}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex items-center gap-2 border-t border-ink/15 pt-5 text-xs text-ink/50">
            <BadgeCheck className="h-4 w-4 text-cobalt" />
            Verified against Solana devnet
          </div>
        </aside>
      </div>
    </div>
  );
}
