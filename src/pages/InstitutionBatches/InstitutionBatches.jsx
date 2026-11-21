import { useCallback, useEffect, useMemo, useState } from "react";
import { Layers, Plus } from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../../lib/api";
import { codeColor, sessionLabel } from "../../lib/admin";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/Button";
import { AdminError, AdminLoading, AdminPageHeader } from "../../components/admin/AdminUI";
import { CatalogPanel, ItemTitle, RowActions, Select, StatCards, StatusPill } from "../../components/CatalogPage/CatalogPage";
import { ColorField, FormPreview, StatusCards } from "../../components/FormFields/FormFields";
import "./InstitutionBatches.css";

// Nothing is deleted anywhere: a batch that is no longer used is set to Inactive.
const BATCH_STATUSES = {
  ACTIVE: { label: "Active", tone: "success" },
  INACTIVE: { label: "Inactive", tone: "warning" },
};
const STATUS_CHOICES = [
  { value: "ACTIVE", label: "Active", hint: "Students can be enrolled", tone: "success" },
  { value: "INACTIVE", label: "Inactive", hint: "Hidden when enrolling students", tone: "neutral" },
];

// Create a batch, or (with `batch`) edit one: name, colour, passing-out year and status. Course, year and code are fixed.
function BatchForm({ batch, programs, academicSessions, batches, onClose, onSaved }) {
  const isEditing = Boolean(batch);
  const [programId, setProgramId] = useState("");
  const [academicSessionId, setAcademicSessionId] = useState("");
  const [endYear, setEndYear] = useState(isEditing ? String(batch.endYear) : "");
  const [name, setName] = useState(batch?.name || "");
  const [code, setCode] = useState(batch?.code || "");
  const [status, setStatus] = useState(batch?.status || "ACTIVE");
  const [isSaving, setIsSaving] = useState(false);

  const program = isEditing ? batch.programId : programs.find((item) => item._id === programId);
  const session = academicSessions.find((item) => item._id === (isEditing ? batch.academicSessionId : academicSessionId));
  const startYear = isEditing ? batch.startYear : session?.startYear;
  const taken = (id) => batches.some((item) => item.programId?._id === programId && item.academicSessionId === id);

  // "" = automatic. A saved colour that equals the generated one counts as automatic.
  const [color, setColor] = useState(isEditing && batch.color !== codeColor(batch.code) ? batch.color : "");

  // The course's latest batch sets the usual length (CSE 2026–2030 → the next one suggests start + 4).
  const lastBatch = isEditing ? null : batches.filter((item) => item.programId?._id === programId).sort((a, b) => b.startYear - a.startYear)[0];
  const span = lastBatch ? lastBatch.endYear - lastBatch.startYear : 0;
  const suggestedEnd = startYear && span ? startYear + span : "";
  const effectiveEnd = Number(endYear || suggestedEnd || 0);

  const defaultCode = program && startYear ? `${program.code}-${startYear}` : "";
  const defaultName = program && startYear ? `${program.code} ${startYear}–${effectiveEnd || "…"}` : "";
  const finalCode = (code.trim() || defaultCode).toUpperCase();
  const autoColor = codeColor(finalCode || "BATCH");

  const submit = async (event) => {
    event.preventDefault();
    if (!startYear) {
      toast.error("Select an academic year");
      return;
    }
    if (effectiveEnd <= startYear) {
      toast.error("The passing-out year must be after the start year");
      return;
    }
    setIsSaving(true);
    try {
      if (isEditing) {
        // Always send the colour on edit so choosing "Auto" resets a custom one.
        await api.patch(`/institution/program-sessions/${batch._id}`, { endYear: effectiveEnd, name: name.trim() || defaultName, color: color || autoColor, status });
      } else {
        // Blank name / code / colour = the server fills them in the same way.
        await api.post("/institution/program-sessions", {
          programId,
          academicSessionId,
          endYear: effectiveEnd,
          status,
          ...(name.trim() && { name: name.trim() }),
          ...(code.trim() && { code: code.trim() }),
          ...(color && { color }),
        });
      }
      toast.success(isEditing ? "Batch updated" : `Batch ${finalCode} created`);
      onSaved();
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, isEditing ? "Failed to update the batch" : "Failed to create the batch"));
      setIsSaving(false);
    }
  };

  return (
    <CatalogPanel
      title={isEditing ? `Edit ${batch.code}` : "Create batch"}
      submitLabel={isEditing ? "Save changes" : "Save"}
      isSaving={isSaving}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="batch-form">
        {isEditing ? (
          <div className="space-y-1.5">
            <span className="field-label block">Course and academic year</span>
            <p className="pick-empty">
              {program?.code} · {program?.name} · starts {session ? sessionLabel(session) : batch.startYear}. The course, academic year and code are
              fixed after creation.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <label htmlFor="batch-program" className="field-label block">
                Course
              </label>
              <Select
                id="batch-program"
                className="w-full"
                required
                value={programId}
                onChange={(event) => {
                  setProgramId(event.target.value);
                  setAcademicSessionId("");
                  setEndYear("");
                }}
              >
                <option value="">Select a course</option>
                {programs.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.code} — {item.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <span className="field-label block">Academic year (batch starts)</span>
              {!programId ? (
                <p className="pick-empty">Select a course first.</p>
              ) : academicSessions.length === 0 ? (
                <p className="pick-empty">No active academic years. Add one in Administration › Settings.</p>
              ) : (
                <div className="pick-list" role="radiogroup" aria-label="Academic year">
                  {academicSessions.map((item) => (
                    <button
                      key={item._id}
                      type="button"
                      role="radio"
                      aria-checked={academicSessionId === item._id}
                      disabled={taken(item._id)}
                      className={`pick-row ${academicSessionId === item._id ? "is-on" : ""}`}
                      onClick={() => {
                        setAcademicSessionId(item._id);
                        setEndYear("");
                      }}
                    >
                      <i style={{ background: item.color }} aria-hidden="true" />
                      <b>{sessionLabel(item)}</b>
                      {item.isCurrent && <span className="pick-row__tag">Current</span>}
                      {taken(item._id) && <span className="pick-row__note">batch exists</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <div className="field-pair">
          <div className="space-y-1.5">
            <label htmlFor="batch-end" className="field-label block">
              Passing-out year
            </label>
            <input
              id="batch-end"
              type="number"
              className="input-field"
              required={!suggestedEnd}
              disabled={!startYear}
              min={startYear ? startYear + 1 : 1950}
              max={2100}
              step={1}
              placeholder={suggestedEnd ? String(suggestedEnd) : "e.g. 2030"}
              value={endYear}
              onChange={(event) => setEndYear(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="batch-duration" className="field-label block">
              Duration (years)
            </label>
            <input
              id="batch-duration"
              type="number"
              className="input-field"
              disabled={!startYear}
              min={1}
              max={20}
              step={1}
              placeholder="e.g. 4"
              value={startYear && effectiveEnd ? String(effectiveEnd - startYear) : ""}
              onChange={(event) => setEndYear(event.target.value === "" ? "" : String(startYear + Number(event.target.value)))}
            />
          </div>
        </div>
        {suggestedEnd ? (
          <p className="field-hint">Suggested from {lastBatch.programId.code}'s last batch ({span} years). Change the year or the duration; they stay in sync.</p>
        ) : (
          <p className="field-hint">
            Enter the passing-out year (e.g. 2030) or the duration (e.g. 4); the other is calculated.
            {isEditing && " It cannot change once students are enrolled."}
          </p>
        )}

        <div className="field-pair">
          <div className="space-y-1.5">
            <label htmlFor="batch-code" className="field-label block">
              Batch code
            </label>
            <input
              id="batch-code"
              className="input-field uppercase"
              maxLength={30}
              disabled={isEditing}
              placeholder={defaultCode || "e.g. CSE-2026"}
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="batch-name" className="field-label block">
              Batch name
            </label>
            <input
              id="batch-name"
              className="input-field"
              maxLength={200}
              placeholder={defaultName || "e.g. CSE 2026–2030"}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
        </div>
        <p className="field-hint">
          {isEditing ? "The code is fixed after creation." : "Leave both blank to use the suggestions. The code cannot be changed after saving."}
        </p>

        <ColorField value={color} autoColor={autoColor} onChange={setColor} />
        <StatusCards choices={STATUS_CHOICES} value={status} onChange={setStatus} />

        {program && startYear && (
          <FormPreview icon={Layers} color={color || autoColor} title={name.trim() || defaultName}>
            <span className="batch-preview-code">{finalCode}</span>
            <StatusPill statuses={BATCH_STATUSES} value={status} />
          </FormPreview>
        )}
      </div>
    </CatalogPanel>
  );
}

// Institution › Batches: a course's cohorts (CSE 2026–2030, CSE 2027–2031, …), each started in an academic year.
export function InstitutionBatches() {
  const { activeMembership, hasPermission } = useAuth();
  const institution = activeMembership?.institutionId;
  const canCreate = hasPermission("programSession:create");
  const canUpdate = hasPermission("programSession:update");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState(null); // { batch: null } = create, { batch } = edit
  const [programFilter, setProgramFilter] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    try {
      const [programs, batches, years] = await Promise.all([
        api.get("/institution/programs"),
        api.get("/institution/program-sessions"),
        api.get("/institution/academic-sessions"),
      ]);
      setData({ programs: programs.data.programs, batches: batches.data.sessions, academicSessions: years.data.academicSessions });
      setError("");
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load batches"));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, institution?._id]);

  const closeEditor = useCallback(() => setEditor(null), []);

  const changeStatus = async (batch, status) => {
    setBusyId(batch._id);
    try {
      await api.patch(`/institution/program-sessions/${batch._id}`, { status });
      await load();
      toast.success(`${batch.code} is now ${BATCH_STATUSES[status].label.toLowerCase()}`);
    } catch (updateError) {
      toast.error(getErrorMessage(updateError, "Failed to update the batch"));
    } finally {
      setBusyId("");
    }
  };

  const activePrograms = useMemo(() => data?.programs.filter((program) => program.status === "ACTIVE") ?? [], [data]);
  const activeYears = useMemo(() => data?.academicSessions.filter((session) => session.isActive) ?? [], [data]);
  const shown = data?.batches.filter((batch) => !programFilter || batch.programId?._id === programFilter) ?? [];
  const active = data?.batches.filter((batch) => batch.status === "ACTIVE").length ?? 0;
  const stats = [
    { label: "Batches", value: data?.batches.length ?? 0, icon: Layers, tone: "cobalt" },
    { label: "Active", value: active, icon: Layers, tone: "green" },
    { label: "Inactive", value: (data?.batches.length ?? 0) - active, icon: Layers, tone: "amber" },
  ];

  return (
    <div className="catalog-page institution-batches">
      <AdminPageHeader
        title="Batches"
        description={`Batches at ${institution?.name || "your institution"}. A course can have many, each starting in an academic year.`}
        actions={
          canCreate && (
            <Button onClick={() => setEditor({ batch: null })} disabled={!data}>
              <Plus className="h-4 w-4" /> Create Batch
            </Button>
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

            <Select aria-label="Filter by course" className="batch-filter" value={programFilter} onChange={(event) => setProgramFilter(event.target.value)}>
              <option value="">All courses</option>
              {data.programs.map((program) => (
                <option key={program._id} value={program._id}>
                  {program.code} — {program.name}
                </option>
              ))}
            </Select>

            <div className="table-card">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Batch</th>
                      <th>Course</th>
                      <th>Academic year</th>
                      <th>Years</th>
                      <th>Status</th>
                      {canUpdate && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((batch) => {
                      const academicYear = data.academicSessions.find((session) => session._id === batch.academicSessionId);
                      return (
                        <tr key={batch._id}>
                          <td>
                            <ItemTitle icon={Layers} title={batch.name} code={batch.code} color={batch.color} />
                          </td>
                          <td>{batch.programId?.name}</td>
                          <td>
                            {academicYear ? (
                              <span className="inline-flex items-center gap-2">
                                <i className="h-2.5 w-2.5 rounded-full" style={{ background: academicYear.color }} aria-hidden="true" />
                                {sessionLabel(academicYear)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="whitespace-nowrap tabular-nums">
                            {batch.startYear} – {batch.endYear}
                          </td>
                          <td>
                            <StatusPill statuses={BATCH_STATUSES} value={batch.status} />
                          </td>
                          {canUpdate && (
                            <td>
                              <RowActions
                                name={batch.code}
                                statuses={BATCH_STATUSES}
                                value={batch.status}
                                disabled={busyId === batch._id}
                                onEdit={() => setEditor({ batch })}
                                onChange={(next) => changeStatus(batch, next)}
                              />
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {shown.length === 0 && (
                      <tr>
                        <td colSpan={canUpdate ? 6 : 5} className="empty">
                          No batches yet. Create one by choosing a course and an academic year.
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

      {editor && (
        <BatchForm
          batch={editor.batch}
          programs={activePrograms}
          academicSessions={editor.batch ? data.academicSessions : activeYears}
          batches={data.batches}
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
