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
import api, { getErrorMessage } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import {
  AdminError,
  AdminLoading,
  AdminPageHeader,
  StatusBadge,
} from "../../components/admin/AdminUI";

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
      className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-ink/50 p-4 backdrop-blur-sm"
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
        className="my-6 w-full max-w-3xl border border-ink/25 bg-paper-soft shadow-2xl"
      >
        <form onSubmit={handleSubmit}>
          <div className="flex items-start justify-between gap-4 border-b border-ink/15 px-5 py-4">
            <div>
              <p className="eyebrow">
                {isEditing ? "Role configuration" : "New role"}
              </p>
              <h2
                id="role-editor-title"
                className="mt-1 font-serif text-3xl leading-tight tracking-tight"
              >
                {isEditing ? role.displayName : "Create a role"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex h-8 w-8 items-center justify-center border border-ink/20 text-ink/60 transition-colors hover:border-cobalt hover:text-cobalt disabled:opacity-40"
              aria-label="Close role editor"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-5 px-5 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>

            <div className="space-y-2">
              <label className="field-label block">Description</label>
              <textarea
                className="textarea-field"
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

            <div className="flex items-center justify-between gap-4 border border-ink/20 bg-paper-deep px-4 py-3">
              <div>
                <p className="text-sm font-medium">Active role</p>
                <p className="mt-0.5 text-xs text-ink/55">
                  {isAdminRole || role?.isSystem
                    ? "System roles stay available at all times."
                    : deactivationLocked
                      ? "Reassign this role's users before deactivating it."
                      : "Inactive roles cannot be assigned to new users."}
                </p>
              </div>
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
                className="h-4 w-4 accent-cobalt disabled:opacity-40"
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="field-label">Permissions</p>
                  <p className="mt-1 text-xs text-ink/55">
                    {selectedPermissions.length} of {allPermissionKeys.length}{" "}
                    permissions selected.
                  </p>
                </div>
                {!isAdminRole && (
                  <div className="flex gap-2">
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
                <div className="mt-3 border border-cobalt/25 bg-cobalt/5 px-4 py-3 text-sm text-ink/70">
                  The system admin role always has full access. It cannot be
                  restricted or deactivated.
                </div>
              ) : (
                <div className="mt-3 space-y-4">
                  {groups.map((group) => (
                    <fieldset key={group.key}>
                      <legend className="mb-2 font-mono text-[9px] uppercase tracking-[0.18em] text-ink/50">
                        {group.label}
                      </legend>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {group.permissions.map((permission) => {
                          const checked = form.permissions.includes(
                            permission.key
                          );

                          return (
                            <label
                              key={permission.key}
                              className={`flex cursor-pointer items-start gap-3 border p-3 transition-colors ${
                                checked
                                  ? "border-cobalt bg-cobalt/5"
                                  : "border-ink/15 hover:border-ink/35"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  togglePermission(permission.key)
                                }
                                className="mt-0.5 h-4 w-4 shrink-0 accent-cobalt"
                              />
                              <span>
                                <span className="block text-sm font-medium">
                                  {permission.label}
                                </span>
                                <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-ink/40">
                                  {permission.key}
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-ink/55">
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

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/15 px-5 py-4">
            <div>
              {isEditing && !role.isSystem && (role.userCount || 0) === 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onDelete(role)}
                  disabled={isSaving}
                  className="text-red-700 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete role
                </Button>
              )}
            </div>
            <div className="flex gap-2">
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
    <div className="space-y-6">
      <AdminPageHeader
        title="Roles & permissions"
        description="Define what each role can do and review the users mapped to it."
        onRefresh={refreshAll}
        isRefreshing={isLoading}
        actions={
          <Button
            onClick={() => setEditor({ mode: "create" })}
            disabled={isLoading || groups.length === 0}
          >
            <Plus className="h-4 w-4" />
            New role
          </Button>
        }
      />

      <AdminError message={error} />

      {isLoading ? (
        <AdminLoading />
      ) : (
        <div className="overflow-x-auto border border-ink/20">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper-soft text-ink/60">
              <tr>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Users</th>
                <th className="px-4 py-3">Permissions</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
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
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-ink/60"
                  >
                    No roles found. Create the first role to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
      <tr
        className={`border-t border-ink/15 transition-colors ${
          isExpanded ? "bg-paper-soft" : "hover:bg-paper-soft/60"
        }`}
      >
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={onToggle}
            className="flex items-center gap-3 text-left"
            aria-expanded={isExpanded}
          >
            <ChevronRight
              className={`h-4 w-4 shrink-0 text-ink/45 transition-transform ${
                isExpanded ? "rotate-90 text-cobalt" : ""
              }`}
            />
            <span>
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{role.displayName}</span>
                {role.isSystem && (
                  <StatusBadge tone="info">System</StatusBadge>
                )}
              </span>
              <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-ink/45">
                {role.name}
              </span>
            </span>
          </button>
        </td>
        <td className="px-4 py-3">
          <span className="font-medium">{role.userCount || 0}</span>
          <span className="ml-1 text-xs text-ink/50">assigned</span>
        </td>
        <td className="px-4 py-3">
          {role.permissions.includes("*")
            ? "All permissions"
            : `${role.permissions.length} selected`}
        </td>
        <td className="px-4 py-3">
          <StatusBadge tone={role.isActive ? "success" : "danger"}>
            {role.isActive ? "Active" : "Inactive"}
          </StatusBadge>
        </td>
        <td className="px-4 py-3">
          <Button size="sm" variant="secondary" onClick={onEdit}>
            <Pencil className="h-3 w-3" />
            Edit
          </Button>
        </td>
      </tr>

      {isExpanded && (
        <tr className="border-t border-ink/10 bg-paper-deep/40">
          <td colSpan={5} className="px-5 py-5">
            <div className="grid gap-6 lg:grid-cols-2">
              <section>
                <div className="flex items-center justify-between gap-3">
                  <p className="field-label">Granted permissions</p>
                  <span className="text-xs text-ink/45">
                    Effective immediately
                  </span>
                </div>
                {role.permissions.length === 0 ? (
                  <p className="mt-3 text-sm text-ink/55">
                    This role has no permissions yet.
                  </p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {role.permissions.map((permissionKey) => {
                      const permission = permissionIndex.get(permissionKey);

                      return (
                        <span
                          key={permissionKey}
                          title={permission?.description || permissionKey}
                          className="inline-flex flex-col border border-ink/15 bg-paper-soft px-2.5 py-1.5"
                        >
                          <span className="text-xs font-medium">
                            {permission?.label || permissionKey}
                          </span>
                          <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-ink/40">
                            {permissionKey}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                )}
                <p className="mt-4 text-xs leading-5 text-ink/50">
                  Permission changes are checked against the role on every API
                  request, so users do not need to sign in again.
                </p>
              </section>

              <section>
                <div className="flex items-center justify-between gap-3">
                  <p className="field-label flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    Assigned users
                  </p>
                  <Link
                    to={`/admin/users?role=${encodeURIComponent(role.name)}`}
                    className="font-mono text-[9px] uppercase tracking-[0.14em] text-cobalt hover:underline"
                  >
                    Manage users
                  </Link>
                </div>

                {assigned?.isLoading ? (
                  <div className="mt-4 flex items-center gap-2 text-xs text-ink/50">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading users...
                  </div>
                ) : assigned?.error ? (
                  <p className="mt-3 text-xs text-red-700">{assigned.error}</p>
                ) : assigned?.users?.length ? (
                  <>
                    <div className="mt-3 divide-y divide-ink/10 border border-ink/15 bg-paper-soft">
                      {assigned.users.map((user) => (
                        <div
                          key={user._id}
                          className="flex items-center justify-between gap-3 px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {user.name}
                            </p>
                            <p className="truncate text-xs text-ink/55">
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
                      <p className="mt-2 text-xs text-ink/45">
                        Showing {assigned.users.length} of{" "}
                        {assigned.pagination.total} users.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-3 text-sm text-ink/55">
                    No users are assigned to this role.
                  </p>
                )}
              </section>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
