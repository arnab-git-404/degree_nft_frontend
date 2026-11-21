import { useAdminList } from "../../../hooks/useAdminList";
import { formatDate } from "../../../lib/admin";
import { shortenAddress } from "../../../lib/utils";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  AdminPagination,
  AdminToolbar,
  StatusBadge,
} from "../../../components/admin/AdminUI";
import "./AdminCredentials.css";

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
    <div className="admin-credentials">
      <AdminPageHeader
        title="Credentials"
        description="Browse every credential allocated by institutions."
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
        <div className="table-card">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Credential</th>
                  <th>Institution</th>
                  <th>Student</th>
                  <th>Status</th>
                  <th>Allocated</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((allocation) => (
                  <tr key={allocation._id}>
                    <td>
                      <p className="cell-title">{allocation.name}</p>
                      <p className="ipfs" title={allocation.ipfsHash}>
                        {allocation.ipfsHash}
                      </p>
                    </td>
                    <td>
                      <p>
                        {allocation.institutionId?.name ||
                          shortenAddress(allocation.institutionWallet || "")}
                      </p>
                      <p className="cell-sub">
                        {allocation.institutionId?.code || ""}
                      </p>
                    </td>
                    <td>
                      <p>{allocation.userId?.name || "—"}</p>
                      <p className="cell-mono">
                        {shortenAddress(allocation.studentWallet || "")}
                      </p>
                    </td>
                    <td>
                      <StatusBadge tone={credentialTone(allocation)}>
                        {credentialLabel(allocation)}
                      </StatusBadge>
                    </td>
                    <td className="date">{formatDate(allocation.allocatedAt)}</td>
                  </tr>
                ))}
                {allocations.length === 0 && (
                  <AdminEmpty colSpan={5} message="No credentials found" />
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
