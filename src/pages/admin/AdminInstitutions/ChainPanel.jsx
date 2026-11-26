import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Link2, Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../../../lib/api";
import { formatDate } from "../../../lib/admin";
import { isValidPublicKey } from "../../../lib/solana";
import { Button } from "../../../components/Button";
import { AdminError, AdminLoading } from "../../../components/admin/AdminUI";
import { CatalogModal } from "../../../components/CatalogPage/CatalogPage";

const explorer = (address, network) => `https://explorer.solana.com/address/${address}${network === "mainnet" ? "" : "?cluster=devnet"}`;

// Admin › Institutions › On-chain: the college's Metaplex Core collection, created once and never changeable.
export function ChainPanel({ institution }) {
  const [chain, setChain] = useState(undefined); // undefined = loading, null = not set up
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  // The college officials who approve recoveries and burns (their wallets), and how many must agree.
  const [members, setMembers] = useState(["", "", ""]);
  const [threshold, setThreshold] = useState(2);
  const filled = members.map((member) => member.trim()).filter(Boolean);
  const membersValid = filled.length >= 2 && filled.every(isValidPublicKey) && new Set(filled).size === filled.length;

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
      const { data } = await api.post(`/admin/institutions/${institution._id}/chain`, { members: filled, threshold: Math.min(threshold, filled.length) });
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
            isSaving={isCreating || !understood || !membersValid}
            onClose={() => setConfirming(false)}
            onSubmit={create}
          >
            <div className="chain-confirm">
              <p>
                This creates the college&apos;s Metaplex Core collection. Its rules are <b>permanent</b>: credentials can never be transferred or
                unfrozen by anyone (there is no freeze key). Only the college officials below, together, can move a credential to a student&apos;s new
                wallet or burn one.
              </p>
              <div className="space-y-2">
                <p className="field-label">Approving officials (their Solana wallets)</p>
                {members.map((member, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      className="input-field font-mono text-[12px]"
                      placeholder={`Official ${index + 1} wallet`}
                      value={member}
                      aria-invalid={Boolean(member.trim()) && !isValidPublicKey(member.trim())}
                      onChange={(event) => setMembers((list) => list.map((item, position) => (position === index ? event.target.value : item)))}
                    />
                    {members.length > 2 && (
                      <button type="button" className="icon-btn" aria-label={`Remove official ${index + 1}`} onClick={() => setMembers((list) => list.filter((_, position) => position !== index))}>
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                {members.length < 10 && (
                  <button type="button" className="chain-add" onClick={() => setMembers((list) => [...list, ""])}>
                    <Plus className="h-3.5 w-3.5" /> Add an official
                  </button>
                )}
                <label className="flex items-center gap-2">
                  <span className="field-label">Approvals needed</span>
                  <select className="select-field w-24" value={threshold} onChange={(event) => setThreshold(Number(event.target.value))}>
                    {Array.from({ length: Math.max(filled.length, 2) - 1 }, (_, i) => i + 2).map((count) => (
                      <option key={count} value={count}>
                        {count} of {Math.max(filled.length, 2)}
                      </option>
                    ))}
                  </select>
                </label>
                {!membersValid && <p className="chain-hint">Enter at least 2 different, valid wallets. 3 officials with 2 approvals lets the college act when one is away.</p>}
              </div>
              <p>The platform pays the small creation fees.</p>
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
        <dt>Minting key</dt>
        <dd>
          <code>{chain.mintingAddress}</code>
          <span className="chain-hint">Held by DegreeNFT. Mints credentials and updates their details; cannot move, burn or unfreeze them.</span>
        </dd>
        <dt>Freeze key</dt>
        <dd>
          <span>None</span>
          <span className="chain-hint">Credentials are frozen for good; nobody can make them transferable.</span>
        </dd>
        {chain.multisig && (
          <>
            <dt>Officials&apos; multisig</dt>
            <dd>
              <code>{chain.multisig.address}</code>
              <span className="chain-hint">
                Any {chain.multisig.threshold} of these {chain.multisig.members.length} officials must approve a wallet recovery or a burn.
              </span>
            </dd>
            {chain.multisig.members.map((member, index) => (
              <div key={member} className="contents">
                <dt>Official {index + 1}</dt>
                <dd>
                  <code>{member}</code>
                </dd>
              </div>
            ))}
          </>
        )}
      </dl>
    </div>
  );
}
