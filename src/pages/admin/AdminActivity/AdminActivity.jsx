import { useAdminList } from "../../../hooks/useAdminList";
import { formatDate } from "../../../lib/admin";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  AdminPagination,
  AdminToolbar,
  StatusBadge,
} from "../../../components/admin/AdminUI";
import "./AdminActivity.css";

const FILTER_OPTIONS = [
  ["all", "All activity"],
  ["PLATFORM", "Admin panel"],
  ["INSTITUTION", "Institutions"],
  ["ACCOUNT", "Sign-ins & accounts"],
  ["FAILURE", "Failed attempts"],
];

const SCOPE_LABELS = {
  PLATFORM: "Admin panel",
  INSTITUTION: "Institution",
  ACCOUNT: "Account",
};

export function AdminActivity() {
  const {
    items: logs,
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
    endpoint: "/admin/audit-logs",
    listKey: "logs",
    filterParam: "type",
  });

  return (
    <div className="admin-activity">
      <AdminPageHeader
        title="Activity log"
        description="Who did what, and when: sign-ins, admin changes and institution actions. Newest first."
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
        placeholder="Search by action, person, summary or ID..."
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
                  <th>When</th>
                  <th>Who</th>
                  <th>What</th>
                  <th>Where</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id} className="log-row">
                    <td className="when">{formatDate(log.createdAt)}</td>
                    <td>
                      <p className="cell-title">{log.actorName || "Anonymous"}</p>
                      {log.ip && <p className="cell-sub">{log.ip}</p>}
                    </td>
                    <td>
                      <p>{log.summary || log.action}</p>
                      <p className="action-code">{log.action}</p>
                      {log.details && (
                        <details className="details">
                          <summary>Details</summary>
                          <pre>{JSON.stringify(log.details, null, 2)}</pre>
                        </details>
                      )}
                    </td>
                    <td className="where">
                      <p>{SCOPE_LABELS[log.scope] || log.scope}</p>
                      {log.institutionId?.name && (
                        <p className="cell-sub">
                          {log.institutionId.name} ({log.institutionId.code})
                        </p>
                      )}
                    </td>
                    <td>
                      <StatusBadge tone={log.outcome === "FAILURE" ? "danger" : "success"}>
                        {log.outcome === "FAILURE" ? "Failed" : "OK"}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && <AdminEmpty colSpan={5} message="No activity found" />}
              </tbody>
            </table>
          </div>
          <AdminPagination pagination={pagination} onPage={setPage} />
        </div>
      )}
    </div>
  );
}
