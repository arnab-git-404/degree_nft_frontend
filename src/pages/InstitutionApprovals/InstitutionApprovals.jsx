import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { VersionedTransaction } from "@solana/web3.js";
import { Buffer } from "buffer";
import {
  CheckCircle2,
  Flame,
  KeyRound,
  RotateCcw,
  Wallet,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../../lib/api";
import { formatDate } from "../../lib/admin";
import { shortenAddress } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/Button";
import {
  AdminError,
  AdminLoading,
  AdminPageHeader,
} from "../../components/admin/AdminUI";
import {
  CatalogModal,
  StatusPill,
} from "../../components/CatalogPage/CatalogPage";
import { ReasonModal } from "../../components/ReasonModal";
import "./InstitutionApprovals.css";

const STATUSES = {
  WAITING_FOR_WALLET: { label: "Waiting for student", tone: "neutral" },
  PENDING_APPROVAL: { label: "Needs approval", tone: "warning" },
  EXECUTED: { label: "Done", tone: "success" },
  FAILED: { label: "Failed: retry", tone: "danger" },
  REJECTED: { label: "Rejected", tone: "danger" },
};
const KINDS = {
  RECOVERY: { label: "Wallet recovery", icon: KeyRound },
  BURN: { label: "Burn", icon: Flame },
};
const OPEN = ["WAITING_FOR_WALLET", "PENDING_APPROVAL", "FAILED"];

function Approvals({ request, multisig }) {
  const done = request.walletApprovals || [];
  const needed = multisig?.threshold ?? 2;
  return (
    <div className="appr-steps">
      {Array.from({ length: Math.max(needed, done.length) }, (_, index) => {
        const approval = done[index];
        return (
          <div key={index} className={`appr-step ${approval ? "is-done" : ""}`}>
            <span className="appr-step__label">
              Approval {index + 1} of {needed}
            </span>
            {approval ? (
              <span>
                <CheckCircle2 className="inline h-3.5 w-3.5" />{" "}
                {approval.name || "Official"} ·{" "}
                {shortenAddress(approval.wallet, 4)} · {formatDate(approval.at)}
              </span>
            ) : (
              <span className="text-ink/45">Waiting for an official</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// College › Approvals: wallet recoveries and burns. The college officials approve with their own wallets; the college's
// multisig counts the approvals on-chain, and the action runs as soon as enough officials have approved.
export function InstitutionApprovals() {
  const { activeMembership, hasPermission } = useAuth();
  const { publicKey, signTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const wallet = publicKey?.toBase58() || "";
  const institution = activeMembership?.institutionId;
  const canApprove =
    hasPermission("approval:first") || hasPermission("approval:final");
  const [multisig, setMultisig] = useState(null);
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("open");
  const [approving, setApproving] = useState(null); // request this official is about to approve
  const [understood, setUnderstood] = useState(false);
  const [rejecting, setRejecting] = useState(null);
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/institution/credential-requests");
      setRequests(data.requests);
      setMultisig(data.multisig || null);
      setError("");
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load approvals"));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, institution?._id]);

  const act = async (request, path, body, success) => {
    setBusyId(request._id);
    try {
      const { data } = await api.post(
        `/institution/credential-requests/${request._id}/${path}`,
        body,
      );
      if (data.request?.status === "FAILED")
        toast.error("The on-chain step failed. Nothing was lost; use Retry.");
      else toast.success(success);
      await load();
      return true;
    } catch (actError) {
      toast.error(getErrorMessage(actError, "The action failed"));
      return false;
    } finally {
      setBusyId("");
    }
  };

  const isOfficial = Boolean(wallet && multisig?.members.includes(wallet));

  // The app builds the approval, the official's wallet signs it (no SOL needed: DegreeNFT pays the fee), the app sends it.
  const approve = async (event) => {
    event.preventDefault();
    const request = approving;
    setBusyId(request._id);
    try {
      const extra =
        request.kind === "BURN" ? { confirmIrreversible: "true" } : {};
      const { data: built } = await api.get(
        `/institution/credential-requests/${request._id}/approval-tx`,
        { params: { wallet, ...extra } },
      );
      const signed = await signTransaction(
        VersionedTransaction.deserialize(
          Buffer.from(built.transaction, "base64"),
        ),
      );
      const { data } = await api.post(
        `/institution/credential-requests/${request._id}/approval-tx`,
        {
          wallet,
          signedTransaction: Buffer.from(signed.serialize()).toString("base64"),
          ...extra,
        },
      );
      const status = data.request?.status;
      if (status === "EXECUTED")
        toast.success(
          request.kind === "BURN"
            ? "Approved: the credential was burned on-chain"
            : "Approved: the credentials moved to the new wallet",
        );
      else if (status === "FAILED")
        toast.error(
          "Approved, but the on-chain step failed. Nothing was lost; use Retry.",
        );
      else
        toast.success(
          `Approved (${data.request.walletApprovals.length} of ${data.threshold}). Waiting for another official.`,
        );
      setApproving(null);
      await load();
    } catch (approveError) {
      toast.error(
        getErrorMessage(
          approveError,
          approveError?.message || "The approval failed",
        ),
      );
    } finally {
      setBusyId("");
    }
  };

  const shown = (requests || []).filter((request) =>
    filter === "open" ? OPEN.includes(request.status) : true,
  );
  const tags = requests && [
    {
      label: "Need approval",
      value: requests.filter((request) => request.status === "PENDING_APPROVAL")
        .length,
      tone: "warn",
    },
    {
      label: "Waiting for student",
      value: requests.filter(
        (request) => request.status === "WAITING_FOR_WALLET",
      ).length,
      tone: "neutral",
    },
    {
      label: "Failed",
      value: requests.filter((request) => request.status === "FAILED").length,
      tone: "red",
    },
    {
      label: "Done",
      value: requests.filter((request) => request.status === "EXECUTED").length,
      tone: "ok",
    },
  ];

  return (
    <div className="catalog-page institution-approvals">
      <AdminPageHeader
        title="Approvals"
        description="Wallet recoveries and burns need approvals from the college officials, each signing with their own wallet. The action runs on-chain as soon as enough have approved."
      />
      <AdminError message={error} />

      {!requests && !error ? (
        <AdminLoading />
      ) : (
        requests && (
          <>
            <div className="appr-bar">
              <div className="appr-tags">
                {tags.map((tag) => (
                  <span key={tag.label} className={`appr-tag tag-${tag.tone}`}>
                    <i aria-hidden="true" />
                    <b>{tag.value}</b> {tag.label}
                  </span>
                ))}
              </div>
              <div className="seg" role="group" aria-label="Show">
                <button
                  type="button"
                  className={filter === "open" ? "is-on" : ""}
                  onClick={() => setFilter("open")}
                >
                  Open
                </button>
                <button
                  type="button"
                  className={filter === "all" ? "is-on" : ""}
                  onClick={() => setFilter("all")}
                >
                  All
                </button>
              </div>
            </div>

            {shown.length === 0 && (
              <div className="panel empty">
                {filter === "open"
                  ? "Nothing waiting for approval."
                  : "No requests yet."}
              </div>
            )}

            <div className="appr-list">
              {shown.map((request) => {
                const Kind = KINDS[request.kind];
                const subject =
                  request.kind === "RECOVERY"
                    ? request.studentId?.fullName
                    : request.credentialId?.name;
                const iApproved = (request.walletApprovals || []).some(
                  (approval) => approval.wallet === wallet,
                );
                return (
                  <article key={request._id} className="appr-card">
                    <header>
                      <span
                        className={`appr-kind kind-${request.kind.toLowerCase()}`}
                      >
                        <Kind.icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3>
                          {Kind.label}: {subject || "—"}
                        </h3>
                        <p>
                          Requested by {request.requestedBy?.name || "—"} ·{" "}
                          {formatDate(
                            request.requestedBy?.at || request.createdAt,
                          )}
                        </p>
                      </div>
                      <StatusPill statuses={STATUSES} value={request.status} />
                    </header>

                    <dl>
                      <dt>Reason</dt>
                      <dd>{request.reason}</dd>
                      {request.kind === "RECOVERY" && (
                        <>
                          <dt>New wallet</dt>
                          <dd>
                            {request.toWallet ? (
                              <code>{request.toWallet}</code>
                            ) : (
                              "Not confirmed by the student yet (recovery link sent by email)"
                            )}
                          </dd>
                        </>
                      )}
                      {request.kind === "BURN" &&
                        request.credentialId?.studentWallet && (
                          <>
                            <dt>Held by</dt>
                            <dd>
                              <code>
                                {shortenAddress(
                                  request.credentialId.studentWallet,
                                  6,
                                )}
                              </code>
                            </dd>
                          </>
                        )}
                      {request.rejection?.reason && (
                        <>
                          <dt>Rejected</dt>
                          <dd>
                            {request.rejection.name}: {request.rejection.reason}
                          </dd>
                        </>
                      )}
                      {request.results?.some((result) => result.error) && (
                        <>
                          <dt>Last error</dt>
                          <dd className="text-red-700">
                            {
                              request.results
                                .filter((result) => result.error)
                                .at(-1).error
                            }
                          </dd>
                        </>
                      )}
                    </dl>

                    <Approvals request={request} multisig={multisig} />

                    {OPEN.includes(request.status) && (
                      <footer>
                        {request.status === "PENDING_APPROVAL" &&
                          canApprove &&
                          !wallet && (
                            <Button size="sm" onClick={() => setVisible(true)}>
                              <Wallet className="h-3.5 w-3.5" /> Connect your
                              official wallet to approve
                            </Button>
                          )}
                        {request.status === "PENDING_APPROVAL" &&
                          canApprove &&
                          wallet && (
                            <Button
                              size="sm"
                              disabled={
                                busyId === request._id ||
                                !isOfficial ||
                                iApproved
                              }
                              title={
                                !isOfficial
                                  ? `The connected wallet (${shortenAddress(wallet, 4)}) is not one of the college's approving officials`
                                  : iApproved
                                    ? "This wallet has already approved"
                                    : undefined
                              }
                              onClick={() => {
                                setUnderstood(false);
                                setApproving(request);
                              }}
                            >
                              <Wallet className="h-3.5 w-3.5" />{" "}
                              {iApproved
                                ? "You approved"
                                : "Approve with my wallet"}
                            </Button>
                          )}
                        {request.status === "FAILED" && canApprove && (
                          <Button
                            size="sm"
                            disabled={busyId === request._id}
                            onClick={() =>
                              act(request, "retry", undefined, "Done")
                            }
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Retry
                          </Button>
                        )}
                        {canApprove && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-700"
                            disabled={busyId === request._id}
                            onClick={() => setRejecting(request)}
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </Button>
                        )}
                      </footer>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        )
      )}

      {approving && (
        <CatalogModal
          title={`Approve: ${KINDS[approving.kind].label}`}
          submitLabel="Sign with my wallet"
          isSaving={busyId === approving._id || !understood}
          onClose={() => setApproving(null)}
          onSubmit={approve}
        >
          <div className="space-y-3 text-[13px] text-ink/80">
            <p>
              Your wallet will ask you to sign. Once {multisig?.threshold ?? 2}{" "}
              officials have approved, it runs on-chain immediately.
            </p>
            {approving.kind === "BURN" ? (
              <p>
                This <b>destroys the NFT on-chain</b> right now. It can&apos;t
                be undone. The credential record stays, marked Revoked.
              </p>
            ) : (
              <p>
                This moves all of <b>{approving.studentId?.fullName}</b>&apos;s
                credentials from your college to{" "}
                <code>{approving.toWallet}</code>, and links their profile to
                that wallet. The old link is kept in the history.
              </p>
            )}
            <label className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
              <input
                type="checkbox"
                checked={understood}
                onChange={(event) => setUnderstood(event.target.checked)}
              />
              <span>I have checked this request myself.</span>
            </label>
          </div>
        </CatalogModal>
      )}

      {rejecting && (
        <ReasonModal
          title={`Reject: ${KINDS[rejecting.kind].label}`}
          intro="Rejecting closes the request; nothing happens on-chain. A new request can be started later."
          submitLabel="Reject request"
          onClose={() => setRejecting(null)}
          onSubmit={async (reason) => {
            if (await act(rejecting, "reject", { reason }, "Request rejected"))
              setRejecting(null);
          }}
        />
      )}
    </div>
  );
}
