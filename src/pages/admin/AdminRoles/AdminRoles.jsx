import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../components/Button";
import { Input } from "../../../components/Input";
import {
  AdminError,
  AdminLoading,
  AdminPageHeader,
  StatusBadge,
} from "../../../components/admin/AdminUI";
import "./AdminRoles.css";

function RoleEditor({
  role,
  groups,
  isSaving,
  onClose,
  onSave,
  onDelete,
}) {
  const isEditing = Boolean(role?._id);
  const isAdminRole = role?.name === "admin";
  const allPermissionKeys = useMemo(
    () => groups.flatMap((group) => group.permissions.map((item) => item.key)),
    [groups]
  );
  const [form, setForm] = useState(() => ({
    name: role?.name || "",
    displayName: role?.displayName || "",
    description: role?.description || "",
    permissions: role?.permissions || [],
    isActive: role?.isActive ?? true,
  }));

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSaving) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, onClose]);

  const togglePermission = (permission) => {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission],
    }));
  };

  const selectedPermissions = isAdminRole
    ? allPermissionKeys
    : form.permissions;
  const deactivationLocked =
    isEditing && (role.isSystem || (role.userCount || 0) > 0);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave({
      name: form.name.trim().toLowerCase(),
      displayName: form.displayName.trim(),
      description: form.description.trim(),
      permissions: isAdminRole ? ["*"] : selectedPermissions,
      isActive: form.isActive,
    });
  };

  return (
    <div
      className="editor-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-editor-title"
        className="editor"
      >
        <form onSubmit={handleSubmit}>
          <div className="editor-head">
            <div>
              <p className="editor-kicker">
                {isEditing ? "Role configuration" : "New role"}
              </p>
              <h2 id="role-editor-title" className="editor-title">
                {isEditing ? role.displayName : "Create a role"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="icon-btn"
              aria-label="Close role editor"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="editor-body">
            <div className="field-grid">
              <Input
                label="Role name"
                value={form.name}
                disabled={isEditing}
                required
                placeholder="e.g. auditor"
                description={
                  isEditing
                    ? "Role names are permanent once created."
                    : "Lowercase letters, numbers, hyphens, or underscores."
                }
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
              <Input
                label="Display name"
                value={form.displayName}
                required
                placeholder="e.g. Credential auditor"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
              />
              <div className="field-wide">
                <label htmlFor="role-description" className="field-label block">
                  Description
                </label>
                <textarea
                  id="role-description"
                  className="textarea-field min-h-14"
                  value={form.description}
                  rows={2}
                  maxLength={240}
                  placeholder="What is this role responsible for?"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <label className="active-toggle">
              <input
                type="checkbox"
                checked={form.isActive}
                disabled={deactivationLocked}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
                className="check"
              />
              <span className="font-medium">Active role</span>
              <span className="hint">
                {isAdminRole || role?.isSystem
                  ? "System roles stay available at all times."
                  : deactivationLocked
                    ? "Reassign this role's users before deactivating it."
                    : "Inactive roles cannot be assigned to new users."}
              </span>
            </label>

            <div>
              <div className="perm-head">
                <p className="field-label">
                  Permissions
                  <span className="perm-count">
                    {selectedPermissions.length} / {allPermissionKeys.length}
                  </span>
                </p>
                {!isAdminRole && (
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          permissions: allPermissionKeys,
                        }))
                      }
                    >
                      Select all
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          permissions: [],
                        }))
                      }
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>

              {isAdminRole ? (
                <div className="admin-note">
                  The system admin role always has full access. It cannot be
                  restricted or deactivated.
                </div>
              ) : (
                <div className="perm-groups">
                  {groups.map((group) => (
                    <fieldset key={group.key}>
                      <legend className="perm-group-label">{group.label}</legend>
                      <div className="perm-grid">
                        {group.permissions.map((permission) => {
                          const checked = form.permissions.includes(
                            permission.key
                          );

                          return (
                            <label
                              key={permission.key}
                              title={permission.description}
                              className={`perm ${checked ? "is-checked" : ""}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  togglePermission(permission.key)
                                }
                                className="check mt-0.5"
                              />
                              <span className="min-w-0">
                                <span className="perm-label">
                                  {permission.label}
                                </span>
                                <span className="perm-key">{permission.key}</span>
                                <span className="perm-desc">
                                  {permission.description}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="editor-foot">
            <div>
              {isEditing && !role.isSystem && (role.userCount || 0) === 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onDelete(role)}
                  disabled={isSaving}
                  className="text-red-700 hover:text-red-800"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete role
                </Button>
              )}
            </div>
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isSaving}>
                {isEditing ? "Save changes" : "Create role"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminRoles() {
  const { refreshUser } = useAuth();
  const [roles, setRoles] = useState([]);
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState("");
  const [roleUsers, setRoleUsers] = useState({});
  const [editor, setEditor] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [rolesResponse, permissionsResponse] = await Promise.all([
        api.get("/admin/roles", { params: { includeInactive: true } }),
        api.get("/admin/permissions"),
      ]);

      setRoles(rolesResponse.data.roles || []);
      setGroups(permissionsResponse.data.groups || []);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load roles"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const permissionIndex = useMemo(() => {
    const index = new Map([
      [
        "*",
        {
          key: "*",
          label: "Full access",
          description: "Every permission on the platform.",
        },
      ],
    ]);

    groups.forEach((group) => {
      group.permissions.forEach((permission) => {
        index.set(permission.key, permission);
      });
    });

    return index;
  }, [groups]);

  const refreshAll = useCallback(() => {
    setRoleUsers({});
    loadData();
  }, [loadData]);

  const loadRoleUsers = async (roleId) => {
    setRoleUsers((current) => ({
      ...current,
      [roleId]: { isLoading: true, users: [], error: "" },
    }));

    try {
      const { data } = await api.get(`/admin/roles/${roleId}/users`, {
        params: { page: 1, limit: 6 },
      });

      setRoleUsers((current) => ({
        ...current,
        [roleId]: {
          isLoading: false,
          users: data.users || [],
          pagination: data.pagination,
          error: "",
        },
      }));
    } catch (loadError) {
      setRoleUsers((current) => ({
        ...current,
        [roleId]: {
          isLoading: false,
          users: [],
          error: getErrorMessage(loadError, "Failed to load assigned users"),
        },
      }));
    }
  };

  const toggleExpanded = (role) => {
    const nextId = expandedId === role._id ? "" : role._id;

    setExpandedId(nextId);

    if (nextId && !roleUsers[role._id]) {
      loadRoleUsers(role._id);
    }
  };

  const saveRole = async (payload) => {
    setIsSaving(true);

    try {
      if (editor?._id) {
        await api.patch(`/admin/roles/${editor._id}`, payload);
        toast.success("Role updated");
      } else {
        await api.post("/admin/roles", payload);
        toast.success("Role created");
      }

      setEditor(null);
      setRoleUsers({});
      await loadData();
      await refreshUser().catch(() => {});
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, "Failed to save role"));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteRole = async (role) => {
    const confirmed = window.confirm(
      `Delete the "${role.displayName}" role? This cannot be undone.`
    );

    if (!confirmed) return;

    setIsSaving(true);

    try {
      await api.delete(`/admin/roles/${role._id}`);
      toast.success("Role deleted");
      setEditor(null);
      setExpandedId((current) => (current === role._id ? "" : current));
      setRoleUsers({});
      await loadData();
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError, "Failed to delete role"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-roles">
      <AdminPageHeader
        title="Roles & permissions"
        description="Define what each role can do and review the users mapped to it."
        onRefresh={refreshAll}
        isRefreshing={isLoading}
        actions={
          <Button
            size="sm"
            onClick={() => setEditor({ mode: "create" })}
            disabled={isLoading || groups.length === 0}
          >
            <Plus className="h-3.5 w-3.5" />
            New role
          </Button>
        }
      />

      <AdminError message={error} />

      {isLoading ? (
        <AdminLoading />
      ) : (
        <div className="table-card">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Users</th>
                  <th>Permissions</th>
                  <th>Status</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => {
                  const isExpanded = expandedId === role._id;
                  const assigned = roleUsers[role._id];

                  return (
                    <RoleRows
                      key={role._id}
                      role={role}
                      isExpanded={isExpanded}
                      assigned={assigned}
                      permissionIndex={permissionIndex}
                      onToggle={() => toggleExpanded(role)}
                      onEdit={() => setEditor(role)}
                    />
                  );
                })}
                {roles.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty">
                      No roles found. Create the first role to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editor && (
        <RoleEditor
          key={editor._id || "new-role"}
          role={editor}
          groups={groups}
          isSaving={isSaving}
          onClose={() => {
            if (!isSaving) setEditor(null);
          }}
          onSave={saveRole}
          onDelete={deleteRole}
        />
      )}
    </div>
  );
}

function RoleRows({
  role,
  isExpanded,
  assigned,
  permissionIndex,
  onToggle,
  onEdit,
}) {
  return (
    <>
      <tr className={isExpanded ? "role-row is-open" : "role-row"}>
        <td>
          <button
            type="button"
            onClick={onToggle}
            className="role-toggle"
            aria-expanded={isExpanded}
          >
            <ChevronRight className="chevron" />
            <span className="min-w-0">
              <span className="role-name">
                <span className="cell-title">{role.displayName}</span>
                {role.isSystem && <StatusBadge tone="info">System</StatusBadge>}
              </span>
              <span className="cell-mono">{role.name}</span>
            </span>
          </button>
        </td>
        <td>
          <span className="font-medium tabular-nums">{role.userCount || 0}</span>
          <span className="cell-sub ml-1">assigned</span>
        </td>
        <td>
          {role.permissions.includes("*")
            ? "All permissions"
            : `${role.permissions.length} selected`}
        </td>
        <td>
          <StatusBadge tone={role.isActive ? "success" : "danger"}>
            {role.isActive ? "Active" : "Inactive"}
          </StatusBadge>
        </td>
        <td className="col-actions">
          <Button size="sm" variant="secondary" onClick={onEdit}>
            <Pencil className="h-3 w-3" />
            Edit
          </Button>
        </td>
      </tr>

      {isExpanded && (
        <tr className="detail-row">
          <td colSpan={5}>
            <div className="detail-grid">
              <section>
                <div className="detail-head">
                  <p className="section-label">Granted permissions</p>
                  <span className="cell-sub">Effective immediately</span>
                </div>
                {role.permissions.length === 0 ? (
                  <p className="cell-sub">This role has no permissions yet.</p>
                ) : (
                  <div className="chips">
                    {role.permissions.map((permissionKey) => {
                      const permission = permissionIndex.get(permissionKey);

                      return (
                        <span
                          key={permissionKey}
                          title={`${permissionKey} — ${permission?.description || ""}`}
                          className="chip"
                        >
                          {permission?.label || permissionKey}
                        </span>
                      );
                    })}
                  </div>
                )}
                <p className="detail-note">
                  Permission changes are checked against the role on every API
                  request, so users do not need to sign in again.
                </p>
              </section>

              <section>
                <div className="detail-head">
                  <p className="section-label flex items-center gap-1.5">
                    <Users className="h-3 w-3" />
                    Assigned users
                  </p>
                  <Link
                    to={`/admin/users?role=${encodeURIComponent(role.name)}`}
                    className="link-underline text-xs"
                  >
                    Manage users
                  </Link>
                </div>

                {assigned?.isLoading ? (
                  <div className="cell-sub flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading users...
                  </div>
                ) : assigned?.error ? (
                  <p className="text-xs text-red-700">{assigned.error}</p>
                ) : assigned?.users?.length ? (
                  <>
                    <div className="user-list">
                      {assigned.users.map((user) => (
                        <div key={user._id} className="user-item">
                          <div className="min-w-0">
                            <p className="cell-title truncate">{user.name}</p>
                            <p className="cell-sub truncate">
                              {user.email || "No email"}
                            </p>
                          </div>
                          <StatusBadge
                            tone={user.isActive ? "success" : "danger"}
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </StatusBadge>
                        </div>
                      ))}
                    </div>
                    {assigned.pagination?.total > assigned.users.length && (
                      <p className="detail-note">
                        Showing {assigned.users.length} of{" "}
                        {assigned.pagination.total} users.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="cell-sub">No users are assigned to this role.</p>
                )}
              </section>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
