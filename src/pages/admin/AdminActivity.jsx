import { useAdminList } from "../../hooks/useAdminList";
import { formatDate } from "../../lib/admin";
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
    <div className="space-y-6">
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
        <>
          <div className="overflow-x-auto rounded-lg border border-ink/15">
            <table className="w-full text-left text-sm">
              <thead className="bg-paper-soft text-ink/60">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Who</th>
                  <th className="px-4 py-3">What</th>
                  <th className="px-4 py-3">Where</th>
                  <th className="px-4 py-3">Result</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id} className="border-t border-ink/15 align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-ink/60">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{log.actorName || "Anonymous"}</p>
                      {log.ip && <p className="text-xs text-ink/50">{log.ip}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p>{log.summary || log.action}</p>
                      <p className="font-mono text-xs text-ink/50">{log.action}</p>
                      {log.details && (
                        <details className="mt-1 text-xs text-ink/60">
                          <summary className="cursor-pointer">Details</summary>
                          <pre className="mt-1 max-w-md overflow-x-auto whitespace-pre-wrap rounded bg-paper-deep p-2">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <p>{SCOPE_LABELS[log.scope] || log.scope}</p>
                      {log.institutionId?.name && (
                        <p className="text-ink/60">
                          {log.institutionId.name} ({log.institutionId.code})
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
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
        </>
      )}
    </div>
  );
}
