import { useEffect, useState } from "react";
import { Building2, Check, ExternalLink, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../../lib/api";
import { useAdminList } from "../../../hooks/useAdminList";
import { formatDate, statusTone } from "../../../lib/admin";
import { shortenAddress } from "../../../lib/utils";
import { Button } from "../../../components/Button";
import {
  AdminError,
  AdminLoading,
  AdminPageHeader,
  AdminPagination,
  AdminToolbar,
  StatusBadge,
} from "../../../components/admin/AdminUI";
import "./AdminApplications.css";

const FILTER_OPTIONS = [
  ["PENDING", "Waiting for review"],
  ["APPROVED", "Approved"],
  ["REJECTED", "Rejected"],
  ["all", "All applications"],
];

const DELIVERY_LABELS = {
  sent: "Activation email sent.",
  not_configured: "Email is not configured: send this link to the head yourself.",
  console: "Email is not configured (link printed in the server log): send this link to the head yourself.",
  failed: "Activation email failed: send this link to the head yourself.",
};

// Confirmation before approval: approving creates real records, so spell out what happens.
function ApproveModal({ application, busy, onConfirm, onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => event.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="approve-title" className="modal">
        <div className="modal-head">
          <span className="modal-icon">
            <Building2 className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="modal-kicker">Approve application</p>
            <h2 id="approve-title" className="modal-title">
              {application.name} <span className="application-code">{application.code}</span>
            </h2>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="icon-btn" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-lead">Approving will:</p>
          <ul className="modal-steps">
            <li>
              <Check className="step-icon" />
              <span>
                Create the institution <strong>{application.name}</strong> as active and verified.
              </span>
            </li>
            <li>
              <Check className="step-icon" />
              <span>
                Create an account for <strong>{application.contactName}</strong> ({application.email}) with wallet{" "}
                <code title={application.walletAddress}>{shortenAddress(application.walletAddress || "")}</code>.
              </span>
            </li>
            <li>
              <Check className="step-icon" />
              <span>
                Email them an approval message with the activation link. They become the college head once they
                activate.
              </span>
            </li>
          </ul>
          <p className="modal-note">This cannot be undone from this page.</p>
        </div>

        <div className="modal-foot">
          <Button size="sm" variant="ghost" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={busy} onClick={onConfirm} autoFocus>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Approve and invite head
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AdminApplications() {
  const {
    items: applications,
    pagination,
    isLoading,
    error,
    search,
    setSearch,
    filter,
    changeFilter,
    setPage,
    refresh,
    replaceItem,
    handleSearch,
  } = useAdminList({
    endpoint: "/admin/applications",
    listKey: "applications",
    filterParam: "status",
    initialFilter: "PENDING",
  });
  const [reasons, setReasons] = useState({});
  const [busyId, setBusyId] = useState("");
  // The reason box opens only for the application being rejected.
  const [rejectingId, setRejectingId] = useState("");
  const [confirming, setConfirming] = useState(null);
  // Activation link per approved application, shown once right after approval.
  const [activations, setActivations] = useState({});

  const approve = async (application) => {
    setBusyId(application._id);

    try {
      const { data } = await api.post(`/admin/applications/${application._id}/approve`);
      // Keep the populated link label from the list row; the response only has ids.
      replaceItem(application._id, {
        ...application,
        ...data.application,
        linkId: application.linkId,
        institutionId: data.institution,
      });
      setActivations((current) => ({
        ...current,
        [application._id]: { url: data.activationUrl, delivery: data.emailDelivery },
      }));
      setConfirming(null);
      toast.success(data.alreadyApproved ? "Already approved" : `${application.name} approved`);
    } catch (approveError) {
      toast.error(approveError.response?.data?.message || "Failed to approve application");
    } finally {
      setBusyId("");
    }
  };

  const reject = async (application) => {
    const reason = (reasons[application._id] || "").trim();

    if (!reason) {
      toast.error("Add a reason before rejecting");
      return;
    }

    setBusyId(application._id);

    try {
      const { data } = await api.post(`/admin/applications/${application._id}/reject`, { reason });
      replaceItem(application._id, { ...application, ...data.application, linkId: application.linkId });
      setRejectingId("");
      if (data.emailDelivery === "sent") {
        toast.success(`${application.name} rejected. The reason was emailed to ${application.email}.`);
      } else {
        toast(`${application.name} rejected, but the email was not sent (${data.emailDelivery === "failed" ? "sending failed" : "email is not configured"}). Tell ${application.email} yourself.`, { icon: "⚠️", duration: 8000 });
      }
    } catch (rejectError) {
      toast.error(rejectError.response?.data?.message || "Failed to reject application");
    } finally {
      setBusyId("");
    }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  };

  return (
    <div className="admin-applications">
      <AdminPageHeader
        title="Applications"
        description="Institutions that applied through a registration link. Approving creates the institution and invites its head."
        onRefresh={refresh}
        isRefreshing={isLoading}
      />

      <AdminToolbar
        search={search}
        onSearchChange={setSearch}
        onSubmit={handleSearch}
        filter={filter}
        onFilterChange={changeFilter}
        filterOptions={FILTER_OPTIONS}
        placeholder="Search by name, code, email or contact..."
      />

      <AdminError message={error} />

      {confirming && (
        <ApproveModal
          application={confirming}
          busy={busyId === confirming._id}
          onConfirm={() => approve(confirming)}
          onClose={() => setConfirming(null)}
        />
      )}

      {isLoading ? (
        <AdminLoading />
      ) : (
        <div className="application-list">
          {applications.map((application) => {
            const activation = activations[application._id];
            const busy = busyId === application._id;
            const rejecting = rejectingId === application._id;

            return (
              <article key={application._id} className={`application is-${application.status.toLowerCase()}`}>
                <header className="application-head">
                  <div className="min-w-0">
                    <h2 className="application-name">
                      {application.name}
                      <span className="application-code">{application.code}</span>
                    </h2>
                    <p className="application-meta">
                      Submitted {formatDate(application.createdAt)}
                      {application.linkId?.label ? ` · via “${application.linkId.label}”` : ""}
                    </p>
                  </div>
                  <StatusBadge tone={statusTone(application.status === "APPROVED" ? "VERIFIED" : application.status)}>
                    {application.status}
                  </StatusBadge>
                </header>

                <dl className="application-facts">
                  <div>
                    <dt>Head (contact)</dt>
                    <dd>{application.contactName}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{application.email}</dd>
                  </div>
                  <div>
                    <dt>Wallet</dt>
                    <dd className="mono" title={application.walletAddress}>
                      {shortenAddress(application.walletAddress || "")}
                    </dd>
                  </div>
                  <div>
                    <dt>Accreditation</dt>
                    <dd>{application.accreditation || "—"}</dd>
                  </div>
                  {application.website && (
                    <div className="span-2">
                      <dt>Website</dt>
                      <dd>
                        <a href={application.website} target="_blank" rel="noopener noreferrer">
                          {application.website}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>

                {application.status === "PENDING" && !rejecting && (
                  <footer className="application-actions">
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => setRejectingId(application._id)} className="reject-btn">
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                    <Button size="sm" disabled={busy} onClick={() => setConfirming(application)}>
                      <Check className="h-3.5 w-3.5" />
                      Approve
                    </Button>
                  </footer>
                )}

                {application.status === "PENDING" && rejecting && (
                  <div className="reject-panel">
                    <label htmlFor={`reason-${application._id}`} className="field-label">
                      Why are you rejecting {application.name}? The reason is saved and emailed to {application.email}.
                    </label>
                    <textarea
                      id={`reason-${application._id}`}
                      rows="2"
                      autoFocus
                      placeholder="e.g. Accreditation could not be verified"
                      value={reasons[application._id] || ""}
                      onChange={(event) =>
                        setReasons((current) => ({ ...current, [application._id]: event.target.value }))
                      }
                      className="textarea-field"
                    />
                    <div className="application-actions">
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => setRejectingId("")}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="reject-btn"
                        disabled={busy || !(reasons[application._id] || "").trim()}
                        onClick={() => reject(application)}
                      >
                        Confirm rejection
                      </Button>
                    </div>
                  </div>
                )}

                {application.status !== "PENDING" && (
                  <p className={`review-result ${application.status === "REJECTED" ? "is-rejected" : ""}`}>
                    {application.status === "APPROVED" ? "Approved" : "Rejected"}
                    {application.reviewedBy?.name ? ` by ${application.reviewedBy.name}` : ""}
                    {application.reviewedAt ? ` · ${formatDate(application.reviewedAt)}` : ""}
                    {application.status === "APPROVED" && application.institutionId?.name
                      ? ` · institution ${application.institutionId.name}`
                      : ""}
                    {application.reviewNote ? ` · Reason: ${application.reviewNote}` : ""}
                  </p>
                )}

                {activation && (
                  <div className="activation">
                    <p>{DELIVERY_LABELS[activation.delivery] || `Email: ${activation.delivery}`}</p>
                    {activation.url && (
                      <div className="activation-link">
                        <code>{activation.url}</code>
                        <Button size="sm" variant="secondary" onClick={() => copy(activation.url)}>
                          Copy
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
          {applications.length === 0 && <p className="empty">No applications found</p>}
          <AdminPagination pagination={pagination} onPage={setPage} />
        </div>
      )}
    </div>
  );
}
