import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, PauseCircle, Plus } from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../../lib/api";
import { codeColor } from "../../lib/admin";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/Button";
import { AdminError, AdminLoading, AdminPageHeader } from "../../components/admin/AdminUI";
import {
  CatalogModal,
  CatalogToolbar,
  ItemIcon,
  ItemTitle,
  RowActions,
  Select,
  StatCards,
  StatusOptions,
  StatusPill,
} from "../../components/CatalogPage/CatalogPage";
import { ColorField, FormPreview, StatusCards } from "../../components/FormFields/FormFields";
import "./InstitutionPrograms.css";

const STATUSES = { ACTIVE: { label: "Active", tone: "success" }, INACTIVE: { label: "Inactive", tone: "warning" } };
const STATUS_CHOICES = [
  { value: "ACTIVE", label: "Active", hint: "Batches can be created for this program", tone: "success" },
  { value: "INACTIVE", label: "Inactive", hint: "Hidden when creating new batches", tone: "neutral" },
];

function ProgramForm({ program, onClose, onSaved }) {
  const isEditing = Boolean(program);
  const [code, setCode] = useState(program?.code || "");
  const [name, setName] = useState(program?.name || "");
  const [description, setDescription] = useState(program?.description || "");
  const [status, setStatus] = useState(program?.status || "ACTIVE");
  const autoColor = codeColor(code || "PROGRAM");
  // "" = automatic. A saved colour that equals the generated one counts as automatic.
  const [color, setColor] = useState(program?.color && program.color !== codeColor(program.code) ? program.color : "");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const details = { name, description, status };
      if (isEditing) {
        // Always send the colour on edit so choosing "Auto" resets a custom one.
        await api.patch(`/institution/programs/${program._id}`, { ...details, color: color || autoColor });
      } else {
        // No colour sent = the server generates it from the code.
        await api.post("/institution/programs", { ...details, code, ...(color && { color }) });
      }
      toast.success(isEditing ? "Program updated" : "Program added");
      onSaved();
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, "Failed to save the program"));
      setIsSaving(false);
    }
  };

  return (
    <CatalogModal
      title={isEditing ? `Edit ${program.code}` : "Add program"}
      submitLabel={isEditing ? "Save changes" : "Save"}
      isSaving={isSaving}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="program-form">
        <div className="field-pair">
          <div className="space-y-1.5">
            <label htmlFor="program-name" className="field-label block">
              Program name
            </label>
            <input
              id="program-name"
              className="input-field"
              required
              autoFocus
              maxLength={200}
              placeholder="e.g. B.Tech in Computer Science"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="program-code" className="field-label block">
              Code
            </label>
            <input
              id="program-code"
              className="input-field uppercase"
              required
              maxLength={20}
              disabled={isEditing}
              placeholder="e.g. CSE"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </div>
        </div>
        <p className="field-hint">{isEditing ? "The code is fixed after creation." : "The code is unique in your college and cannot be changed later."}</p>

        <div className="space-y-1.5">
          <label htmlFor="program-description" className="field-label block">
            Description <span className="text-ink/40">(optional)</span>
          </label>
          <textarea
            id="program-description"
            className="input-field program-textarea"
            rows={3}
            maxLength={500}
            placeholder="A short note about this program"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <ColorField value={color} autoColor={autoColor} onChange={setColor} />
        <StatusCards choices={STATUS_CHOICES} value={status} onChange={setStatus} />

        <FormPreview icon={BookOpen} color={color || autoColor} title={name || "Program name"}>
          {code && <span className="program-preview-code">{code.toUpperCase()}</span>}
          <StatusPill statuses={STATUSES} value={status} />
        </FormPreview>
      </div>
    </CatalogModal>
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
        (!term || [program.name, program.code, program.description].some((value) => value?.toLowerCase().includes(term)))
    );
  }, [programs, status, search]);

  const hasFilters = Boolean(status || search);
  const emptyMessage = hasFilters ? "No programs match these filters." : "No programs yet.";
  const columns = 3 + (canUpdate ? 1 : 0);

  const changeStatus = async (program, next) => {
    setBusyId(program._id);
    try {
      const { data } = await api.patch(`/institution/programs/${program._id}`, { status: next });
      // Swap in the saved row so the dropdown, stats and filters update with the toast, not after a reload.
      setPrograms((list) => list.map((item) => (item._id === program._id ? { ...data.program, color: data.program.color ?? item.color } : item)));
      toast.success(`${program.code} is now ${STATUSES[next].label.toLowerCase()}`);
    } catch (updateError) {
      toast.error(getErrorMessage(updateError, "Failed to change the status"));
    } finally {
      setBusyId("");
    }
  };

  const actions = (program) => (
    <RowActions
      name={program.code}
      statuses={STATUSES}
      value={program.status}
      disabled={busyId === program._id}
      onEdit={() => setEditor({ program })}
      onChange={(next) => changeStatus(program, next)}
    />
  );

  return (
    <div className="catalog-page institution-programs">
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
            <StatCards stats={stats} />

            <CatalogToolbar
              search={search}
              onSearch={setSearch}
              placeholder="Search by name, code, description"
              hasFilters={hasFilters}
              onClear={() => {
                setStatus("");
                setSearch("");
              }}
              shown={visible.length}
              total={total}
              view={view}
              onView={setView}
            >
              <Select className="filter" aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}>
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
                        <th>Program</th>
                        <th>Description</th>
                        <th>Status</th>
                        {canUpdate && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((program) => (
                        <tr key={program._id}>
                          <td>
                            <ItemTitle icon={BookOpen} title={program.name} code={program.code} color={program.color} />
                          </td>
                          <td className="program-desc">{program.description || "—"}</td>
                          <td>
                            <StatusPill statuses={STATUSES} value={program.status} />
                          </td>
                          {canUpdate && <td>{actions(program)}</td>}
                        </tr>
                      ))}
                      {visible.length === 0 && (
                        <tr>
                          <td colSpan={columns} className="empty">
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
              <div className="item-grid">
                {visible.map((program) => (
                  <article key={program._id} className="item-card">
                    <div className="card-top">
                      <ItemIcon icon={BookOpen} color={program.color} />
                      <StatusPill statuses={STATUSES} value={program.status} />
                    </div>
                    <div>
                      <h3 className="item-name">{program.name}</h3>
                      <p className="item-code">{program.code}</p>
                    </div>
                    {program.description && <p className="program-desc">{program.description}</p>}
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
