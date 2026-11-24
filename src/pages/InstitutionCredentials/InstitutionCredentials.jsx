import { useCallback, useEffect, useState } from "react";
import { Flame, Pencil, ScrollText, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../../lib/api";
import { formatDate } from "../../lib/admin";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/Button";
import { AdminError, AdminLoading, AdminPageHeader } from "../../components/admin/AdminUI";
import { CatalogModal, ItemTitle, StatusPill } from "../../components/CatalogPage/CatalogPage";
import { ReasonModal } from "../../components/ReasonModal";
import "./InstitutionCredentials.css";

const STATUSES = {
  PENDING_CONFIRMATION: { label: "Pending", tone: "warning" },
  CONFIRMED: { label: "Confirmed", tone: "info" },
  AUTO_CONFIRMED: { label: "Confirmed", tone: "info" },
  MINTED: { label: "Minted", tone: "success" },
};

// The official academic validity. Suspended/Revoked credentials fail public verification and cannot be claimed.
const ACADEMIC = {
  ACTIVE: { label: "Valid", tone: "success" },
  SUSPENDED: { label: "Suspended", tone: "warning" },
  REVOKED: { label: "Revoked", tone: "danger" },
};

const plural = (count, word) => `${count} ${word}${count > 1 ? "s" : ""}`;

// Correct a credential that is not minted yet: edit what the student sees, re-pin it, and issue a new revision.
function ReviseForm({ credential, onClose, onSaved }) {
  const [metadata, setMetadata] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [title, setTitle] = useState(credential.name);
  const [attributes, setAttributes] = useState([]);
  const [reason, setReason] = useState("");
  const [resolveReports, setResolveReports] = useState(credential.openReports > 0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // The metadata lives on IPFS; the form edits a copy of it.
    fetch(credential.uri)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Could not load the credential details"))))
      .then((json) => {
        setMetadata(json);
        setAttributes((json.attributes || []).filter((attribute) => attribute.trait_type !== "Degree"));
      })
      .catch((error) => setLoadError(error.message));
  }, [credential.uri]);

  const submit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      // Keep the "Institution - Degree" shape of the metadata name when the old title is its tail.
      const oldName = metadata.name || "";
      const name = oldName.endsWith(credential.name) ? `${oldName.slice(0, oldName.length - credential.name.length)}${title}` : title;
      const next = { ...metadata, name, attributes: [...attributes, { trait_type: "Degree", value: title }] };
      const { data: pinned } = await api.post("/ipfs/pin-json", next);
      await api.post(`/institution/credentials/${credential._id}/revise`, {
        name: title,
        uri: `https://ipfs.io/ipfs/${pinned.IpfsHash}`,
        ipfsHash: pinned.IpfsHash,
        reason,
        resolveReports,
      });
      toast.success("Revision issued. The student must confirm it again.");
      onSaved();
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, "Failed to revise the credential"));
      setIsSaving(false);
    }
  };

  return (
    <CatalogModal title={`Revise ${credential.name}`} submitLabel="Issue revision" isSaving={isSaving || !metadata} onClose={onClose} onSubmit={submit}>
      <div className="revise-form">
        <p className="revise-note">
          This creates revision {credential.revision + 1}. The student&apos;s earlier confirmation stops counting and they must review and confirm again. The old
          revision is kept.
        </p>
        {loadError && <p className="field-hint text-red-700">{loadError}</p>}
        {!metadata && !loadError && <AdminLoading />}
        {metadata && (
          <>
            <div className="space-y-1.5">
              <label htmlFor="revise-title" className="field-label block">
                Degree / credential title
              </label>
              <input id="revise-title" className="input-field" required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className="revise-attrs">
              {attributes.map((attribute, index) => (
                <div key={attribute.trait_type} className="space-y-1.5">
                  <label className="field-label block">{attribute.trait_type}</label>
                  <input
                    className="input-field"
                    value={attribute.value ?? ""}
                    onChange={(event) =>
                      setAttributes((list) => list.map((item, position) => (position === index ? { ...item, value: event.target.value } : item)))
                    }
                  />
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="revise-reason" className="field-label block">
                Reason for the correction
              </label>
              <textarea
                id="revise-reason"
                className="input-field revise-textarea"
                rows={3}
                required
                minLength={3}
                maxLength={500}
                placeholder="e.g. CGPA was entered wrongly"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
            {credential.openReports > 0 && (
              <label className="revise-check">
                <input type="checkbox" checked={resolveReports} onChange={(event) => setResolveReports(event.target.checked)} />
                <span>
                  Mark the student&apos;s {plural(credential.openReports, "open report")} as resolved by this correction. Left unticked, the report keeps blocking
                  the mint.
                </span>
              </label>
            )}
          </>
        )}
      </div>
    </CatalogModal>
  );
}

// Institution › Credentials: what this college has issued, with each one's review state and a Revise action.
export function InstitutionCredentials() {
  const { activeMembership, hasPermission } = useAuth();
  const institution = activeMembership?.institutionId;
  const canRevise = hasPermission("credential:create");
  const canChangeStatus = hasPermission("credential:revoke");
  const canBurn = hasPermission("credential:burn");
  const showActions = canRevise || canChangeStatus || canBurn;
  const [statusTarget, setStatusTarget] = useState(null);
  const [nextStatus, setNextStatus] = useState("SUSPENDED");
  const [burnTarget, setBurnTarget] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [error, setError] = useState("");
  const [reviseTarget, setReviseTarget] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/institution/credentials");
      setCredentials(data.credentials);
      setError("");
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load credentials"));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, institution?._id]);

  const closeRevise = useCallback(() => setReviseTarget(null), []);

  const openStatus = (credential) => {
    setNextStatus((credential.academicStatus || "ACTIVE") === "ACTIVE" ? "SUSPENDED" : "ACTIVE");
    setStatusTarget(credential);
  };
  const changeStatus = async (reason) => {
    try {
      await api.post(`/institution/credentials/${statusTarget._id}/status`, { status: nextStatus, reason });
      toast.success(`${statusTarget.name} is now ${ACADEMIC[nextStatus].label.toLowerCase()}`);
      setStatusTarget(null);
      load();
    } catch (statusError) {
      toast.error(getErrorMessage(statusError, "Failed to change the status"));
    }
  };
  const requestBurn = async (reason) => {
    try {
      await api.post(`/institution/credentials/${burnTarget._id}/burn`, { reason });
      toast.success("Burn requested. It needs two approvals under Approvals.");
      setBurnTarget(null);
    } catch (burnError) {
      toast.error(getErrorMessage(burnError, "Failed to request the burn"));
    }
  };

  const count = (...statuses) => credentials?.filter((credential) => statuses.includes(credential.status)).length ?? 0;
  const tags = [
    { label: "Total", value: credentials?.length ?? 0, tone: "total" },
    { label: "Pending", value: count("PENDING_CONFIRMATION"), tone: "pending" },
    { label: "Confirmed", value: count("CONFIRMED", "AUTO_CONFIRMED"), tone: "confirmed" },
    { label: "Minted", value: count("MINTED"), tone: "minted" },
    { label: "Reported", value: credentials?.filter((credential) => credential.openReports > 0).length ?? 0, tone: "red" },
  ];

  return (
    <div className="catalog-page institution-credentials">
      <AdminPageHeader title="Credentials" description={`Credentials issued by ${institution?.name || "your institution"}`} />

      <AdminError message={error} />

      {!credentials && !error ? (
        <AdminLoading />
      ) : (
        credentials && (
          <>
            <div className="cred-tags">
              {tags.map((tag) => (
                <span key={tag.label} className={`cred-tag tag-${tag.tone}`}>
                  <i aria-hidden="true" />
                  <b>{tag.value}</b> {tag.label}
                </span>
              ))}
            </div>

            <div className="table-card">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Credential</th>
                      <th>Student</th>
                      <th>Status</th>
                      <th>Issued</th>
                      {showActions && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {credentials.map((credential) => {
                      const enrollment = credential.enrollmentId;
                      return (
                        <tr key={credential._id}>
                          <td>
                            <ItemTitle icon={ScrollText} title={credential.name} code={credential.credentialType} />
                          </td>
                          <td>
                            <p className="item-name">{credential.studentId?.fullName || "—"}</p>
                            <p className="cred-sub">
                              {enrollment?.programId
                                ? `${enrollment.programId.code} ${enrollment.programSessionId?.startYear}–${enrollment.programSessionId?.endYear}`
                                : "No enrollment linked"}
                            </p>
                          </td>
                          <td>
                            <div className="cred-status">
                              <StatusPill statuses={ACADEMIC} value={credential.academicStatus || "ACTIVE"} />
                              <StatusPill statuses={STATUSES} value={credential.status} />
                              <span className="cred-rev">v{credential.revision ?? 1}</span>
                              {credential.openReports > 0 && <span className="cred-reported">{plural(credential.openReports, "open report")}</span>}
                            </div>
                          </td>
                          <td>{formatDate(credential.allocatedAt)}</td>
                          {showActions && (
                            <td>
                              <div className="cred-actions">
                                {canRevise && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={credential.minted}
                                    title={credential.minted ? "Minted credentials cannot be changed" : undefined}
                                    onClick={() => setReviseTarget(credential)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" /> Revise
                                  </Button>
                                )}
                                {canChangeStatus && (
                                  <Button variant="ghost" size="sm" onClick={() => openStatus(credential)}>
                                    <ShieldAlert className="h-3.5 w-3.5" /> Status
                                  </Button>
                                )}
                                {canBurn && credential.minted && credential.academicStatus !== "REVOKED" && (
                                  <Button variant="ghost" size="sm" className="text-red-700" onClick={() => setBurnTarget(credential)}>
                                    <Flame className="h-3.5 w-3.5" /> Burn
                                  </Button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {credentials.length === 0 && (
                      <tr>
                        <td colSpan={showActions ? 5 : 4} className="empty">
                          No credentials issued yet.
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

      {statusTarget && (
        <ReasonModal
          title={`Academic status of ${statusTarget.name}`}
          intro="Suspended and revoked credentials stay on record (and on-chain) but fail public verification and cannot be claimed. Every change is kept in the history."
          submitLabel="Save status"
          placeholder="e.g. Degree withdrawn by the university board"
          canSubmit={nextStatus !== (statusTarget.academicStatus || "ACTIVE")}
          onClose={() => setStatusTarget(null)}
          onSubmit={changeStatus}
        >
          <div className="space-y-1.5">
            <label htmlFor="academic-status" className="field-label block">
              New status
            </label>
            <select id="academic-status" className="select-field w-full" value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>
              {Object.entries(ACADEMIC).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </ReasonModal>
      )}

      {burnTarget && (
        <ReasonModal
          title={`Request burning ${burnTarget.name}`}
          intro={
            <p>
              Burning <b>destroys the NFT on-chain for good</b>. It is only for exceptional cases; to cancel a degree, set its status to <b>Revoked</b>{" "}
              instead. A burn needs approvals from the college officials, each signing with their own wallet.
            </p>
          }
          submitLabel="Request burn"
          placeholder="e.g. Issued to the wrong student by mistake"
          onClose={() => setBurnTarget(null)}
          onSubmit={requestBurn}
        />
      )}

      {reviseTarget && (
        <ReviseForm
          credential={reviseTarget}
          onClose={closeRevise}
          onSaved={() => {
            closeRevise();
            load();
          }}
        />
      )}
    </div>
  );
}
