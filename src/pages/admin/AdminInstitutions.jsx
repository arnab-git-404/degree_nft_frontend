import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../lib/api";
import { useAdminList } from "../../hooks/useAdminList";
import { statusTone } from "../../lib/admin";
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
    <div className="space-y-6">
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
        <>
          <div className="overflow-x-auto rounded-lg border border-ink/15">
            <table className="w-full text-left text-sm">
              <thead className="bg-paper-soft text-ink/60">
                <tr>
                  <th className="px-4 py-3">Institution</th>
                  <th className="px-4 py-3">Wallet</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {institutions.map((institution) => (
                  <tr
                    key={institution._id}
                    className="border-t border-ink/15"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{institution.name}</p>
                      <p className="text-xs text-ink/60">
                        {institution.code}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {shortenAddress(institution.walletAddress || "")}
                    </td>
                    <td className="px-4 py-3">
                      <p>{institution.userId?.name || "—"}</p>
                      <p className="text-xs text-ink/60">
                        {institution.userId?.email || ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        tone={statusTone(institution.verificationStatus)}
                      >
                        {institution.verificationStatus}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
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
                          <CheckCircle className="mr-1 h-3 w-3" />
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
                          <XCircle className="mr-1 h-3 w-3" />
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
        </>
      )}
    </div>
  );
}
