import { useCallback, useEffect, useState } from "react";
import { Copy, ExternalLink, RefreshCw, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../../lib/api";
import { formatDate } from "../../lib/admin";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/Button";
import { AdminError, AdminLoading, AdminPageHeader } from "../../components/admin/AdminUI";
import { StatusPill } from "../../components/CatalogPage/CatalogPage";
import "./InstitutionBilling.css";

// Ledger amounts are whole base units: lamports (SOL) and micro-USDC.
const UNITS = { SOL: 1e9, USDC: 1e6 };
const formatAmount = (units, currency) =>
  units == null ? "—" : `${(units / UNITS[currency]).toLocaleString(undefined, { maximumFractionDigits: currency === "SOL" ? 6 : 2 })} ${currency}`;

const KINDS = {
  DEPOSIT: { label: "Payment", tone: "success" },
  CHARGE: { label: "Credential", tone: "info" },
  REFUND: { label: "Refund", tone: "success" },
  ADJUSTMENT: { label: "Adjustment", tone: "neutral" },
};

const explorer = (path, network) => `https://explorer.solana.com/${path}${network === "mainnet" ? "" : "?cluster=devnet"}`;

const copy = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  } catch {
    toast.error("Could not copy; select and copy it instead");
  }
};

// College › Billing: the prepaid balance that pays for each credential the college's students claim.
export function InstitutionBilling() {
  const { activeMembership } = useAuth();
  const institution = activeMembership?.institutionId;
  const [billing, setBilling] = useState(null);
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/institution/billing");
      setBilling(data);
      setError("");
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load billing"));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, institution?._id]);

  const checkPayments = async () => {
    setIsChecking(true);
    try {
      const { data } = await api.post("/institution/billing/sync");
      toast.success(data.added ? `${data.added} new payment${data.added > 1 ? "s" : ""} credited` : "No new payments found yet");
      await load();
    } catch (checkError) {
      toast.error(getErrorMessage(checkError, "Could not check for payments"));
    } finally {
      setIsChecking(false);
    }
  };

  const prices = billing?.prices || {};
  const balances = billing?.balances || {};
  const canMint = ["USDC", "SOL"].some((currency) => prices[currency] && balances[currency] >= prices[currency]);
  const left = (currency) => (prices[currency] ? Math.max(0, Math.floor(balances[currency] / prices[currency])) : 0);
  const tags = billing && [
    { label: "USDC balance", value: formatAmount(balances.USDC, "USDC"), tone: "total" },
    { label: "SOL balance", value: formatAmount(balances.SOL, "SOL"), tone: "total" },
    { label: "Credentials left", value: left("USDC") + left("SOL"), tone: canMint ? "active" : "red" },
    { label: "Price per credential", value: prices.USDC ? `${formatAmount(prices.USDC, "USDC")} or ${formatAmount(prices.SOL, "SOL")}` : "Not set yet", tone: "neutral" },
  ];

  return (
    <div className="catalog-page institution-billing">
      <AdminPageHeader
        title="Billing"
        description={`Prepaid balance of ${institution?.name || "your college"}. Each credential a student claims is charged once, only when it is issued.`}
        actions={
          <Button onClick={checkPayments} disabled={isChecking || !billing}>
            <RefreshCw className={`h-4 w-4 ${isChecking ? "animate-spin" : ""}`} /> Check for new payments
          </Button>
        }
      />

      <AdminError message={error} />

      {!billing && !error ? (
        <AdminLoading />
      ) : (
        billing && (
          <>
            <div className="bill-tags">
              {tags.map((tag) => (
                <span key={tag.label} className={`bill-tag tag-${tag.tone}`}>
                  <i aria-hidden="true" />
                  <b>{tag.value}</b> {tag.label}
                </span>
              ))}
            </div>

            {!billing.chain && (
              <p className="bill-note bill-note--warn">
                Your college is not set up for on-chain credentials yet. The DegreeNFT team creates your college&apos;s collection; until then students cannot claim.
              </p>
            )}
            {billing.chain && !canMint && (
              <p className="bill-note bill-note--bad">Your balance is too low to issue a credential. Students will not be able to claim until you top up.</p>
            )}

            <section className="bill-pay">
              <header>
                <span className="bill-pay__icon">
                  <Wallet className="h-5 w-5" />
                </span>
                <div>
                  <h2>Top up your balance</h2>
                  <p>Send SOL or USDC ({billing.network}) to the DegreeNFT treasury, then press &ldquo;Check for new payments&rdquo;. A payment can take a few seconds to show up.</p>
                </div>
              </header>
              <dl>
                <dt>Send to (DegreeNFT treasury)</dt>
                <dd>
                  {billing.treasuryAddress ? (
                    <>
                      <code>{billing.treasuryAddress}</code>
                      <button type="button" className="bill-copy" onClick={() => copy(billing.treasuryAddress)} aria-label="Copy treasury address">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <span className="text-red-700">Not configured yet: contact DegreeNFT.</span>
                  )}
                </dd>
                <dt>Send from (your college wallet)</dt>
                <dd>
                  <code>{billing.payFromWallet}</code>
                  <span className="bill-hint">Only payments from this wallet are credited to your college.</span>
                </dd>
                <dt>USDC token</dt>
                <dd>
                  <code>{billing.usdcMint}</code>
                </dd>
              </dl>
            </section>

            <div className="table-card">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Details</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billing.entries.map((entry) => (
                      <tr key={entry._id}>
                        <td>{formatDate(entry.createdAt)}</td>
                        <td>
                          <StatusPill statuses={KINDS} value={entry.kind} />
                        </td>
                        <td className="bill-details">
                          {entry.note || "—"}
                          {entry.signature && (
                            <a href={explorer(`tx/${entry.signature}`, billing.network)} target="_blank" rel="noopener noreferrer">
                              Transaction <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </td>
                        <td className={`text-right tabular-nums ${entry.amount < 0 ? "text-red-700" : "text-emerald-700"}`}>
                          {entry.amount > 0 ? "+" : "−"}
                          {formatAmount(Math.abs(entry.amount), entry.currency)}
                        </td>
                      </tr>
                    ))}
                    {billing.entries.length === 0 && (
                      <tr>
                        <td colSpan={4} className="empty">
                          No payments or charges yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}
