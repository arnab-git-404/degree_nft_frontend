import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Flame, KeyRound, RotateCcw, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../../lib/api";
import { formatDate } from "../../lib/admin";
import { shortenAddress } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/Button";
import { AdminError, AdminLoading, AdminPageHeader } from "../../components/admin/AdminUI";
import { CatalogModal, StatusPill } from "../../components/CatalogPage/CatalogPage";
import { ReasonModal } from "../../components/ReasonModal";
import "./InstitutionApprovals.css";

const STATUSES = {
  WAITING_FOR_WALLET: { label: "Waiting for student", tone: "neutral" },
  PENDING_APPROVAL: { label: "Needs approval", tone: "warning" },
  EXECUTED: { label: "Done", tone: "success" },
  FAILED: { label: "Failed: retry", tone: "danger" },
  REJECTED: { label: "Rejected", tone: "danger" },
};
const KINDS = { RECOVERY: { label: "Wallet recovery", icon: KeyRound }, BURN: { label: "Burn", icon: Flame } };
const OPEN = ["WAITING_FOR_WALLET", "PENDING_APPROVAL", "FAILED"];

function Approval({ label, approval }) {
  return (
    <div className={`appr-step ${approval?.userId ? "is-done" : ""}`}>
      <span className="appr-step__label">{label}</span>
      {approval?.userId ? (
        <span>
          <CheckCircle2 className="inline h-3.5 w-3.5" /> {approval.name || "Approved"} · {formatDate(approval.at)}
        </span>
      ) : (
        <span className="text-ink/45">Waiting</span>
      )}
    </div>
  );
}

