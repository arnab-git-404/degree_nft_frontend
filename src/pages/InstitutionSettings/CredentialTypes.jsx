import { useCallback, useEffect, useState } from "react";
import { Award, Pencil, Plus } from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../../lib/api";
import { codeColor } from "../../lib/admin";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/Button";
import { AdminError, AdminLoading } from "../../components/admin/AdminUI";
import { CatalogModal, ItemTitle, StatusPill } from "../../components/CatalogPage/CatalogPage";
import { ColorField, FormPreview, StatusCards } from "../../components/FormFields/FormFields";
import "./CredentialTypes.css";

const STATUSES = { ACTIVE: { label: "Active", tone: "success" }, INACTIVE: { label: "Inactive", tone: "danger" } };
const STATUS_CHOICES = [
  { value: "ACTIVE", label: "Active", hint: "Can be chosen when issuing credentials", tone: "success" },
  { value: "INACTIVE", label: "Inactive", hint: "Hidden when issuing new credentials", tone: "danger" },
];

function TypeForm({ item, onClose, onSaved }) {
  const isEditing = Boolean(item);
  const [code, setCode] = useState(item?.code || "");
  const [name, setName] = useState(item?.name || "");
  const [description, setDescription] = useState(item?.description || "");
  const [status, setStatus] = useState(item?.status || "ACTIVE");
  const autoColor = codeColor(code || "TYPE");
  // "" = automatic. A saved colour that equals the generated one counts as automatic.
  const [color, setColor] = useState(item?.color && item.color !== codeColor(item.code) ? item.color : "");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const details = { name, description, status };
      if (isEditing) {
        // Always send the colour on edit so choosing "Auto" resets a custom one.
        await api.patch(`/institution/credential-types/${item._id}`, { ...details, color: color || autoColor });
      } else {
        // No colour sent = the server generates it from the code.
        await api.post("/institution/credential-types", { ...details, code, ...(color && { color }) });
      }
      toast.success(isEditing ? "Credential type updated" : "Credential type added");
      onSaved();
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, "Failed to save the credential type"));
      setIsSaving(false);
    }
  };

  return (
    <CatalogModal
      title={isEditing ? `Edit ${item.code}` : "Add credential type"}
      submitLabel={isEditing ? "Save changes" : "Save"}
      isSaving={isSaving}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="credential-type-form">
        <div className="field-pair">
          <div className="space-y-1.5">
            <label htmlFor="type-name" className="field-label block">
              Name
            </label>
            <input
              id="type-name"
              className="input-field"
              required
              autoFocus
              maxLength={100}
              placeholder="e.g. Provisional certificate"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="type-code" className="field-label block">
              Code
            </label>
            <input
              id="type-code"
              className="input-field uppercase"
              required
              maxLength={20}
              disabled={isEditing}
              placeholder="e.g. PROVISIONAL"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </div>
        </div>
        <p className="field-hint">{isEditing ? "The code is fixed after creation." : "The code is unique in your college and cannot be changed later."}</p>

        <div className="space-y-1.5">
          <label htmlFor="type-description" className="field-label block">
            Description <span className="text-ink/40">(optional)</span>
          </label>
          <textarea
            id="type-description"
            className="input-field type-textarea"
            rows={3}
            maxLength={500}
            placeholder="A short note about this credential type"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <ColorField value={color} autoColor={autoColor} onChange={setColor} />
        <StatusCards choices={STATUS_CHOICES} value={status} onChange={setStatus} />

        <FormPreview icon={Award} color={color || autoColor} title={name || "Credential type"}>
          {code && <span className="type-preview-code">{code.toUpperCase()}</span>}
          <StatusPill statuses={STATUSES} value={status} />
        </FormPreview>
      </div>
    </CatalogModal>
  );
}

// Settings › Credential Types: the college's master list of what it can issue. Same look as Academic Year.
export function CredentialTypes() {
  const { activeMembership, hasPermission } = useAuth();
  const institution = activeMembership?.institutionId;
  const canCreate = hasPermission("credentialType:create");
  const canUpdate = hasPermission("credentialType:update");
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState(null); // { item: null } = add, { item } = edit
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/institution/credential-types");
      setItems(data.credentialTypes);
      setError("");
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load credential types"));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, institution?._id]);

  const closeEditor = useCallback(() => setEditor(null), []);

  const setStatus = async (item, status) => {
    setBusyId(item._id);
    try {
      await api.patch(`/institution/credential-types/${item._id}`, { status });
      await load();
    } catch (updateError) {
      toast.error(getErrorMessage(updateError, "Failed to change the status"));
    } finally {
      setBusyId("");
    }
  };

  const active = items?.filter((item) => item.status === "ACTIVE").length ?? 0;
  const tags = [
    { label: "Total", value: items?.length ?? 0, tone: "total" },
    { label: "Active", value: active, tone: "active" },
    { label: "Inactive", value: (items?.length ?? 0) - active, tone: "red" },
  ];

  return (
    <div className="catalog-page settings-credential-types">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="type-tags">
          {tags.map((tag) => (
            <span key={tag.label} className={`type-tag tag-${tag.tone}`}>
              <i aria-hidden="true" />
              <b>{tag.value}</b> {tag.label}
            </span>
          ))}
        </div>
        {canCreate && (
          <Button onClick={() => setEditor({ item: null })}>
            <Plus className="h-4 w-4" /> Add Credential Type
          </Button>
        )}
      </div>

      <AdminError message={error} />

      {!items && !error ? (
        <AdminLoading />
      ) : (
        items && (
          <div className="table-card">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Credential type</th>
                    <th>Description</th>
                    <th>Status</th>
                    {canUpdate && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <ItemTitle icon={Award} title={item.name} code={item.code} color={item.color} />
                      </td>
                      <td className="type-desc">{item.description || "—"}</td>
                      <td>
                        <StatusPill statuses={STATUSES} value={item.status} />
                      </td>
                      {canUpdate && (
                        <td className="type-actions">
                          <div className="seg" role="group" aria-label={`Status of ${item.name}`}>
                            <button
                              type="button"
                              className={item.status === "ACTIVE" ? "on-active" : ""}
                              disabled={busyId === item._id}
                              onClick={() => item.status !== "ACTIVE" && setStatus(item, "ACTIVE")}
                            >
                              Active
                            </button>
                            <button
                              type="button"
                              className={item.status === "ACTIVE" ? "" : "on-inactive"}
                              disabled={busyId === item._id}
                              onClick={() => item.status === "ACTIVE" && setStatus(item, "INACTIVE")}
                            >
                              Inactive
                            </button>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setEditor({ item })}>
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={canUpdate ? 4 : 3} className="empty">
                        No credential types yet. Add one, then choose it when issuing credentials.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {editor && (
        <TypeForm
          item={editor.item}
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
