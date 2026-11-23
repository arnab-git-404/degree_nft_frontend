import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Link2 } from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../../../lib/api";
import { formatDate } from "../../../lib/admin";
import { Button } from "../../../components/Button";
import { AdminError, AdminLoading } from "../../../components/admin/AdminUI";
import { CatalogModal } from "../../../components/CatalogPage/CatalogPage";

const ROLES = [
  ["minting", "Minting", "Mints credentials and updates their metadata. Cannot move or burn them."],
  ["freeze", "Freeze", "Can unfreeze the whole collection: the most sensitive key."],
  ["recovery", "Recovery", "Moves a credential to a student's new wallet (lost wallet)."],
  ["burn", "Burn", "Exceptional destruction of a credential."],
];

const explorer = (address, network) => `https://explorer.solana.com/address/${address}${network === "mainnet" ? "" : "?cluster=devnet"}`;

// Admin › Institutions › On-chain: the college's Metaplex Core collection, created once and never changeable.
export function ChainPanel({ institution }) {
  const [chain, setChain] = useState(undefined); // undefined = loading, null = not set up
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/admin/institutions/${institution._id}/chain`);
      setChain(data.chain);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load the on-chain setup"));
    }
  }, [institution._id]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (event) => {
    event.preventDefault();
    setIsCreating(true);
    try {
      const { data } = await api.post(`/admin/institutions/${institution._id}/chain`);
      setChain(data.chain);
      setConfirming(false);
      toast.success(`${institution.name} can now issue on-chain credentials`);
    } catch (createError) {
      toast.error(getErrorMessage(createError, "Failed to create the collection"));
    } finally {
      setIsCreating(false);
    }
  };

  if (error) return <AdminError message={error} />;
  if (chain === undefined) return <AdminLoading />;

  if (!chain) {
    const ready = institution.verificationStatus === "VERIFIED";
    return (
      <div className="chain-panel">
        <p className="chain-panel__text">
          {ready
            ? "Not set up yet. Creating the collection lets this college's students claim credentials on-chain."
            : "Verify this college first; only verified colleges get an on-chain collection."}
        </p>
        <Button size="sm" disabled={!ready} onClick={() => setConfirming(true)}>
          <Link2 className="h-3.5 w-3.5" /> Create credential collection
        </Button>
        {confirming && (
          <CatalogModal
            title={`Create the collection for ${institution.name}`}
            submitLabel="Create collection"
            isSaving={isCreating || !understood}
            onClose={() => setConfirming(false)}
            onSubmit={create}
          >
            <div className="chain-confirm">
              <p>
                This creates the college&apos;s Metaplex Core collection with four separate keys. Its rules are <b>permanent</b>: students can&apos;t
                transfer or burn credentials, the recovery key can move a credential to a new wallet, and only the burn key can destroy one. They can
                never be changed after creation.
              </p>
              <p>The platform pays the small creation fee.</p>
              <label className="chain-confirm__check">
                <input type="checkbox" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} />
                <span>I understand this is permanent.</span>
              </label>
            </div>
          </CatalogModal>
        )}
      </div>
    );
  }

  return (
    <div className="chain-panel">
      <dl className="chain-facts">
        <dt>Collection ({chain.network})</dt>
        <dd>
          <code>{chain.collectionAddress}</code>
          <a href={explorer(chain.collectionAddress, chain.network)} target="_blank" rel="noopener noreferrer" aria-label="Open in Solana Explorer">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </dd>
        <dt>Created</dt>
        <dd>{formatDate(chain.createdAt)}</dd>
        {ROLES.map(([role, label, hint]) => (
          <div key={role} className="contents">
            <dt title={hint}>{label} key</dt>
            <dd>
              <code>{chain.keys[role]}</code>
              <span className="chain-hint">{hint}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
