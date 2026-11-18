import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  LayoutGrid,
  List,
  PauseCircle,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { AdminError, AdminLoading, AdminPageHeader, StatusBadge } from "../../components/admin/AdminUI";
import "./InstitutionPrograms.css";

const STATUS_LABELS = { ACTIVE: "Active", INACTIVE: "Inactive" };

// Shown exactly as the college entered it: "4 years", "18 months".
const formatDuration = ({ durationValue: value, durationUnit: unit }) => {
  if (value == null || !unit) return "—";
  const word = unit === "YEARS" ? "year" : "month";
  return `${value} ${value === 1 ? word : `${word}s`}`;
};

// Native select with the chevron that `.select-field` (appearance-none) hides.
function Select({ className = "", children, ...props }) {
  return (
    <span className={`select-wrap ${className}`}>
      <select className="select-field" {...props}>
        {children}
      </select>
      <ChevronDown className="select-chevron" aria-hidden="true" />
    </span>
  );
}

function ProgramForm({ program, onClose, onSaved }) {
  const isEditing = Boolean(program);
  const [form, setForm] = useState({
    code: program?.code || "",
    name: program?.name || "",
    degreeLevel: program?.degreeLevel || "",
    durationValue: program?.durationValue ?? "",
    durationUnit: program?.durationUnit || "YEARS",
  });
  const inYears = form.durationUnit === "YEARS";
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && !isSaving && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSaving, onClose]);

  const field = (key) => ({
    value: form[key],
    onChange: (event) => setForm((current) => ({ ...current, [key]: event.target.value })),
  });

  const submit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    const details = {
      name: form.name,
      degreeLevel: form.degreeLevel,
      // Value and unit go as entered; an empty value clears both.
      durationValue: form.durationValue === "" ? null : Number(form.durationValue),
      durationUnit: form.durationValue === "" ? null : form.durationUnit,
    };

    try {
      if (isEditing) await api.patch(`/institution/programs/${program._id}`, details);
      else await api.post("/institution/programs", { ...details, code: form.code });
      toast.success(isEditing ? "Program updated" : "Program added");
      onSaved();
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, "Failed to save the program"));
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !isSaving && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="program-form-title" className="modal">
        <form onSubmit={submit}>
          <div className="modal-head">
            <h2 id="program-form-title" className="modal-title">
              {isEditing ? `Edit ${program.code}` : "Add program"}
            </h2>
            <button type="button" className="icon-btn" onClick={onClose} disabled={isSaving} aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="modal-body">
            <Input
              label="Code"
              required
              autoFocus={!isEditing}
              maxLength={20}
              disabled={isEditing}
              placeholder="e.g. CSE"
              description={isEditing ? "The code is fixed after creation." : "Unique in your college. It cannot be changed later."}
              {...field("code")}
            />
            <Input label="Name" required autoFocus={isEditing} maxLength={200} placeholder="e.g. B.Tech in Computer Science" {...field("name")} />
            <div className="field-pair">
              <Input label="Degree level" maxLength={60} placeholder="e.g. Bachelor" {...field("degreeLevel")} />
              <div className="space-y-1">
                <label htmlFor="program-duration" className="field-label block">
                  Duration
                </label>
                <div className="duration-field">
                  <input
                    id="program-duration"
                    type="number"
                    className="input-field"
                    min={inYears ? 0.5 : 1}
                    max={inYears ? 20 : 240}
                    step={inYears ? 0.5 : 1}
                    placeholder={inYears ? "e.g. 4" : "e.g. 48"}
                    {...field("durationValue")}
                  />
                  <Select aria-label="Duration unit" {...field("durationUnit")}>
                    <option value="YEARS">Years</option>
                    <option value="MONTHS">Months</option>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-foot">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {isEditing ? "Save changes" : "Add program"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Courses of the college picked in "Working in"; the API scopes everything to that college.
