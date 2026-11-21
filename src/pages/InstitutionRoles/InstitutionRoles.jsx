import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, KeyRound, Plus, Share2, UserCog } from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { AdminError, AdminLoading, AdminPageHeader, StatusBadge } from "../../components/admin/AdminUI";
import { CatalogModal, ItemTitle, RowActions, StatCards, StatusPill } from "../../components/CatalogPage/CatalogPage";
import "./InstitutionRoles.css";

// Nothing is deleted: a role that is no longer used is set to Inactive, and its members lose access.
const ROLE_STATUSES = { ACTIVE: { label: "Active", tone: "success" }, INACTIVE: { label: "Inactive", tone: "danger" } };

// Add / edit / copy a college role. Only college permissions are offered (the server checks again).
function RoleForm({ role, copyOf, permissionGroups, onClose, onSaved }) {
  const isEditing = Boolean(role);
  const allowed = useMemo(
    () => new Set(permissionGroups.flatMap((group) => group.permissions.map((permission) => permission.key))),
    [permissionGroups]
  );
  const source = role || copyOf;
  const [displayName, setDisplayName] = useState(role?.displayName || (copyOf ? `${copyOf.displayName} (copy)` : ""));
  const [description, setDescription] = useState(source?.description || "");
  const [permissions, setPermissions] = useState(() => new Set((source?.permissions || []).filter((key) => allowed.has(key))));
  const [isSaving, setIsSaving] = useState(false);

  const toggle = (key) =>
    setPermissions((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const submit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    const body = { displayName, description, permissions: [...permissions] };
    try {
      if (isEditing) await api.patch(`/institution/roles/${role._id}`, body);
      else await api.post("/institution/roles", body);
      toast.success(isEditing ? "Role updated" : "Role created");
      onSaved();
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, "Failed to save the role"));
      setIsSaving(false);
    }
  };

  return (
    <CatalogModal
      title={isEditing ? `Edit ${role.displayName}` : copyOf ? `Copy ${copyOf.displayName}` : "Add role"}
      submitLabel={isEditing ? "Save changes" : "Create role"}
      isSaving={isSaving}
      onClose={onClose}
      onSubmit={submit}
    >
      <Input label="Role name" required autoFocus maxLength={60} placeholder="e.g. Exam Cell" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
      <Input label="Description" maxLength={240} placeholder="What this role is for" value={description} onChange={(event) => setDescription(event.target.value)} />
      {isEditing && role.memberCount > 0 && (
        <p className="role-note">
          {role.memberCount} member{role.memberCount === 1 ? " has" : "s have"} this role; changes apply to them at once.
        </p>
      )}
      <div className="perm-groups">
        {permissionGroups.map((group) => (
          <fieldset key={group.key}>
            <legend className="perm-group-label">{group.label}</legend>
            <div className="perm-grid">
              {group.permissions.map((permission) => (
                <label key={permission.key} className={`perm ${permissions.has(permission.key) ? "is-checked" : ""}`}>
                  <input type="checkbox" checked={permissions.has(permission.key)} onChange={() => toggle(permission.key)} />
                  <span>
                    <span className="perm-label">{permission.label}</span>
                    <span className="perm-desc">{permission.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <p className="role-note">Staff and role management stay with Institution Admins, whom only the Super Admin appoints.</p>
    </CatalogModal>
  );
}

// College Admin › Roles: shared roles (read-only, can be copied) and the college's own roles.
export function InstitutionRoles() {
  const { activeMembership } = useAuth();
  const institution = activeMembership?.institutionId;
  const [roles, setRoles] = useState(null);
  const [permissionGroups, setPermissionGroups] = useState([]);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState(null); // {} = add, { role } = edit, { copyOf } = copy
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/institution/roles");
      setRoles(data.roles);
      setPermissionGroups(data.permissionGroups);
      setError("");
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load roles"));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, institution?._id]);

  const closeEditor = useCallback(() => setEditor(null), []);

  const labels = useMemo(
    () => new Map(permissionGroups.flatMap((group) => group.permissions.map((permission) => [permission.key, permission.label]))),
    [permissionGroups]
  );

  const changeStatus = async (role, next) => {
    const isActive = next === "ACTIVE";
    const people = `${role.memberCount} ${role.memberCount === 1 ? "person" : "people"}`;
    if (!isActive && role.memberCount > 0 && !window.confirm(`${people} with the role ${role.displayName} will lose access. Make it inactive?`)) return;
    setBusyId(role._id);
    try {
      await api.patch(`/institution/roles/${role._id}`, { isActive });
      toast.success(`${role.displayName} is now ${isActive ? "active" : "inactive"}`);
      await load();
    } catch (updateError) {
      toast.error(getErrorMessage(updateError, "Failed to change the status"));
    } finally {
      setBusyId("");
    }
  };

  const own = roles?.filter((role) => !role.shared).length ?? 0;
  const stats = [
    { label: "Roles available", value: roles?.length ?? 0, icon: KeyRound, tone: "cobalt" },
    { label: "Made by your college", value: own, icon: UserCog, tone: "green" },
    { label: "Shared by DegreeNFT", value: (roles?.length ?? 0) - own, icon: Share2, tone: "amber" },
  ];

  const permissionSummary = (role) => {
    if (role.isAdmin) return "Full college access, including staff";
    const names = role.permissions.map((key) => labels.get(key) || key);
    if (!names.length) return "No permissions";
    return names.length > 3 ? `${names.slice(0, 3).join(", ")} +${names.length - 3}` : names.join(", ");
  };

  return (
    <div className="catalog-page institution-roles">
      <AdminPageHeader
        title="Roles"
        description={`Roles you can give people at ${institution?.name || "your institution"}. Make your own from college permissions.`}
        actions={
          roles && (
            <Button onClick={() => setEditor({})}>
              <Plus className="h-4 w-4" /> Add Role
            </Button>
          )
        }
      />

      <AdminError message={error} />

      {!roles && !error ? (
        <AdminLoading />
      ) : (
        roles && (
          <>
            <StatCards stats={stats} />

            <div className="table-card">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Permissions</th>
                      <th>Members</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((role) => (
                      <tr key={role._id}>
                        <td>
                          <ItemTitle icon={KeyRound} title={role.displayName} code={role.shared ? "SHARED" : "YOUR COLLEGE"} />
                        </td>
                        <td className="perm-summary" title={role.permissions.map((key) => labels.get(key) || key).join(", ")}>
                          {permissionSummary(role)}
                        </td>
                        <td className="tabular-nums">{role.memberCount}</td>
                        <td>
                          <StatusPill statuses={ROLE_STATUSES} value={role.isActive ? "ACTIVE" : "INACTIVE"} />
                        </td>
                        <td>
                          {role.shared ? (
                            <div className="actions">
                              {!role.isAdmin && (
                                <Button size="sm" variant="ghost" onClick={() => setEditor({ copyOf: role })} aria-label={`Copy ${role.displayName}`}>
                                  <Copy className="h-4 w-4" /> Copy
                                </Button>
                              )}
                              {role.isAdmin && <StatusBadge>Appointed by Super Admin</StatusBadge>}
                            </div>
                          ) : (
                            <RowActions
                              name={role.displayName}
                              statuses={ROLE_STATUSES}
                              value={role.isActive ? "ACTIVE" : "INACTIVE"}
                              disabled={busyId === role._id}
                              onEdit={() => setEditor({ role })}
                              onChange={(next) => changeStatus(role, next)}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )
      )}

      {editor && (
        <RoleForm
          role={editor.role}
          copyOf={editor.copyOf}
          permissionGroups={permissionGroups}
          onClose={closeEditor}
          onSaved={() => {
            closeEditor();
            load();
          }}
        />
      )}
    </div>
  );
}
