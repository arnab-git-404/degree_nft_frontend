import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../lib/api";
import { useAdminList } from "../../hooks/useAdminList";
import { formatDate } from "../../lib/admin";
import { shortenAddress } from "../../lib/utils";
import { Button } from "../../components/Button";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  AdminPagination,
  AdminToolbar,
  StatusBadge,
} from "../../components/admin/AdminUI";

export function AdminUsers() {
  const [roles, setRoles] = useState([]);
  const [busyId, setBusyId] = useState("");
  const {
    items: users,
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
    endpoint: "/admin/users",
    listKey: "users",
    filterParam: "role",
  });

  useEffect(() => {
    let cancelled = false;

    api
      .get("/admin/roles")
      .then(({ data }) => {
        if (!cancelled) setRoles(data.roles || []);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const updateUserRole = async (userId, role) => {
    setBusyId(userId);

    try {
      const { data } = await api.patch(`/admin/users/${userId}/role`, {
        role,
      });
      replaceItem(userId, data.user);
      toast.success("User role updated");
    } catch (updateError) {
      toast.error(
        updateError.response?.data?.message || "Failed to update user role"
      );
    } finally {
      setBusyId("");
    }
  };

  const toggleUserStatus = async (user) => {
    setBusyId(user._id);

    try {
      const { data } = await api.patch(`/admin/users/${user._id}/status`, {
        isActive: !user.isActive,
      });
      replaceItem(user._id, data.user);
      toast.success(data.user.isActive ? "User activated" : "User deactivated");
    } catch (updateError) {
      toast.error(
        updateError.response?.data?.message ||
          "Failed to update user status"
      );
    } finally {
      setBusyId("");
    }
  };

  const roleFilterOptions = [
    ["all", "All roles"],
    ...roles.map((role) => [role.name, role.displayName || role.name]),
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Users"
        description="Manage accounts, roles, and access status."
        onRefresh={refresh}
        isRefreshing={isLoading}
      />

      <AdminToolbar
        search={search}
        onSearchChange={setSearch}
        onSubmit={handleSearch}
        filter={filter}
        onFilterChange={changeFilter}
        filterOptions={roleFilterOptions}
        placeholder="Search by name or email..."
      />

      <AdminError message={error} />

      {isLoading ? (
        <AdminLoading />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-800 text-gray-400">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Wallet</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="border-t border-gray-700/60">
                    <td className="px-4 py-3">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-gray-400">
                        {user.email || "No email"}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {shortenAddress(
                        user.primaryWallet?.address ||
                          user.wallets?.[0]?.address ||
                          ""
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.roleId?.name || ""}
                        disabled={busyId === user._id}
                        onChange={(event) =>
                          updateUserRole(user._id, event.target.value)
                        }
                        className="h-8 rounded border border-gray-600 bg-gray-700 px-2 text-xs text-white disabled:opacity-50"
                      >
                        {roles.length === 0 && user.roleId?.name && (
                          <option value={user.roleId.name}>
                            {user.roleId.displayName || user.roleId.name}
                          </option>
                        )}
                        {roles.map((role) => (
                          <option key={role.name} value={role.name}>
                            {role.displayName || role.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={user.isActive ? "success" : "danger"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant={user.isActive ? "ghost" : "secondary"}
                        disabled={busyId === user._id}
                        onClick={() => toggleUserStatus(user)}
                      >
                        {user.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <AdminEmpty colSpan={6} message="No users found" />
                )}
              </tbody>
            </table>
          </div>
          <AdminPagination pagination={pagination} onPage={setPage} />
        </>
      )}
    </div>
  );
}
