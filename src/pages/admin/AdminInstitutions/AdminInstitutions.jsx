import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../../lib/api";
import { useAdminList } from "../../../hooks/useAdminList";
import { statusTone } from "../../../lib/admin";
import { shortenAddress } from "../../../lib/utils";
import { Button } from "../../../components/Button";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  AdminPagination,
  AdminToolbar,
  StatusBadge,
} from "../../../components/admin/AdminUI";
import "./AdminInstitutions.css";

const FILTER_OPTIONS = [
  ["all", "All statuses"],
  ["PENDING", "Pending"],
  ["VERIFIED", "Verified"],
  ["REJECTED", "Rejected"],
];

export function AdminInstitutions() {
  const {
    items: institutions,
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
    endpoint: "/admin/institutions",
    listKey: "institutions",
    filterParam: "status",
  });
  const [updatingId, setUpdatingId] = useState("");

  const updateInstitutionStatus = async (institutionId, verificationStatus) => {
    setUpdatingId(institutionId);

    try {
      const { data } = await api.patch(
        `/admin/institutions/${institutionId}/status`,
        { verificationStatus }
      );
      replaceItem(institutionId, data.institution);
      toast.success(`Institution marked ${verificationStatus}`);
    } catch (updateError) {
      toast.error(
        updateError.response?.data?.message ||
          "Failed to update institution"
      );
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <div className="admin-institutions">
      <AdminPageHeader
        title="Institutions"
        description="Review, verify, and reject institution profiles."
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
        placeholder="Search by name, code, or wallet..."
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
                  <th>Institution</th>
                  <th>Wallet</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {institutions.map((institution) => (
                  <tr key={institution._id}>
                    <td>
                      <p className="cell-title">{institution.name}</p>
                      <p className="cell-sub">{institution.code}</p>
                    </td>
                    <td className="cell-mono">
                      {shortenAddress(institution.walletAddress || "")}
                    </td>
                    <td>
                      <p>{institution.userId?.name || "—"}</p>
                      <p className="cell-sub">{institution.userId?.email || ""}</p>
                    </td>
                    <td>
                      <StatusBadge
                        tone={statusTone(institution.verificationStatus)}
                      >
                        {institution.verificationStatus}
                      </StatusBadge>
                    </td>
                    <td className="col-actions">
                      <div className="actions">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={updatingId === institution._id}
                          onClick={() =>
                            updateInstitutionStatus(
                              institution._id,
                              "VERIFIED"
                            )
                          }
                        >
                          <CheckCircle className="h-3.5 w-3.5 text-green-700" />
                          Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={updatingId === institution._id}
                          onClick={() =>
                            updateInstitutionStatus(
                              institution._id,
                              "REJECTED"
                            )
                          }
                        >
                          <XCircle className="h-3.5 w-3.5 text-red-700" />
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {institutions.length === 0 && (
                  <AdminEmpty colSpan={5} message="No institutions found" />
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
