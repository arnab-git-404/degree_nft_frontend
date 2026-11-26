import { useEffect, useMemo, useState } from "react";
import { GraduationCap, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../../lib/api";
import { Input } from "../../components/Input";
import { CatalogPanel, Select, StatusPill } from "../../components/CatalogPage/CatalogPage";
import { FormPreview, StatusCards } from "../../components/FormFields/FormFields";
import { batchView, ENROLLMENT_STATUSES, enrollmentLabel } from "../../lib/admin";
import "./EnrollForm.css";

const STATUS_CHOICES = [
  { value: "ENROLLED", label: "Enrolled", hint: "Currently studying", tone: "info" },
  { value: "COMPLETED", label: "Completed", hint: "Finished the course", tone: "success" },
  { value: "CANCELLED", label: "Cancelled", hint: "Withdrawn or entered by mistake", tone: "neutral" },
];

/**
 * Enroll a student in a course and batch, or (with `enrollment`) change an enrollment's codes and status.
 * Opened from a student's row, `student` is fixed; from the Enrollments page the student is searched.
 */
export function EnrollForm({ enrollment, student: presetStudent, onClose, onSaved }) {
  const isEditing = Boolean(enrollment);
  const [student, setStudent] = useState(presetStudent || null);
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState([]);
  const [batches, setBatches] = useState(null);
  const [programId, setProgramId] = useState("");
  const [programSessionId, setProgramSessionId] = useState("");
  const [form, setForm] = useState({
    enrollmentCode: enrollment?.enrollmentCode || "",
    officialEnrollmentNo: enrollment?.officialEnrollmentNo || "",
    status: enrollment?.status || "ENROLLED",
  });
  const [isSaving, setIsSaving] = useState(false);
  const field = (key) => ({ value: form[key], onChange: (event) => setForm((current) => ({ ...current, [key]: event.target.value })) });

  useEffect(() => {
    if (isEditing) return;
    api
      .get("/institution/program-sessions")
      .then(({ data }) => setBatches(data.sessions))
      .catch(() => setBatches([]));
  }, [isEditing]);

  // Find the student as you type (name or registration no.).
  useEffect(() => {
    if (student || isEditing) return undefined;
    const term = search.trim();
    if (!term) {
      setMatches([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      api
        .get("/institution/students", { params: { search: term, limit: 8 } })
        .then(({ data }) => setMatches(data.students))
        .catch(() => setMatches([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [search, student, isEditing]);

  // Active courses that have at least one active batch.
  const programs = useMemo(() => {
    const byId = new Map();
    for (const batch of batches || []) if (batch.programId?.status === "ACTIVE" && batch.status === "ACTIVE") byId.set(batch.programId._id, batch.programId);
    return [...byId.values()].sort((a, b) => a.code.localeCompare(b.code));
  }, [batches]);
  const program = programs.find((item) => item._id === programId);
  // Only active batches can take new students.
  const courseBatches = (batches || [])
    .filter((batch) => batch.programId?._id === programId && batch.status === "ACTIVE")
    .sort((a, b) => b.startYear - a.startYear);
  const batch = courseBatches.find((item) => item._id === programSessionId);
  const view = batch ? batchView(batch, program) : null;

  const submit = async (event) => {
    event.preventDefault();
    if (!isEditing && !student) {
      toast.error("Choose a student first");
      return;
    }
    if (!isEditing && !batch) {
      toast.error("Choose a course and a batch");
      return;
    }
    setIsSaving(true);
    const details = { enrollmentCode: form.enrollmentCode, officialEnrollmentNo: form.officialEnrollmentNo, status: form.status };
    try {
      if (isEditing) await api.patch(`/institution/enrollments/${enrollment._id}`, details);
      else await api.post("/institution/enrollments", { ...details, studentId: student._id, programSessionId });
      toast.success(isEditing ? "Enrollment updated" : `${student.fullName} enrolled`);
      onSaved();
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, "Failed to save the enrollment"));
      setIsSaving(false);
    }
  };

  const who = isEditing ? enrollment.studentId : student;
  const editedBatch = isEditing ? batchView(enrollment.programSessionId || {}, enrollment.programId) : null;
  const previewColor = isEditing ? editedBatch.color : view?.color;

  return (
    <CatalogPanel
      title={isEditing ? `Enrollment · ${enrollmentLabel(enrollment)}` : "Enroll student"}
      submitLabel={isEditing ? "Save changes" : "Enroll"}
      isSaving={isSaving}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="enroll-form">
        {isEditing ? (
          <div className="space-y-1.5">
            <span className="field-label block">Course and batch</span>
            <p className="pick-empty">
              {enrollment.programId?.code} · {enrollment.programId?.name} · {editedBatch.name}. To change the batch, cancel this enrollment and
              enroll again.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <label htmlFor="enroll-course" className="field-label block">
                Course
              </label>
              <Select
                id="enroll-course"
                required
                className="w-full"
                value={programId}
                onChange={(event) => {
                  setProgramId(event.target.value);
                  setProgramSessionId("");
                }}
              >
                <option value="">{batches ? "Select a course" : "Loading courses…"}</option>
                {programs.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.code} — {item.name}
                  </option>
                ))}
              </Select>
              {batches && programs.length === 0 && <p className="field-hint">No active batches. Create or activate one on the Batches page first.</p>}
            </div>

            <div className="space-y-1.5">
              <span className="field-label block">Batch</span>
              {!programId ? (
                <p className="pick-empty">Select a course first.</p>
              ) : (
                <div className="pick-list" role="radiogroup" aria-label="Batch">
                  {courseBatches.map((item) => {
                    const itemView = batchView(item, program);
                    return (
                      <button
                        key={item._id}
                        type="button"
                        role="radio"
                        aria-checked={programSessionId === item._id}
                        className={`pick-row ${programSessionId === item._id ? "is-on" : ""}`}
                        onClick={() => setProgramSessionId(item._id)}
                      >
                        <i style={{ background: itemView.color }} aria-hidden="true" />
                        <span className="pick-row__main">
                          <b>{itemView.name}</b>
                          <span className="pick-row__sub">
                            {itemView.code} · {item.startYear} – {item.endYear}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <span className="field-label block">Student</span>
          {who ? (
            <div className="picked-student">
              <span>
                <strong>{who.fullName}</strong>
                <span className="picked-sub">{who.registrationNo || "No reg. no."}</span>
              </span>
              {!isEditing && !presetStudent && (
                <button type="button" className="icon-btn" aria-label="Choose another student" onClick={() => setStudent(null)}>
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="student-picker">
              <label className="search">
                <Search className="search-icon" aria-hidden="true" />
                <input
                  className="input-field"
                  aria-label="Find student"
                  placeholder="Type a name or registration no."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              {matches.length > 0 && (
                <ul className="matches">
                  {matches.map((match) => (
                    <li key={match._id}>
                      <button type="button" onClick={() => setStudent(match)}>
                        <strong>{match.fullName}</strong>
                        <span className="picked-sub">{match.registrationNo || "No reg. no."}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {search.trim() && matches.length === 0 && <p className="picked-sub">No student found. Add them on the Students page first.</p>}
            </div>
          )}
        </div>

        <div className="field-pair">
          <Input label="Enrollment code" maxLength={40} placeholder="Optional" {...field("enrollmentCode")} />
          <Input label="Official enrollment no." maxLength={60} placeholder="Optional, from the university" {...field("officialEnrollmentNo")} />
        </div>

        <StatusCards choices={STATUS_CHOICES} value={form.status} onChange={(status) => setForm((current) => ({ ...current, status }))} />

        {who && previewColor && (
          <FormPreview icon={GraduationCap} color={previewColor} title={who.fullName}>
            <span className="enroll-preview-batch">{isEditing ? editedBatch.code : view.code}</span>
            <StatusPill statuses={ENROLLMENT_STATUSES} value={form.status} />
          </FormPreview>
        )}
      </div>
    </CatalogPanel>
  );
}
