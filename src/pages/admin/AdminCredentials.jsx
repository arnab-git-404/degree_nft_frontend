import { useAdminList } from "../../hooks/useAdminList";
import { formatDate } from "../../lib/admin";
import { shortenAddress } from "../../lib/utils";
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
  ["all", "All credentials"],
  ["true", "Minted"],
  ["false", "Unminted"],
];

const credentialTone = (allocation) => {
  if (
    allocation.nftStatus === "MINTED" ||
    allocation.nftStatus === "CONFIRMED"
  ) {
    return "success";
  }

  if (allocation.nftStatus === "AUTO_CONFIRMED") {
    return "info";
  }

  return allocation.minted ? "success" : "warning";
};

const credentialLabel = (allocation) =>
  allocation.nftStatus?.replaceAll("_", " ") ||
  (allocation.minted ? "MINTED" : "UNMINTED");

export function AdminCredentials() {
  const {
    items: allocations,
    pagination,
    isLoading,
    error,
    search,
    setSearch,
    filter,
    changeFilter,
    setPage,
    refresh,
    handleSearch,
  } = useAdminList({
    endpoint: "/admin/nfts",
    listKey: "allocations",
    filterParam: "minted",
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Credentials"
        description="Browse every credential allocated by universities."
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
        placeholder="Search by degree, IPFS hash, or wallet..."
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
                  <th className="px-4 py-3">Credential</th>
                  <th className="px-4 py-3">University</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Allocated</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((allocation) => (
                  <tr
                    key={allocation._id}
                    className="border-t border-gray-700/60"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{allocation.name}</p>
                      <p
                        className="max-w-xs truncate text-xs text-gray-400"
                        title={allocation.ipfsHash}
                      >
                        {allocation.ipfsHash}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p>
                        {allocation.universityId?.name ||
                          shortenAddress(allocation.universityWallet || "")}
                      </p>
                      <p className="text-xs text-gray-400">
                        {allocation.universityId?.code || ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{allocation.studentId?.name || "—"}</p>
                      <p className="font-mono text-xs text-gray-400">
                        {shortenAddress(allocation.studentWallet || "")}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={credentialTone(allocation)}>
                        {credentialLabel(allocation)}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {formatDate(allocation.allocatedAt)}
                    </td>
                  </tr>
                ))}
                {allocations.length === 0 && (
                  <AdminEmpty colSpan={5} message="No credentials found" />
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
