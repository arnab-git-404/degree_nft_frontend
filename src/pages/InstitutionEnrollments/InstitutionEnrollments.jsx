import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, CircleSlash, GraduationCap, Plus, UserRound, UsersRound } from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../../lib/api";
import { batchView, ENROLLMENT_STATUSES as STATUSES } from "../../lib/admin";
import { ENROLLMENT_SHEET } from "../../lib/excelSheet";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/Button";
import { AdminError, AdminLoading, AdminPageHeader, AdminPagination } from "../../components/admin/AdminUI";
import {
  CatalogToolbar,
  ItemIcon,
  ItemTitle,
  RowActions,
  Select,
  StatCards,
  StatusOptions,
  StatusPill,
} from "../../components/CatalogPage/CatalogPage";
import { ImportRows, SheetActions } from "../../components/SheetImport/SheetImport";
import { EnrollForm } from "./EnrollForm";
import "./InstitutionEnrollments.css";

const PAGE_SIZE = 20;
const EMPTY_QUERY = { search: "", programId: "", programSessionId: "", status: "", page: 1 };

// Which student is in which batch (P05-04), for the college picked in "Working in". Paged on the server.
export function InstitutionEnrollments() {
  const { activeMembership, hasPermission } = useAuth();
  const institution = activeMembership?.institutionId;
  const canCreate = hasPermission("enrollment:create");
  const canUpdate = hasPermission("enrollment:update");
  const [data, setData] = useState(null);
  const [batches, setBatches] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState(EMPTY_QUERY);
  const [view, setView] = useState("table");
  const [editor, setEditor] = useState(null); // { enrollment: null } = enroll, { enrollment } = edit
  const [importing, setImporting] = useState(null);
  const [busyId, setBusyId] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(
      () => setQuery((current) => (current.search === search.trim() ? current : { ...current, search: search.trim(), page: 1 })),
      300
    );
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/institution/enrollments", { params: { ...query, limit: PAGE_SIZE } })
      .then(({ data: response }) => {
        if (cancelled) return;
        setData(response);
        setError("");
      })
      .catch((loadError) => !cancelled && setError(getErrorMessage(loadError, "Failed to load enrollments")));
    return () => {
      cancelled = true;
    };
  }, [query, reloadKey, institution?._id]);

  // Batches feed the program and batch filters.
  useEffect(() => {
    api
      .get("/institution/program-sessions")
      .then(({ data: response }) => setBatches(response.sessions))
      .catch(() => setBatches([]));
  }, [institution?._id]);

  const programs = useMemo(() => {
    const byId = new Map(batches.map((batch) => [batch.programId?._id, batch.programId]));
    return [...byId.values()].filter(Boolean).sort((a, b) => a.code.localeCompare(b.code));
  }, [batches]);
  const programBatches = batches.filter((batch) => batch.programId?._id === query.programId);

  const reload = () => setReloadKey((value) => value + 1);
  const closeEditor = useCallback(() => setEditor(null), []);
  const setFilter = (change) => setQuery((current) => ({ ...current, ...change, page: 1 }));

  const enrollments = data?.enrollments || [];
  const stats = [
    { label: "Enrollments", value: data?.stats.total ?? 0, icon: UsersRound, tone: "cobalt" },
    { label: "Enrolled", value: data?.stats.enrolled ?? 0, icon: GraduationCap, tone: "amber" },
    { label: "Completed", value: data?.stats.completed ?? 0, icon: BadgeCheck, tone: "green" },
    { label: "Cancelled", value: data?.stats.cancelled ?? 0, icon: CircleSlash, tone: "ink" },
  ];
  const hasFilters = Boolean(search || query.programId || query.status);
  const emptyMessage = hasFilters ? "No enrollments match these filters." : "No enrollments yet.";
  const columns = 5 + (canUpdate ? 1 : 0);

  const changeStatus = async (enrollment, next) => {
    setBusyId(enrollment._id);
    try {
      const { data: response } = await api.patch(`/institution/enrollments/${enrollment._id}`, { status: next });
      setData((current) => ({
        ...current,
        enrollments: current.enrollments.map((item) => (item._id === enrollment._id ? response.enrollment : item)),
        stats: {
          ...current.stats,
          [enrollment.status.toLowerCase()]: current.stats[enrollment.status.toLowerCase()] - 1,
          [next.toLowerCase()]: current.stats[next.toLowerCase()] + 1,
        },
      }));
      toast.success(`${enrollment.studentId?.fullName}: ${STATUSES[next].label.toLowerCase()}`);
    } catch (updateError) {
      toast.error(getErrorMessage(updateError, "Failed to change the status"));
    } finally {
      setBusyId("");
    }
  };

  const actions = (enrollment) => (
    <RowActions
      name={`${enrollment.studentId?.fullName} ${enrollment.programId?.code} ${enrollment.programSessionId?.startYear}`}
      statuses={STATUSES}
      value={enrollment.status}
      disabled={busyId === enrollment._id}
      onEdit={() => setEditor({ enrollment })}
      onChange={(next) => changeStatus(enrollment, next)}
    />
  );
  const batchOf = (enrollment) => batchView(enrollment.programSessionId || {}, enrollment.programId);
  const years = (enrollment) => `${enrollment.programSessionId?.startYear} – ${enrollment.programSessionId?.endYear}`;

  return (
    <div className="catalog-page institution-enrollments">
      <AdminPageHeader
        title="Enrollments"
        description={`Which students are in which batch at ${institution?.name || "your institution"}`}
        actions={
          canCreate &&
          data && (
            <>
              <SheetActions spec={ENROLLMENT_SHEET} onRows={setImporting} />
              <Button onClick={() => setEditor({ enrollment: null })}>
                <Plus className="h-4 w-4" /> Enroll Student
              </Button>
            </>
          )
        }
      />

      <AdminError message={error} />

      {!data && !error ? (
        <AdminLoading />
      ) : (
        data && (
          <>
            <StatCards stats={stats} />

            <CatalogToolbar
              search={search}
              onSearch={setSearch}
              placeholder="Search by student, reg. no. or code"
              hasFilters={hasFilters}
              onClear={() => {
                setSearch("");
                setQuery(EMPTY_QUERY);
              }}
              shown={data.pagination.total}
              total={data.stats.total}
              view={view}
              onView={setView}
            >
              <Select
                className="filter"
                aria-label="Filter by program"
                value={query.programId}
                onChange={(event) => setFilter({ programId: event.target.value, programSessionId: "" })}
              >
                <option value="">All programs</option>
                {programs.map((program) => (
                  <option key={program._id} value={program._id}>
                    {program.code}
                  </option>
                ))}
              </Select>
              {query.programId && (
                <Select
                  className="filter"
                  aria-label="Filter by batch"
                  value={query.programSessionId}
                  onChange={(event) => setFilter({ programSessionId: event.target.value })}
                >
                  <option value="">All batches</option>
                  {programBatches.map((batch) => (
                    <option key={batch._id} value={batch._id}>
                      {batchView(batch, batch.programId).name}
                    </option>
                  ))}
                </Select>
              )}
              <Select className="filter" aria-label="Filter by status" value={query.status} onChange={(event) => setFilter({ status: event.target.value })}>
                <option value="">All status</option>
                <StatusOptions statuses={STATUSES} />
              </Select>
            </CatalogToolbar>

            {view === "table" ? (
              <div className="table-card">
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Program</th>
                        <th>Batch</th>
                        <th>Codes</th>
                        <th>Status</th>
                        {canUpdate && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {enrollments.map((enrollment) => (
                        <tr key={enrollment._id}>
                          <td>
                            <ItemTitle
                              icon={UserRound}
                              title={enrollment.studentId?.fullName || "—"}
                              code={enrollment.studentId?.registrationNo || "No reg. no."}
                            />
                          </td>
                          <td>
                            <p className="cell-title">{enrollment.programId?.code}</p>
                            <p className="cell-sub">{enrollment.programId?.name}</p>
                          </td>
                          <td>
                            <span className="inline-flex items-center gap-2">
                              <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: batchOf(enrollment).color }} aria-hidden="true" />
                              <span>
                                <p className="cell-title">{batchOf(enrollment).name}</p>
                                <p className="cell-sub tabular-nums">
                                  {batchOf(enrollment).code} · {years(enrollment)}
                                </p>
                              </span>
                            </span>
                          </td>
                          <td>
                            <p className="code">{enrollment.enrollmentCode || "—"}</p>
                            <p className="cell-sub">{enrollment.officialEnrollmentNo ? `Official: ${enrollment.officialEnrollmentNo}` : "No official no."}</p>
                          </td>
                          <td>
                            <StatusPill statuses={STATUSES} value={enrollment.status} />
                          </td>
                          {canUpdate && <td>{actions(enrollment)}</td>}
                        </tr>
                      ))}
                      {enrollments.length === 0 && (
                        <tr>
                          <td colSpan={columns} className="empty">
                            {emptyMessage}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <AdminPagination pagination={data.pagination} onPage={(page) => setQuery((current) => ({ ...current, page }))} />
              </div>
            ) : enrollments.length === 0 ? (
              <div className="panel empty">{emptyMessage}</div>
            ) : (
              <>
                <div className="item-grid">
                  {enrollments.map((enrollment) => (
                    <article key={enrollment._id} className="item-card">
                      <div className="card-top">
                        <ItemIcon icon={UserRound} />
                        <StatusPill statuses={STATUSES} value={enrollment.status} />
                      </div>
                      <div>
                        <h3 className="item-name">{enrollment.studentId?.fullName}</h3>
                        <p className="item-code">{enrollment.studentId?.registrationNo || "No reg. no."}</p>
                      </div>
                      <dl className="card-meta">
                        <div>
                          <dt>Program</dt>
                          <dd>{enrollment.programId?.code}</dd>
                        </div>
                        <div>
                          <dt>Batch</dt>
                          <dd className="tabular-nums">{batchOf(enrollment).name}</dd>
                        </div>
                      </dl>
                      {canUpdate && <div className="card-actions">{actions(enrollment)}</div>}
                    </article>
                  ))}
                </div>
                <div className="table-card pager-only">
                  <AdminPagination pagination={data.pagination} onPage={(page) => setQuery((current) => ({ ...current, page }))} />
                </div>
              </>
            )}
          </>
        )
      )}

      {importing && (
        <ImportRows
          fileName={importing.fileName}
          rows={importing.rows}
          endpoint="/institution/enrollments/import"
          bodyKey="enrollments"
          noun={["enrollment", "enrollments"]}
          preview={[
            ["Registration no.", "registrationNo"],
            ["Program", "programCode"],
            ["Start year", "startYear"],
            ["Status", "status"],
          ]}
          onClose={() => setImporting(null)}
          onDone={reload}
        />
      )}

      {editor && (
        <EnrollForm
          enrollment={editor.enrollment}
          onClose={closeEditor}
          onSaved={() => {
            closeEditor();
            reload();
          }}
        />
      )}
    </div>
  );
}