export function InstitutionPrograms() {
  const { activeMembership, hasPermission } = useAuth();
  const institution = activeMembership?.institutionId;
  const canCreate = hasPermission("program:create");
  const canUpdate = hasPermission("program:update");
  const [programs, setPrograms] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("table");
  const [editor, setEditor] = useState(null); // { program: null } = add, { program } = edit
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/institution/programs");
      setPrograms(data.programs);
      setError("");
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load programs"));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, institution?._id]);

  const closeEditor = useCallback(() => setEditor(null), []);

  const total = programs?.length ?? 0;
  const active = programs?.filter((program) => program.status === "ACTIVE").length ?? 0;
  const stats = [
    { label: "Total programs", value: total, icon: BookOpen, tone: "cobalt" },
    { label: "Active", value: active, icon: CheckCircle2, tone: "green" },
    { label: "Inactive", value: total - active, icon: PauseCircle, tone: "amber" },
  ];

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (programs || []).filter(
      (program) =>
        (!status || program.status === status) &&
        (!term || [program.name, program.code, program.degreeLevel].some((value) => value?.toLowerCase().includes(term)))
    );
  }, [programs, status, search]);

  const hasFilters = Boolean(status || search);

  const changeStatus = async (program, next) => {
    setBusyId(program._id);
    try {
      await api.patch(`/institution/programs/${program._id}`, { status: next });
      toast.success(`${program.code} is now ${STATUS_LABELS[next].toLowerCase()}`);
      await load();
    } catch (updateError) {
      toast.error(getErrorMessage(updateError, "Failed to change the status"));
    } finally {
      setBusyId("");
    }
  };

  const actions = (program) => (
    <div className="actions">
      <button type="button" className="edit-btn" onClick={() => setEditor({ program })} aria-label={`Edit ${program.code}`} title="Edit">
        <Pencil className="h-4 w-4" />
      </button>
      <Select
        className={program.status === "ACTIVE" ? "is-active" : "is-inactive"}
        aria-label={`Status of ${program.code}`}
        value={program.status}
        disabled={busyId === program._id}
        onChange={(event) => changeStatus(program, event.target.value)}
      >
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
    </div>
  );

  const badge = (program) => (
    <StatusBadge tone={program.status === "ACTIVE" ? "success" : "warning"}>{STATUS_LABELS[program.status]}</StatusBadge>
  );

  const emptyMessage = hasFilters ? "No programs match these filters." : "No programs yet.";

  return (
    <div className="institution-programs">
      <AdminPageHeader
        title="Programs"
        description={`Courses offered by ${institution?.name || "your institution"}`}
        actions={
          canCreate && (
            <Button onClick={() => setEditor({ program: null })}>
              <Plus className="h-4 w-4" /> Add Program
            </Button>
          )
        }
      />

      <AdminError message={error} />

      {!programs && !error ? (
        <AdminLoading />
      ) : (
        programs && (
          <>
            <div className="stats">
              {stats.map((stat) => (
                <div key={stat.label} className={`stat tone-${stat.tone}`}>
                  <span className="stat-icon">
                    <stat.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="stat-number">{stat.value}</p>
                    <p className="stat-label">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="toolbar">
              <Select className="status-filter" aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">All status</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <label className="search">
                <Search className="search-icon" aria-hidden="true" />
                <input
                  type="search"
                  aria-label="Search programs"
                  placeholder="Search by name, code, level"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="input-field"
                />
              </label>
              <button
                type="button"
                className="clear-btn"
                disabled={!hasFilters}
                onClick={() => {
                  setStatus("");
                  setSearch("");
                }}
              >
                <RotateCcw className="h-4 w-4" /> Clear filters
              </button>
              <span className="count-pill">
                {visible.length} of {total}
              </span>

              <div className="view-toggle" role="group" aria-label="View">
                <button type="button" aria-pressed={view === "grid"} aria-label="Grid view" title="Grid view" onClick={() => setView("grid")}>
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button type="button" aria-pressed={view === "table"} aria-label="Table view" title="Table view" onClick={() => setView("table")}>
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>

            {view === "table" ? (
              <div className="table-card">
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Program</th>
                        <th>Degree level</th>
                        <th>Duration</th>
                        <th>Status</th>
                        {canUpdate && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((program) => (
                        <tr key={program._id}>
                          <td>
                            <div className="program-cell">
                              <span className="program-icon">
                                <BookOpen className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <p className="program-name">{program.name}</p>
                                <p className="program-code">{program.code}</p>
                              </div>
                            </div>
                          </td>
                          <td>{program.degreeLevel || "—"}</td>
                          <td className="whitespace-nowrap tabular-nums">{formatDuration(program)}</td>
                          <td>{badge(program)}</td>
                          {canUpdate && <td>{actions(program)}</td>}
                        </tr>
                      ))}
                      {visible.length === 0 && (
                        <tr>
                          <td colSpan={canUpdate ? 5 : 4} className="empty">
                            {emptyMessage}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : visible.length === 0 ? (
              <div className="panel empty">{emptyMessage}</div>
            ) : (
              <div className="program-grid">
                {visible.map((program) => (
                  <article key={program._id} className="program-card">
                    <div className="card-top">
                      <span className="program-icon">
                        <BookOpen className="h-4 w-4" />
                      </span>
                      {badge(program)}
                    </div>
                    <div>
                      <h3 className="program-name">{program.name}</h3>
                      <p className="program-code">{program.code}</p>
                    </div>
                    <dl className="card-meta">
                      <div>
                        <dt>Degree level</dt>
                        <dd>{program.degreeLevel || "—"}</dd>
                      </div>
                      <div>
                        <dt>Duration</dt>
                        <dd>{formatDuration(program)}</dd>
                      </div>
                    </dl>
                    {canUpdate && <div className="card-actions">{actions(program)}</div>}
                  </article>
                ))}
              </div>
            )}
          </>
        )
      )}

      {editor && (
        <ProgramForm
          program={editor.program}
          onClose={closeEditor}
          onSaved={() => {
            closeEditor();
            load();
          }}
        />
      )}
    </div>
  );
}
