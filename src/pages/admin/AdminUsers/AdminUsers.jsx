import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../../lib/api";
import { useAdminList } from "../../../hooks/useAdminList";
import { formatDate } from "../../../lib/admin";
import { shortenAddress } from "../../../lib/utils";
import { Button } from "../../../components/Button";
import { getInitials } from "../../../components/AppSidebar";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  AdminPagination,
  AdminToolbar,
  StatusBadge,
} from "../../../components/admin/AdminUI";
import "./AdminUsers.css";

const USER_TYPE_OPTIONS = [
  ["SUPER_ADMIN", "Super Admin"],
  ["ADMIN", "Admin"],
  ["STAFF", "Staff"],
  ["STUDENT", "Student"],
];

export function AdminUsers() {
  const [searchParams] = useSearchParams();
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
    initialFilter: searchParams.get("role") || "all",
  });

  useEffect(() => {
    let cancelled = false;

    api
      .get("/admin/roles")
      .then(({ data }) => {
        // College roles go on memberships, not on accounts.
        if (!cancelled) setRoles((data.roles || []).filter((role) => role.scope !== "INSTITUTION"));
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

  const updateUserType = async (user, userType) => {
    setBusyId(user._id);

    try {
      const { data } = await api.patch(`/admin/users/${user._id}/account`, { userType });
      replaceItem(user._id, data.user);
      toast.success("User type updated");
    } catch (updateError) {
      toast.error(
        updateError.response?.data?.message || "Failed to update user type"
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
    <div className="admin-users">
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
        <div className="table-card">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Wallet</th>
                  <th>Role</th>
                  <th>User type</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td>
                      <div className="user">
                        <span className="user-avatar">
                          {getInitials(user.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="user-name">{user.name}</p>
                          <p className="user-email">
                            {user.email || "No email"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="wallet">
                      {shortenAddress(
                        user.primaryWallet?.address ||
                          user.wallets?.[0]?.address ||
                          ""
                      ) || "—"}
                    </td>
                    <td>
                      <select
                        aria-label={`Role for ${user.name}`}
                        value={user.roleId?.name || ""}
                        disabled={busyId === user._id}
                        onChange={(event) =>
                          updateUserRole(user._id, event.target.value)
                        }
                        className="cell-select"
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
                    <td>
                      <select
                        aria-label={`User type for ${user.name}`}
                        value={user.userType || "STUDENT"}
                        disabled={busyId === user._id}
                        onChange={(event) =>
                          updateUserType(user, event.target.value)
                        }
                        className="cell-select"
                      >
                        {USER_TYPE_OPTIONS.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <StatusBadge tone={user.isActive ? "success" : "danger"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </StatusBadge>
                    </td>
                    <td className="muted">{formatDate(user.createdAt)}</td>
                    <td className="col-actions">
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
                  <AdminEmpty colSpan={7} message="No users found" />
                )}
              </tbody>
            </table>
          </div>
          <AdminPagination pagination={pagination} onPage={setPage} />
        </div>
      )}
    </div>
  );
}
