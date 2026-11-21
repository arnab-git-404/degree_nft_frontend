import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Plus } from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../../lib/api";
import { sessionLabel, yearColor } from "../../lib/admin";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/Button";
import { AdminError, AdminLoading } from "../../components/admin/AdminUI";
import { CatalogModal, ItemTitle, StatusPill } from "../../components/CatalogPage/CatalogPage";
import { ColorField, FormPreview, StatusCards } from "../../components/FormFields/FormFields";
import "./InstitutionAcademicSessions.css";

const YEAR_STATUSES = { ACTIVE: { label: "Active", tone: "success" }, INACTIVE: { label: "Inactive", tone: "neutral" } };

const STATUS_CHOICES = [
  { value: "ACTIVE", label: "Active", hint: "Batches can be created in this year", tone: "success" },
  { value: "INACTIVE", label: "Inactive", hint: "Hidden when creating new batches", tone: "neutral" },
];

function SessionForm({ onClose, onSaved }) {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [status, setStatus] = useState("ACTIVE");
  const [color, setColor] = useState(""); // "" = automatic
  const [isSaving, setIsSaving] = useState(false);
  const autoColor = yearColor(Number(year) || new Date().getFullYear());
  const shownColor = color || autoColor;

  const submit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      // A single year: start and end are the same. No colour sent = the server picks one.
      await api.post("/institution/academic-sessions", {
        startYear: Number(year),
        endYear: Number(year),
        isActive: status === "ACTIVE",
        ...(color && { color }),
      });
      toast.success(`Academic year ${year} added`);
      onSaved();
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, "Failed to add the academic year"));
      setIsSaving(false);
    }
  };

  return (
    <CatalogModal title="Add academic year" submitLabel="Save" isSaving={isSaving} onClose={onClose} onSubmit={submit}>
      <div className="year-form">
        <div className="space-y-1.5">
          <label htmlFor="session-year" className="field-label block">
            Academic year
          </label>
          <div className="year-input">
            <span className="year-input__icon" style={{ background: shownColor }}>
              <CalendarDays className="h-5 w-5" />
            </span>
            <input
              id="session-year"
              type="number"
              required
              autoFocus
              min={1950}
              max={2100}
              step={1}
              value={year}
              onChange={(event) => setYear(event.target.value)}
            />
          </div>
          <p className="field-hint">A single year, e.g. 2026.</p>
        </div>

        <ColorField value={color} autoColor={autoColor} onChange={setColor} />
        <StatusCards choices={STATUS_CHOICES} value={status} onChange={setStatus} />

        {Number(year) >= 1950 && (
          <FormPreview icon={CalendarDays} color={shownColor} title={year}>
            <StatusPill statuses={YEAR_STATUSES} value={status} />
          </FormPreview>
        )}
      </div>
    </CatalogModal>
  );
}

// Administration › Academic Sessions: the college's years (2024-25) that programs take intakes in.
export function InstitutionAcademicSessions() {
  const { activeMembership, hasPermission } = useAuth();
  const institution = activeMembership?.institutionId;
  const canManage = hasPermission("academicSession:manage");
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/institution/academic-sessions");
      setSessions(data.academicSessions);
      setError("");
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load academic sessions"));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, institution?._id]);

  const closeForm = useCallback(() => setIsAdding(false), []);

  const update = async (session, change) => {
    setBusyId(session._id);
    try {
      await api.patch(`/institution/academic-sessions/${session._id}`, change);
      await load();
    } catch (updateError) {
      toast.error(getErrorMessage(updateError, "Failed to update the academic year"));
    } finally {
      setBusyId("");
    }
  };

  const active = sessions?.filter((session) => session.isActive).length ?? 0;
  const current = sessions?.find((session) => session.isCurrent);
  const tags = [
    { label: "Total", value: sessions?.length ?? 0, tone: "total" },
    { label: "Active", value: active, tone: "active" },
    { label: "Inactive", value: (sessions?.length ?? 0) - active, tone: "inactive" },
    ...(current ? [{ label: "Current", value: sessionLabel(current), tone: "current" }] : []),
  ];
  const shown = sessions?.filter((session) => sessionLabel(session).includes(search.trim())) ?? [];

  return (
    <div className="catalog-page institution-academic-sessions">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="year-tags">
          {tags.map((tag) => (
            <span key={tag.label} className={`year-tag tag-${tag.tone}`}>
              <i aria-hidden="true" />
              <b>{tag.value}</b> {tag.label}
            </span>
          ))}
        </div>
        {canManage && (
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4" /> Add Academic Year
          </Button>
        )}
      </div>

      <AdminError message={error} />

      {!sessions && !error ? (
        <AdminLoading />
      ) : (
        sessions && (
          <>
            <div className="flex items-center justify-between gap-3">
              <input
                type="search"
                className="year-search"
                placeholder="Search academic years…"
                aria-label="Search academic years"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <span className="year-tag tag-total">
                <b>{shown.length}</b> shown
              </span>
            </div>

            <div className="table-card">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Academic year</th>
                      <th>Program batches</th>
                      <th>Current</th>
                      <th>Status</th>
                      {canManage && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((session) => (
                      <tr key={session._id}>
                        <td>
                          <ItemTitle icon={CalendarDays} title={sessionLabel(session)} color={session.color} />
                        </td>
                        <td className="tabular-nums">{session.batchCount}</td>
                        <td>
                          <button
                            type="button"
                            className={`cur-pill ${session.isCurrent ? "is-current" : ""}`}
                            disabled={!canManage || !session.isActive || session.isCurrent || busyId === session._id}
                            onClick={() => update(session, { isCurrent: true })}
                          >
                            <i aria-hidden="true" />
                            {session.isCurrent ? "Current" : "Set Current"}
                          </button>
                        </td>
                        <td>
                          <StatusPill statuses={YEAR_STATUSES} value={session.isActive ? "ACTIVE" : "INACTIVE"} />
                        </td>
                        {canManage && (
                          <td className="year-actions">
                            <div className="seg" role="group" aria-label={`Status of ${sessionLabel(session)}`}>
                              <button
                                type="button"
                                className={session.isActive ? "on-active" : ""}
                                disabled={busyId === session._id}
                                onClick={() => !session.isActive && update(session, { isActive: true })}
                              >
                                Active
                              </button>
                              <button
                                type="button"
                                className={session.isActive ? "" : "on-inactive"}
                                disabled={busyId === session._id || session.isCurrent}
                                title={session.isCurrent ? "Set another year as current first" : undefined}
                                onClick={() => session.isActive && update(session, { isActive: false })}
                              >
                                Inactive
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                    {sessions.length === 0 && (
                      <tr>
                        <td colSpan={canManage ? 5 : 4} className="empty">
                          No academic years yet. Add one, then create program batches in it.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )
      )}

      {isAdding && (
        <SessionForm
          onClose={closeForm}
          onSaved={() => {
            closeForm();
            load();
          }}
        />
      )}
    </div>
  );
}
