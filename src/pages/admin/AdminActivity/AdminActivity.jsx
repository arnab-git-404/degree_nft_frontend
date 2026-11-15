import { useEffect, useState } from "react";
import { Eye, X } from "lucide-react";
import { useAdminList } from "../../../hooks/useAdminList";
import { formatDate } from "../../../lib/admin";
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

const METHOD_TONES = {
  POST: "info",
  PUT: "warning",
  PATCH: "warning",
  DELETE: "danger",
};

const METHODS = Object.keys(METHOD_TONES);

function MethodBadge({ method }) {
  if (!method) return null;
  return <StatusBadge tone={METHOD_TONES[method]}>{method}</StatusBadge>;
}

function OutcomeBadge({ outcome }) {
  return (
    <StatusBadge tone={outcome === "FAILURE" ? "danger" : "success"}>
      {outcome === "FAILURE" ? "Failed" : "OK"}
    </StatusBadge>
  );
}

function LogDetailsModal({ log, onClose }) {
  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fields = [
    ["When", formatDate(log.createdAt)],
    ["Result", <OutcomeBadge outcome={log.outcome} />],
    ["Who", log.actorName || "Anonymous"],
    ["User ID", log.actorId],
    ["Action", log.action],
    ["Request", log.method && (
      <>
        <MethodBadge method={log.method} /> <code>{log.path}</code>
      </>
    )],
    ["Where", SCOPE_LABELS[log.scope] || log.scope],
    ["Institution", log.institutionId?.name && `${log.institutionId.name} (${log.institutionId.code})`],
    ["Target", [log.targetType, log.targetId].filter(Boolean).join(" · ")],
    ["IP address", log.ip],
    ["Browser", log.userAgent],
    ["Log ID", log._id],
  ];

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="log-modal-title" className="modal">
        <div className="modal-head">
          <div className="min-w-0">
            <p className="modal-kicker">Activity entry</p>
            <h2 id="log-modal-title" className="modal-title">
              {log.summary || log.action}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="icon-btn"
            aria-label="Close details"
            autoFocus
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="modal-body">
          <dl className="fields">
            {fields
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label} className="field">
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
          </dl>

          {log.details && (
            <div>
              <p className="section-label">Details</p>
              <pre className="json">{JSON.stringify(log.details, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminActivity() {
  const [method, setMethod] = useState("all");
  const [selected, setSelected] = useState(null);
  const {
    items: logs,
    data,
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
    extraParams: method === "all" ? {} : { method },
  });

  const stats = data?.stats;
  const tiles = [
    ["Total logs", stats?.total],
    ["Last 24 hours", stats?.last24h],
    ["Failed attempts", stats?.failures, stats?.failures > 0 && "is-danger"],
    ...METHODS.map((name) => [<MethodBadge method={name} />, stats?.methods?.[name], "", name]),
  ];

  return (
    <div className="admin-activity">
      <AdminPageHeader
        title="Activity log"
        description="Who did what, and when: sign-ins, admin changes and institution actions. Newest first."
        onRefresh={refresh}
        isRefreshing={isLoading}
      />

      <div className="stats">
        {tiles.map(([label, value, tone, key]) => (
          <div key={key || label} className="stat">
            <div className="stat-label">{label}</div>
            <p className={`stat-number ${tone || ""}`}>{value?.toLocaleString() ?? "—"}</p>
          </div>
        ))}
      </div>

      <AdminToolbar
        search={search}
        onSearchChange={setSearch}
        onSubmit={handleSearch}
        filter={filter}
        onFilterChange={changeFilter}
        filterOptions={FILTER_OPTIONS}
        placeholder="Search by action, person, summary or ID..."
      >
        <select
          aria-label="Method"
          value={method}
          onChange={(event) => {
            setMethod(event.target.value);
            setPage(1);
          }}
          className="select-field sm:w-36"
        >
          <option value="all">All methods</option>
          {METHODS.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </AdminToolbar>

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
                  <th>
                    <span className="sr-only">Details</span>
                  </th>
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
                      <p className="action-code">
                        <MethodBadge method={log.method} />
                        {log.action}
                      </p>
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
                      <OutcomeBadge outcome={log.outcome} />
                    </td>
                    <td className="actions">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelected(log)}
                        aria-label={`View details of ${log.summary || log.action}`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && <AdminEmpty colSpan={6} message="No activity found" />}
              </tbody>
            </table>
          </div>
          <AdminPagination pagination={pagination} onPage={setPage} />
        </div>
      )}

      {selected && <LogDetailsModal log={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
