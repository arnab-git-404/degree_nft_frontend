import { useCallback, useEffect, useState } from "react";
import { Crown, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../../lib/api";
import { formatDate } from "../../lib/admin";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../Button";
import { StatusBadge } from "../admin/AdminUI";
import "./StaffManager.css";

const STATUS_TONES = { ACTIVE: "success", INVITED: "warning", SUSPENDED: "danger" };

const DELIVERY_LABELS = {
  sent: "Invitation email sent.",
  in_app: "They already have an account: the invitation is waiting on their Profile page.",
  not_configured: "Email is not configured: send this activation link yourself.",
  console: "Email is not configured (link printed in the server log): send this activation link yourself.",
  failed: "The email failed: send this activation link yourself.",
};

/**
 * Members of one college. `endpoint` lists (GET), invites (POST) and updates (PATCH /:membershipId).
 * The college head gets only roles below Institution Admin; the Super Admin gets all and can move the head.
 * The server re-checks every rule; the UI only hides what would be refused.
 */
export function StaffManager({ endpoint, canInvite, canManage, onTransferHead }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [invite, setInvite] = useState({ email: "", name: "", roleId: "" });
  const [inviteResult, setInviteResult] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data: response } = await api.get(endpoint);
      setData(response);
      setError("");
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load members"));
    }
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <p className="staff-error">{error}</p>;
  if (!data) return <Loader2 className="staff-loading" />;

  const { members, roles, primaryAdminMembershipId } = data;
  const assignable = new Set(roles.map((role) => role._id));

  const submitInvite = async (event) => {
    event.preventDefault();
    setBusyId("invite");

    try {
      const { data: response } = await api.post(endpoint, invite);
      setInviteResult({ email: invite.email, url: response.activationUrl, delivery: response.emailDelivery });
      setInvite({ email: "", name: "", roleId: invite.roleId });
      toast.success("Invitation created");
      await load();
    } catch (inviteError) {
      toast.error(getErrorMessage(inviteError, "Failed to invite"));
    } finally {
      setBusyId("");
    }
  };

  const update = async (member, body, message) => {
    setBusyId(member._id);

    try {
      await api.patch(`${endpoint}/${member._id}`, body);
      toast.success(message);
      await load();
    } catch (updateError) {
      toast.error(getErrorMessage(updateError, "Failed to update member"));
    } finally {
      setBusyId("");
    }
  };

  const transfer = async (member) => {
    const reason = window.prompt(`Make ${member.userId?.name} the head of this institution?\n\nReason (required, saved in the activity log):`);
    if (!reason?.trim()) return;

    setBusyId(member._id);
    try {
      await onTransferHead(member, reason.trim());
      await load();
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
    <div className="staff-manager">
      {canInvite && (
        <form className="invite-form" onSubmit={submitInvite}>
          <input
            type="email"
            required
            aria-label="Email"
            placeholder="Email"
            value={invite.email}
            onChange={(event) => setInvite({ ...invite, email: event.target.value })}
            className="input-field"
          />
          <input
            aria-label="Name"
            placeholder="Name (for a new account)"
            value={invite.name}
            onChange={(event) => setInvite({ ...invite, name: event.target.value })}
            className="input-field"
          />
          <select
            required
            aria-label="Role"
            value={invite.roleId}
            onChange={(event) => setInvite({ ...invite, roleId: event.target.value })}
            className="select-field"
          >
            <option value="">Role…</option>
            {roles.map((role) => (
              <option key={role._id} value={role._id}>
                {role.displayName}
              </option>
            ))}
          </select>
          <Button size="sm" type="submit" disabled={busyId === "invite"}>
            Invite
          </Button>
        </form>
      )}

      {inviteResult && (
        <div className="invite-result">
          <p>
            {inviteResult.email}: {DELIVERY_LABELS[inviteResult.delivery] || `Email: ${inviteResult.delivery}`}
          </p>
          {inviteResult.url && (
            <div className="invite-link">
              <code>{inviteResult.url}</code>
              <Button size="sm" variant="secondary" onClick={() => copy(inviteResult.url)}>
                Copy
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Person</th>
              <th>Role</th>
              <th>Status</th>
              <th>Invited</th>
              <th className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const isHead = member._id === primaryAdminMembershipId;
              const isSelf = member.userId?._id === user?._id;
              // Rows whose role this actor may not assign (admins, for a college head) are read-only.
              const editable = canManage && !isSelf && assignable.has(member.roleId?._id);
              const busy = busyId === member._id;

              return (
                <tr key={member._id}>
                  <td>
                    <p className="cell-title">
                      {member.userId?.name || "—"}
                      {isHead && (
                        <span className="head-badge">
                          <Crown className="h-3 w-3" /> Head
                        </span>
                      )}
                    </p>
                    <p className="cell-sub">{member.userId?.email || ""}</p>
                  </td>
                  <td>
                    {editable && !isHead ? (
                      <select
                        aria-label={`Role of ${member.userId?.name}`}
                        value={member.roleId?._id}
                        disabled={busy}
                        onChange={(event) => update(member, { roleId: event.target.value }, "Role changed")}
                        className="select-field role-select"
                      >
                        {roles.map((role) => (
                          <option key={role._id} value={role._id}>
                            {role.displayName}
                          </option>
                        ))}
                      </select>
                    ) : (
                      member.roleId?.displayName || "—"
                    )}
                  </td>
                  <td>
                    <StatusBadge tone={STATUS_TONES[member.status]}>{member.status}</StatusBadge>
                  </td>
                  <td>
                    <p>{member.invitedBy?.name || "—"}</p>
                    <p className="cell-sub">{member.invitedAt ? formatDate(member.invitedAt) : ""}</p>
                  </td>
                  <td className="col-actions">
                    <div className="actions">
                      {editable && !isHead && member.status !== "SUSPENDED" && (
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => update(member, { status: "SUSPENDED" }, "Member suspended")}>
                          {member.status === "INVITED" ? "Cancel invite" : "Suspend"}
                        </Button>
                      )}
                      {editable && member.status === "SUSPENDED" && member.acceptedAt && (
                        <Button size="sm" variant="secondary" disabled={busy} onClick={() => update(member, { status: "ACTIVE" }, "Member reactivated")}>
                          Reactivate
                        </Button>
                      )}
                      {onTransferHead && !isHead && member.status === "ACTIVE" && (
                        <Button size="sm" variant="secondary" disabled={busy} onClick={() => transfer(member)}>
                          Make head
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {members.length === 0 && (
              <tr>
                <td colSpan={5} className="cell-sub">
                  No members yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
