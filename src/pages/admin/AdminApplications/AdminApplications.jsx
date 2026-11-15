import { useState } from "react";
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
  // Activation link per approved application, shown once right after approval.
  const [activations, setActivations] = useState({});

  const approve = async (application) => {
    if (
      !window.confirm(
        `Approve ${application.name} (${application.code})?\n\nThis creates the institution and invites ${application.contactName} (${application.email}) as its head.`
      )
    ) {
      return;
    }

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
      toast.success(`${application.name} rejected`);
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

      {isLoading ? (
        <AdminLoading />
      ) : (
        <div className="table-card">
          <div className="application-list">
            {applications.map((application) => {
              const activation = activations[application._id];
              const busy = busyId === application._id;

              return (
                <div key={application._id} className="application">
                  <div className="application-head">
                    <p className="application-name">
                      {application.name} <span className="application-code">{application.code}</span>
                    </p>
                    <StatusBadge tone={statusTone(application.status === "APPROVED" ? "VERIFIED" : application.status)}>
                      {application.status}
                    </StatusBadge>
                    <p className="application-meta">
                      Submitted {formatDate(application.createdAt)}
                      {application.linkId?.label ? ` · via "${application.linkId.label}"` : ""}
                    </p>
                  </div>

                  <dl className="application-facts">
                    <div>
                      <dt>Head (contact)</dt>
                      <dd>
                        {application.contactName} · {application.email}
                      </dd>
                    </div>
                    <div>
                      <dt>Wallet</dt>
                      <dd className="mono">{shortenAddress(application.walletAddress || "")}</dd>
                    </div>
                    {application.website && (
                      <div>
                        <dt>Website</dt>
                        <dd>
                          <a href={application.website} target="_blank" rel="noopener noreferrer">
                            {application.website}
                          </a>
                        </dd>
                      </div>
                    )}
                    {application.accreditation && (
                      <div>
                        <dt>Accreditation</dt>
                        <dd>{application.accreditation}</dd>
                      </div>
                    )}
                  </dl>

                  {application.status === "PENDING" && (
                    <div className="review-row">
                      <Button size="sm" disabled={busy} onClick={() => approve(application)}>
                        Approve
                      </Button>
                      <textarea
                        rows="1"
                        aria-label={`Rejection reason for ${application.name}`}
                        placeholder="Reason (required to reject)..."
                        value={reasons[application._id] || ""}
                        onChange={(event) =>
                          setReasons((current) => ({ ...current, [application._id]: event.target.value }))
                        }
                        className="textarea-field reason-input"
                      />
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => reject(application)}>
                        Reject
                      </Button>
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
                </div>
              );
            })}
            {applications.length === 0 && <p className="empty">No applications found</p>}
          </div>
          <AdminPagination pagination={pagination} onPage={setPage} />
        </div>
      )}
    </div>
  );
}
