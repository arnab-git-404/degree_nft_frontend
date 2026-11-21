import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Crown,
  Loader2,
  PauseCircle,
  Plus,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../../lib/api";
import { emailColor, formatDate } from "../../lib/admin";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../Button";
import {
  CatalogModal,
  CatalogToolbar,
  RowActions,
  Select,
  StatCards,
  StatusOptions,
  StatusPill,
} from "../CatalogPage/CatalogPage";
import { ColorField, FormPreview } from "../FormFields/FormFields";
import "./StaffManager.css";

// The database keeps the enum value SUSPENDED; people see "Inactive" (always red).
const STATUSES = {
  ACTIVE: { label: "Active", tone: "success" },
  INVITED: { label: "Invited", tone: "warning" },
  SUSPENDED: { label: "Inactive", tone: "danger" },
};
// Row dropdown: an invite that was never accepted cannot become Active, so it only offers Invited / Inactive.
const rowStatuses = (member) =>
  member.acceptedAt || member.status === "ACTIVE"
    ? { ACTIVE: STATUSES.ACTIVE, SUSPENDED: STATUSES.SUSPENDED }
    : { INVITED: STATUSES.INVITED, SUSPENDED: STATUSES.SUSPENDED };

const DELIVERY_LABELS = {
  sent: "Invitation email sent.",
  in_app:
    "They already have an account: the invitation is waiting on their Profile page.",
  not_configured:
    "Email is not configured: send this activation link yourself.",
  console:
    "Email is not configured (link printed in the server log): send this activation link yourself.",
  failed: "The email failed: send this activation link yourself.",
};

const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "?";

function Avatar({ name, color }) {
  return (
    <span className="staff-avatar" style={{ background: color }}>
      {initials(name)}
    </span>
  );
}

// Invite (member = null) or edit (member given) one person. Email and name are fixed once invited.
function MemberForm({ member, roles, isHead, onClose, onSubmit }) {
  const isEditing = Boolean(member);
  const [email, setEmail] = useState(member?.userId?.email || "");
  const [name, setName] = useState(member?.userId?.name || "");
  const [roleId, setRoleId] = useState(member?.roleId?._id || "");
  const autoColor = emailColor(email || "staff");
  // "" = automatic. A saved colour equal to the generated one counts as automatic.
  const [color, setColor] = useState(
    member?.color && member.color !== autoColor ? member.color : "",
  );
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    const saved = await onSubmit(
      isEditing
        ? { roleId, color: color || autoColor }
        : { email, name, roleId, ...(color && { color }) },
    );
    if (!saved) setIsSaving(false);
  };

  return (
    <CatalogModal
      title={
        isEditing ? `Edit ${member.userId?.name || "member"}` : "Invite staff"
      }
      submitLabel={isEditing ? "Save changes" : "Send invitation"}
      isSaving={isSaving}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="staff-form">
        <div className="field-pair">
          <div className="space-y-1.5">
            <label htmlFor="staff-email" className="field-label block">
              Email
            </label>
            <input
              id="staff-email"
              type="email"
              className="input-field"
              required
              autoFocus={!isEditing}
              disabled={isEditing}
              maxLength={200}
              placeholder="name@college.edu"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="staff-name" className="field-label block">
              Name <span className="text-ink/40">(new accounts)</span>
            </label>
            <input
              id="staff-name"
              className="input-field"
              disabled={isEditing}
              maxLength={120}
              placeholder="Full name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
        </div>
        <p className="field-hint">
          {isEditing
            ? "Email and name belong to the person's account and are not changed here."
            : "Someone without an account gets an activation link; an existing account sees the invitation on its Profile page."}
        </p>

        <div className="space-y-1.5">
          <label htmlFor="staff-role" className="field-label block">
            Role
          </label>
          <Select
            id="staff-role"
            required
            disabled={isHead}
            value={roleId}
            onChange={(event) => setRoleId(event.target.value)}
          >
            <option value="">Choose a role…</option>
            {roles.map((role) => (
              <option key={role._id} value={role._id}>
                {role.displayName}
              </option>
            ))}
          </Select>
          {isHead && (
            <p className="field-hint">
              Transfer the head to someone else before changing this role.
            </p>
          )}
        </div>

        <ColorField value={color} autoColor={autoColor} onChange={setColor} />

        <FormPreview
          icon={Users}
          color={color || autoColor}
          title={name || email || "New staff member"}
        >
          <span className="staff-preview-role">
            {roles.find((role) => role._id === roleId)?.displayName ||
              "No role yet"}
          </span>
        </FormPreview>
      </div>
    </CatalogModal>
  );
}

/**
 * Members of one college. `endpoint` lists (GET), invites (POST) and updates (PATCH /:membershipId).
 * The college head gets only roles below Institution Admin; the Super Admin gets all and can move the head.
 * The server re-checks every rule; the UI only hides what would be refused. Nobody is deleted: only Active / Inactive.
 */
