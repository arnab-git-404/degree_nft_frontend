import { useEffect, useState } from "react";
import { Coins, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../../../lib/api";
import { Button } from "../../../components/Button";
import { AdminError } from "../../../components/admin/AdminUI";

const UNITS = { SOL: 1e9, USDC: 1e6 };
const toText = (units, currency) => (units ? String(units / UNITS[currency]) : "");

// Admin › Settings › Credential pricing: the one global price per credential, plus the wallets billing relies on.
export function BillingSettings() {
  const [info, setInfo] = useState(null);
  const [form, setForm] = useState({ priceSol: "", priceUsdc: "" });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    api
      .get("/admin/settings/billing")
      .then(({ data }) => {
        setInfo(data);
        setForm({ priceSol: toText(data.prices.SOL, "SOL"), priceUsdc: toText(data.prices.USDC, "USDC") });
      })
      .catch((loadError) => setError(getErrorMessage(loadError, "Failed to load pricing")));
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const { data } = await api.put("/admin/settings/billing", form);
      setInfo((current) => ({ ...current, prices: data.prices }));
      toast.success("Credential price saved");
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, "Failed to save the price"));
    } finally {
      setIsSaving(false);
    }
  };

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const unset = info && (!info.prices.SOL || !info.prices.USDC);

  return (
    <section className="settings-card">
      <header className="card-head">
        <span className="card-icon">
          <Coins className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="card-title">Credential pricing</h2>
          <p className="card-sub">
            What a college pays DegreeNFT for each credential a student claims, from its prepaid balance (USDC is used first, then SOL).
            Students pay nothing.
          </p>
        </div>
        {info && (
          <span className={`state-pill ${unset ? "" : "is-on"}`}>
            <span className="state-dot" aria-hidden="true" />
            {unset ? "Not set: minting blocked" : "Active"}
          </span>
        )}
      </header>

      <div className="card-body">
        <AdminError message={error} />
        {info && (
          <form id="billing-settings-form" onSubmit={save} className="card-section">
            <div className="field-grid">
              <div className="space-y-1.5">
                <label htmlFor="price-usdc" className="field-label">Price in USDC</label>
                <input id="price-usdc" className="input-field" inputMode="decimal" placeholder="e.g. 2" required value={form.priceUsdc} onChange={set("priceUsdc")} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="price-sol" className="field-label">Price in SOL</label>
                <input id="price-sol" className="input-field" inputMode="decimal" placeholder="e.g. 0.01" required value={form.priceSol} onChange={set("priceSol")} />
              </div>
            </div>
            <dl className="billing-facts">
              <dt>Network</dt>
              <dd>{info.network}</dd>
              <dt>Treasury (colleges pay here)</dt>
              <dd>{info.treasuryAddress ? <code>{info.treasuryAddress}</code> : <span className="text-red-700">Not set: add DEGREENFT_TREASURY_ADDRESS to the server .env</span>}</dd>
              <dt>Fee payer (pays chain costs)</dt>
              <dd>
                {info.feePayer?.address ? (
                  <>
                    <code>{info.feePayer.address}</code> · {(info.feePayer.lamports / 1e9).toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL
                  </>
                ) : (
                  <span className="text-red-700">{info.feePayer?.error || "Not configured"}</span>
                )}
              </dd>
              <dt>USDC token</dt>
              <dd>
                <code>{info.usdcMint}</code>
              </dd>
            </dl>
          </form>
        )}
      </div>

      {info && (
        <footer className="card-foot">
          <span className="save-state">Changes apply to the next claim.</span>
          <Button type="submit" form="billing-settings-form" disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save price
          </Button>
        </footer>
      )}
    </section>
  );
}