// College › Approvals: wallet recoveries and burns, each needing a first and a final approval by two different people.
export function InstitutionApprovals() {
  const { activeMembership, hasPermission, user } = useAuth();
  const institution = activeMembership?.institutionId;
  const canFirst = hasPermission("approval:first");
  const canFinal = hasPermission("approval:final");
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("open");
  const [finalFor, setFinalFor] = useState(null); // request about to get its final approval
  const [understood, setUnderstood] = useState(false);
  const [rejecting, setRejecting] = useState(null);
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/institution/credential-requests");
      setRequests(data.requests);
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
      const { data } = await api.post(`/institution/credential-requests/${request._id}/${path}`, body);
      if (data.request?.status === "FAILED") toast.error("The on-chain step failed. Nothing was lost; use Retry.");
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

  const giveFinal = async (event) => {
    event.preventDefault();
    const done = await act(finalFor, "approve-final", { confirmIrreversible: finalFor.kind === "BURN" }, finalFor.kind === "BURN" ? "Burned on-chain" : "Credentials moved to the new wallet");
    if (done) setFinalFor(null);
  };

  const shown = (requests || []).filter((request) => (filter === "open" ? OPEN.includes(request.status) : true));
  const tags = requests && [
    { label: "Need approval", value: requests.filter((request) => request.status === "PENDING_APPROVAL").length, tone: "warn" },
    { label: "Waiting for student", value: requests.filter((request) => request.status === "WAITING_FOR_WALLET").length, tone: "neutral" },
    { label: "Failed", value: requests.filter((request) => request.status === "FAILED").length, tone: "red" },
    { label: "Done", value: requests.filter((request) => request.status === "EXECUTED").length, tone: "ok" },
  ];

  return (
    <div className="catalog-page institution-approvals">
      <AdminPageHeader
        title="Approvals"
        description="Wallet recoveries and burns need a first and a final approval from two different people. The action runs on-chain right after the final approval."
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
                <button type="button" className={filter === "open" ? "is-on" : ""} onClick={() => setFilter("open")}>
                  Open
                </button>
                <button type="button" className={filter === "all" ? "is-on" : ""} onClick={() => setFilter("all")}>
                  All
                </button>
              </div>
            </div>

            {shown.length === 0 && <div className="panel empty">{filter === "open" ? "Nothing waiting for approval." : "No requests yet."}</div>}

            <div className="appr-list">
              {shown.map((request) => {
                const Kind = KINDS[request.kind];
                const subject = request.kind === "RECOVERY" ? request.studentId?.fullName : request.credentialId?.name;
                const firstIsMe = String(request.approvals?.first?.userId) === String(user?._id);
                return (
                  <article key={request._id} className="appr-card">
                    <header>
                      <span className={`appr-kind kind-${request.kind.toLowerCase()}`}>
                        <Kind.icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3>
                          {Kind.label}: {subject || "—"}
                        </h3>
                        <p>
                          Requested by {request.requestedBy?.name || "—"} · {formatDate(request.requestedBy?.at || request.createdAt)}
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
                          <dd>{request.toWallet ? <code>{request.toWallet}</code> : "Not confirmed by the student yet (recovery link sent by email)"}</dd>
                        </>
                      )}
                      {request.kind === "BURN" && request.credentialId?.studentWallet && (
                        <>
                          <dt>Held by</dt>
                          <dd>
                            <code>{shortenAddress(request.credentialId.studentWallet, 6)}</code>
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
                          <dd className="text-red-700">{request.results.filter((result) => result.error).at(-1).error}</dd>
                        </>
                      )}
                    </dl>

                    <div className="appr-steps">
                      <Approval label="First approval" approval={request.approvals?.first} />
                      <Approval label="Final approval" approval={request.approvals?.final} />
                    </div>

                    {OPEN.includes(request.status) && (
                      <footer>
                        {request.status === "PENDING_APPROVAL" && !request.approvals?.first?.userId && canFirst && (
                          <Button size="sm" disabled={busyId === request._id} onClick={() => act(request, "approve-first", undefined, "First approval given")}>
                            Give first approval
                          </Button>
                        )}
                        {request.status === "PENDING_APPROVAL" && request.approvals?.first?.userId && canFinal && (
                          <Button
                            size="sm"
                            disabled={busyId === request._id || firstIsMe}
                            title={firstIsMe ? "You gave the first approval; a different person must give the final one" : undefined}
                            onClick={() => {
                              setUnderstood(false);
                              setFinalFor(request);
                            }}
                          >
                            Give final approval
                          </Button>
                        )}
                        {request.status === "FAILED" && canFinal && (
                          <Button size="sm" disabled={busyId === request._id} onClick={() => act(request, "retry", undefined, "Done")}>
                            <RotateCcw className="h-3.5 w-3.5" /> Retry
                          </Button>
                        )}
                        {(canFirst || canFinal) && (
                          <Button size="sm" variant="ghost" className="text-red-700" disabled={busyId === request._id} onClick={() => setRejecting(request)}>
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

      {finalFor && (
        <CatalogModal
          title={`Final approval: ${KINDS[finalFor.kind].label}`}
          submitLabel={finalFor.kind === "BURN" ? "Approve and burn" : "Approve and move"}
          isSaving={busyId === finalFor._id || !understood}
          onClose={() => setFinalFor(null)}
          onSubmit={giveFinal}
        >
          <div className="space-y-3 text-[13px] text-ink/80">
            {finalFor.kind === "BURN" ? (
              <p>
                This <b>destroys the NFT on-chain</b> right now. It can&apos;t be undone. The credential record stays, marked Revoked.
              </p>
            ) : (
              <p>
                This moves all of <b>{finalFor.studentId?.fullName}</b>&apos;s credentials from your college to <code>{finalFor.toWallet}</code> right now, and
                links their profile to that wallet. The old link is kept in the history.
              </p>
            )}
            <label className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
              <input type="checkbox" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} />
              <span>I have checked this request and understand it runs on-chain immediately.</span>
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
            if (await act(rejecting, "reject", { reason }, "Request rejected")) setRejecting(null);
          }}
        />
      )}
    </div>
  );
}
