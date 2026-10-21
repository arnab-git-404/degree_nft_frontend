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

export function AdminUniversities() {
  const {
    items: universities,
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
    endpoint: "/admin/universities",
    listKey: "universities",
    filterParam: "status",
  });
  const [updatingId, setUpdatingId] = useState("");

  const updateUniversityStatus = async (universityId, verificationStatus) => {
    setUpdatingId(universityId);

    try {
      const { data } = await api.patch(
        `/admin/universities/${universityId}/status`,
        { verificationStatus }
      );
      replaceItem(universityId, data.university);
      toast.success(`University marked ${verificationStatus}`);
    } catch (updateError) {
      toast.error(
        updateError.response?.data?.message ||
          "Failed to update university"
      );
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Universities"
        description="Review, verify, and reject university profiles."
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
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-800 text-gray-400">
                <tr>
                  <th className="px-4 py-3">University</th>
                  <th className="px-4 py-3">Wallet</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {universities.map((university) => (
                  <tr
                    key={university._id}
                    className="border-t border-gray-700/60"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{university.name}</p>
                      <p className="text-xs text-gray-400">
                        {university.code}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {shortenAddress(university.walletAddress || "")}
                    </td>
                    <td className="px-4 py-3">
                      <p>{university.userId?.name || "—"}</p>
                      <p className="text-xs text-gray-400">
                        {university.userId?.email || ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        tone={statusTone(university.verificationStatus)}
                      >
                        {university.verificationStatus}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={updatingId === university._id}
                          onClick={() =>
                            updateUniversityStatus(
                              university._id,
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
                          disabled={updatingId === university._id}
                          onClick={() =>
                            updateUniversityStatus(
                              university._id,
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
                {universities.length === 0 && (
                  <AdminEmpty colSpan={5} message="No universities found" />
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