export function StaffManager({
  endpoint,
  canInvite,
  canManage,
  onTransferHead,
}) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [inviteResult, setInviteResult] = useState(null);
  const [editor, setEditor] = useState(null); // { member: null } = invite, { member } = edit
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

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

  const closeEditor = useCallback(() => setEditor(null), []);
  const members = data?.members;

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (members || []).filter(
      (member) =>
        (!status || member.status === status) &&
        (!roleFilter || member.roleId?._id === roleFilter) &&
        (!term ||
          [member.userId?.name, member.userId?.email].some((value) =>
            value?.toLowerCase().includes(term),
          )),
    );
  }, [members, status, roleFilter, search]);

  if (error) return <p className="staff-error">{error}</p>;
  if (!data) return <Loader2 className="staff-loading" />;

  const { roles, primaryAdminMembershipId } = data;
  const assignable = new Set(roles.map((role) => role._id));
  const count = (value) =>
    members.filter((member) => member.status === value).length;
  const stats = [
    {
      label: "Total staff",
      value: members.length,
      icon: Users,
      tone: "cobalt",
    },
    {
      label: "Active",
      value: count("ACTIVE"),
      icon: CheckCircle2,
      tone: "green",
    },
    { label: "Invited", value: count("INVITED"), icon: Clock, tone: "amber" },
    {
      label: "Inactive",
      value: count("SUSPENDED"),
      icon: PauseCircle,
      tone: "red",
    },
  ];
  const hasFilters = Boolean(search || status || roleFilter);

  const update = async (member, body, message) => {
    setBusyId(member._id);
    try {
      await api.patch(`${endpoint}/${member._id}`, body);
      toast.success(message);
      await load();
      return true;
    } catch (updateError) {
      toast.error(getErrorMessage(updateError, "Failed to update member"));
      return false;
    } finally {
      setBusyId("");
    }
  };

  const saveEditor = async (body) => {
    if (editor.member) {
      const saved = await update(editor.member, body, "Member updated");
      if (saved) closeEditor();
      return saved;
    }

    try {
      const { data: response } = await api.post(endpoint, body);
      setInviteResult({
        email: body.email,
        url: response.activationUrl,
        delivery: response.emailDelivery,
      });
      toast.success("Invitation created");
      await load();
      closeEditor();
      return true;
    } catch (inviteError) {
      toast.error(getErrorMessage(inviteError, "Failed to invite"));
      return false;
    }
  };

  const transfer = async (member) => {
    const reason = window.prompt(
      `Make ${member.userId?.name} the head of this institution?\n\nReason (required, saved in the activity log):`,
    );
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
    <div className="catalog-page staff-manager">
      {canInvite && (
        <div className="staff-head">
          <Button onClick={() => setEditor({ member: null })}>
            <Plus className="h-4 w-4" /> Invite staff
          </Button>
        </div>
      )}

      <StatCards stats={stats} />

      {inviteResult && (
        <div className="invite-result">
          <p>
            {inviteResult.email}:{" "}
            {DELIVERY_LABELS[inviteResult.delivery] ||
              `Email: ${inviteResult.delivery}`}
          </p>
          {inviteResult.url && (
            <div className="invite-link">
              <code>{inviteResult.url}</code>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => copy(inviteResult.url)}
              >
                Copy
              </Button>
            </div>
          )}
        </div>
      )}

      <CatalogToolbar
        search={search}
        onSearch={setSearch}
        placeholder="Search by name or email"
        hasFilters={hasFilters}
        onClear={() => {
          setSearch("");
          setStatus("");
          setRoleFilter("");
        }}
        shown={visible.length}
        total={members.length}
      >
        <Select
          className="filter"
          aria-label="Filter by role"
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
        >
          <option value="">All roles</option>
          {roles.map((role) => (
            <option key={role._id} value={role._id}>
              {role.displayName}
            </option>
          ))}
        </Select>
        <Select
          className="filter"
          aria-label="Filter by status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">All status</option>
          <StatusOptions statuses={STATUSES} />
        </Select>
      </CatalogToolbar>

      <div className="table-card">
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
              {visible.map((member) => {
                const isHead = member._id === primaryAdminMembershipId;
                const isSelf = member.userId?._id === user?._id;
                // Rows whose role this actor may not assign (admins, for a college head) are read-only.
                const editable =
                  canManage && !isSelf && assignable.has(member.roleId?._id);
                const busy = busyId === member._id;
                const canTransfer =
                  onTransferHead && !isHead && member.status === "ACTIVE";

                return (
                  <tr key={member._id}>
                    <td>
                      <div className="item-cell">
                        <Avatar
                          name={member.userId?.name}
                          color={member.color}
                        />
                        <div className="min-w-0">
                          <p className="item-name">
                            {member.userId?.name || "—"}
                            {isHead && (
                              <span className="head-badge">
                                <Crown className="h-3 w-3" /> Head
                              </span>
                            )}
                          </p>
                          <p className="staff-email">
                            {member.userId?.email || ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="font-medium">
                      {member.roleId?.displayName || "—"}
                    </td>
                    <td>
                      <StatusPill statuses={STATUSES} value={member.status} />
                    </td>
                    <td>
                      <p>{member.invitedBy?.name || "—"}</p>
                      <p className="staff-email">
                        {member.invitedAt ? formatDate(member.invitedAt) : ""}
                      </p>
                    </td>
                    <td className="col-actions">
                      <div className="row-end">
                        {canTransfer && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busy}
                            onClick={() => transfer(member)}
                          >
                            Make head
                          </Button>
                        )}
                        {editable && (
                          <RowActions
                            name={member.userId?.name || "member"}
                            statuses={rowStatuses(member)}
                            value={member.status}
                            // The head cannot be made inactive until the head is transferred.
                            disabled={busy || isHead}
                            onEdit={() => setEditor({ member })}
                            onChange={(next) =>
                              next !== member.status &&
                              update(
                                member,
                                { status: next },
                                `Member is now ${STATUSES[next].label.toLowerCase()}`,
                              )
                            }
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty">
                    {hasFilters
                      ? "No staff match these filters."
                      : "No members yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editor && (
        <MemberForm
          member={editor.member}
          roles={roles}
          isHead={editor.member?._id === primaryAdminMembershipId}
          onClose={closeEditor}
          onSubmit={saveEditor}
        />
      )}
    </div>
  );
}
