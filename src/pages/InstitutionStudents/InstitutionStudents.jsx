import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, GraduationCap, KeyRound, PauseCircle, Plus, Send, UserRound, UsersRound } from "lucide-react";
import { ReasonModal } from "../../components/ReasonModal";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../../lib/api";
import { ENROLLMENT_STATUSES, enrollmentLabel } from "../../lib/admin";
import { STUDENT_SHEET } from "../../lib/excelSheet";
import { shortenAddress } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { AdminError, AdminLoading, AdminPageHeader, AdminPagination } from "../../components/admin/AdminUI";
import { FormPreview, StatusCards } from "../../components/FormFields/FormFields";
import {
  CatalogPanel,
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
import { EnrollForm } from "../InstitutionEnrollments/EnrollForm";
import "./InstitutionStudents.css";

const STATUSES = { ACTIVE: { label: "Active", tone: "success" }, INACTIVE: { label: "Inactive", tone: "danger" } };
const STATUS_CHOICES = [
  { value: "ACTIVE", label: "Active", hint: "Can be invited and enrolled", tone: "success" },
  { value: "INACTIVE", label: "Inactive", hint: "Hidden when enrolling students", tone: "danger" },
];
// Where a student is in proving their wallet: the college invites them, they sign with a wallet, the profile is linked.
const CLAIM_STATUSES = {
  NOT_INVITED: { label: "Not invited", tone: "neutral" },
  INVITED: { label: "Invited", tone: "info" },
  INVITE_EXPIRED: { label: "Link expired", tone: "warning" },
  LINKED: { label: "Linked", tone: "success" },
};
const WALLET_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/; // a Solana address
const PAGE_SIZE = 20;

// A student's courses as chips: "CSE 2022–26", coloured by enrollment status.
function CourseChips({ enrollments }) {
  if (!enrollments?.length) return <span className="text-ink/40">—</span>;
  return (
    <div className="course-chips">
      {enrollments.map((enrollment) => (
        <span
          key={enrollment._id}
          className={`course-chip tone-${ENROLLMENT_STATUSES[enrollment.status]?.tone}`}
          title={`${enrollment.programId?.name} · ${ENROLLMENT_STATUSES[enrollment.status]?.label}`}
        >
          {enrollmentLabel(enrollment)}
        </span>
      ))}
    </div>
  );
}

// Under the claim pill: the wallet the student proved, or the one the college expects.
function WalletLine({ student }) {
  if (student.wallet) {
    return (
      <p className="wallet-line" title={student.wallet}>
        {shortenAddress(student.wallet, 4)}
        {student.walletMismatch && <span className="wallet-flag">differs from hint</span>}
      </p>
    );
  }
  if (student.walletHint) return <p className="wallet-line" title={student.walletHint}>Expected {shortenAddress(student.walletHint, 4)}</p>;
  return null;
}

function StudentForm({ student, onClose, onSaved }) {
  const isEditing = Boolean(student);
  const [form, setForm] = useState({
    fullName: student?.fullName || "",
    registrationNo: student?.registrationNo || "",
    email: student?.email || "",
    phone: student?.phone || "",
    walletHint: student?.walletHint || "",
    studentStatus: student?.studentStatus || "ACTIVE",
  });
  const [isSaving, setIsSaving] = useState(false);
  const field = (key) => ({ value: form[key], onChange: (event) => setForm((current) => ({ ...current, [key]: event.target.value })) });

  const submit = async (event) => {
    event.preventDefault();
    if (form.walletHint.trim() && !WALLET_PATTERN.test(form.walletHint.trim())) {
      toast.error("That does not look like a Solana wallet address");
      return;
    }
    setIsSaving(true);
    try {
      // Empty optional fields are sent as "" so editing can clear them.
      if (isEditing) await api.patch(`/institution/students/${student._id}`, form);
      else await api.post("/institution/students", form);
      toast.success(isEditing ? "Student updated" : "Student added");
      onSaved();
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, "Failed to save the student"));
      setIsSaving(false);
    }
  };

  return (
    <CatalogPanel
      title={isEditing ? `Edit ${student.fullName}` : "Add student"}
      submitLabel={isEditing ? "Save changes" : "Add student"}
      isSaving={isSaving}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="student-form">
        <div className="field-pair">
          <Input label="Full name" required autoFocus maxLength={120} placeholder="e.g. Rahul Sharma" {...field("fullName")} />
          <Input label="Registration no." maxLength={40} placeholder="e.g. BCET/2022/0142" {...field("registrationNo")} />
        </div>
        <div className="field-pair">
          <Input label="Email" type="email" required maxLength={200} placeholder="rahul@example.com" {...field("email")} />
          <Input label="Phone" type="tel" maxLength={20} placeholder="+91 98765 43210" {...field("phone")} />
        </div>
        <p className="field-hint">The email is required: the wallet invite is sent there. The registration number is optional but must be unique in your college.</p>

        <Input
          label="Wallet address (optional)"
          maxLength={44}
          placeholder="The Solana wallet you expect"
          description="Only a hint. The student proves their own wallet from the invite, and credentials go to the wallet they sign with."
          {...field("walletHint")}
        />
        {isEditing && student.wallet && (
          <p className="field-hint">Linked wallet: {shortenAddress(student.wallet, 6)}{student.walletMismatch ? " (differs from the address above)" : ""}</p>
        )}

        <StatusCards choices={STATUS_CHOICES} value={form.studentStatus} onChange={(value) => setForm((current) => ({ ...current, studentStatus: value }))} />

        <FormPreview icon={UserRound} color="#4f46e5" title={form.fullName.trim() || "Student name"}>
          {form.registrationNo.trim() && <span className="student-preview-code">{form.registrationNo.trim().toUpperCase()}</span>}
          <StatusPill statuses={STATUSES} value={form.studentStatus} />
        </FormPreview>

        <p className="form-note">One profile per student. Each course they take is added as an enrollment, not a new student.</p>
      </div>
    </CatalogPanel>
  );
}

// College student profiles (P05-03), for the college picked in "Working in". Searched and paged on the server.
export function InstitutionStudents() {
  const { activeMembership, hasPermission } = useAuth();
  const institution = activeMembership?.institutionId;
  const canCreate = hasPermission("student:create");
  const canUpdate = hasPermission("student:update");
  const canReadEnrollments = hasPermission("enrollment:read");
  const canEnroll = hasPermission("enrollment:create");
  const canRecover = hasPermission("credential:recover");
  const [recovering, setRecovering] = useState(null); // student whose wallet was lost
  const [data, setData] = useState(null);
  const [courses, setCourses] = useState({}); // studentId -> enrollments
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState({ search: "", status: "", page: 1 });
  const [view, setView] = useState("table");
  const [editor, setEditor] = useState(null); // { student: null } = add, { student } = edit
  const [enrolling, setEnrolling] = useState(null); // student
  const [importing, setImporting] = useState(null); // { fileName, rows }
  const [busyId, setBusyId] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Search as you type, 300 ms after the last key.
  useEffect(() => {
    const timer = setTimeout(
      () => setQuery((current) => (current.search === search.trim() ? current : { ...current, search: search.trim(), page: 1 })),
      300
    );
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: response } = await api.get("/institution/students", { params: { ...query, limit: PAGE_SIZE } });
        // Then the courses of just these students, for the Courses column.
        const ids = response.students.map((student) => student._id);
        const enrollments =
          canReadEnrollments && ids.length
            ? (await api.get("/institution/enrollments", { params: { studentIds: ids.join(","), limit: 100 } })).data.enrollments
            : [];
        if (cancelled) return;
        const byStudent = {};
        for (const enrollment of enrollments) (byStudent[enrollment.studentId?._id] ||= []).push(enrollment);
        setData(response);
        setCourses(byStudent);
        setError("");
      } catch (loadError) {
        if (!cancelled) setError(getErrorMessage(loadError, "Failed to load students"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query, reloadKey, institution?._id, canReadEnrollments]);

  const reload = () => setReloadKey((value) => value + 1);
  const closeEditor = useCallback(() => setEditor(null), []);

  const students = data?.students || [];
  const stats = [
    { label: "Total students", value: data?.stats.total ?? 0, icon: UsersRound, tone: "cobalt" },
    { label: "Active", value: data?.stats.active ?? 0, icon: CheckCircle2, tone: "green" },
    { label: "Inactive", value: data?.stats.inactive ?? 0, icon: PauseCircle, tone: "red" },
  ];
  const hasFilters = Boolean(query.status || search);
  const emptyMessage = hasFilters ? "No students match these filters." : "No students yet.";
  const showActions = canUpdate || canEnroll || canRecover;
  const columns = 4 + (canReadEnrollments ? 1 : 0) + (showActions ? 1 : 0);

  const changeStatus = async (student, next) => {
    setBusyId(student._id);
    try {
      const { data: response } = await api.patch(`/institution/students/${student._id}`, { studentStatus: next });
      // Swap in the saved row and move one count between Active and Inactive, together with the toast.
      const shift = next === "ACTIVE" ? 1 : -1;
      setData((current) => ({
        ...current,
        // Merge: the saved row has no wallet or invite state, which the list computes.
        students: current.students.map((item) => (item._id === student._id ? { ...item, ...response.student } : item)),
        stats: { ...current.stats, active: current.stats.active + shift, inactive: current.stats.inactive - shift },
      }));
      toast.success(`${student.fullName} is now ${STATUSES[next].label.toLowerCase()}`);
    } catch (updateError) {
      toast.error(getErrorMessage(updateError, "Failed to change the status"));
    } finally {
      setBusyId("");
    }
  };

  // Emails the student a one-time link to connect and prove their wallet (sending again replaces the old link).
  const invite = async (student) => {
    setBusyId(student._id);
    try {
      const { data: response } = await api.post(`/institution/students/${student._id}/invite`);
      if (response.delivery === "sent") {
        toast.success(`Invite emailed to ${student.email}`);
      } else if (response.claimUrl) {
        // Email is not set up on this server (development): hand the link over directly.
        const copied = await navigator.clipboard?.writeText(response.claimUrl).then(() => true, () => false);
        if (copied) toast.success("Email is not set up on this server, so the invite link was copied to your clipboard");
        else toast(response.claimUrl, { duration: 20000 });
      } else {
        toast.error("The invite was created, but the email could not be sent");
      }
      reload();
    } catch (inviteError) {
      toast.error(getErrorMessage(inviteError, "Failed to send the invite"));
    } finally {
      setBusyId("");
    }
  };

  // Lost wallet: emails the student a link to prove a new wallet; two approvals then move their credentials.
  const startRecovery = async (reason) => {
    try {
      const { data: response } = await api.post(`/institution/students/${recovering._id}/recovery`, { reason });
      if (response.delivery === "sent") toast.success(`Recovery link emailed to ${recovering.email}. Approve it under Approvals once the student confirms.`);
      else if (response.recoveryUrl) {
        const copied = await navigator.clipboard?.writeText(response.recoveryUrl).then(() => true, () => false);
        if (copied) toast.success("Email is not set up on this server, so the recovery link was copied to your clipboard");
        else toast(response.recoveryUrl, { duration: 20000 });
      } else toast.error("The recovery was started, but the email could not be sent");
      setRecovering(null);
    } catch (recoverError) {
      toast.error(getErrorMessage(recoverError, "Failed to start the recovery"));
    }
  };

  const actions = (student) => (
    <div className="student-actions">
      {canUpdate && (
        <RowActions
          name={student.fullName}
          statuses={STATUSES}
          value={student.studentStatus}
          disabled={busyId === student._id}
          onEdit={() => setEditor({ student })}
          onChange={(next) => changeStatus(student, next)}
        />
      )}
      {canUpdate && student.claimStatus !== "LINKED" && (
        <Button
          size="sm"
          variant="ghost"
          disabled={busyId === student._id || student.studentStatus !== "ACTIVE" || !student.email}
          title={!student.email ? "Add the student's email first" : student.studentStatus !== "ACTIVE" ? "Make the student active first" : undefined}
          onClick={() => invite(student)}
          aria-label={`Invite ${student.fullName}`}
        >
          <Send className="h-4 w-4" /> {student.claimStatus === "INVITED" || student.claimStatus === "INVITE_EXPIRED" ? "Resend" : "Invite"}
        </Button>
      )}
      {canRecover && student.claimStatus === "LINKED" && (
        <Button size="sm" variant="ghost" onClick={() => setRecovering(student)} aria-label={`Recover the wallet of ${student.fullName}`}>
          <KeyRound className="h-4 w-4" /> Recover wallet
        </Button>
      )}
      {canEnroll && (
        <Button size="sm" variant="ghost" onClick={() => setEnrolling(student)} aria-label={`Enroll ${student.fullName}`}>
          <GraduationCap className="h-4 w-4" /> Enroll
        </Button>
      )}
    </div>
  );

  return (
    <div className="catalog-page institution-students">
      <AdminPageHeader
        title="Students"
        description={`Student profiles at ${institution?.name || "your institution"}`}
        actions={
          canCreate &&
          data && (
            <>
              <SheetActions spec={STUDENT_SHEET} onRows={setImporting} />
              <Button onClick={() => setEditor({ student: null })}>
                <Plus className="h-4 w-4" /> Add Student
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
              placeholder="Search by name, reg. no., email, phone"
              hasFilters={hasFilters}
              onClear={() => {
                setSearch("");
                setQuery({ search: "", status: "", page: 1 });
              }}
              shown={data.pagination.total}
              total={data.stats.total}
              view={view}
              onView={setView}
            >
              <Select
                className="filter"
                aria-label="Filter by status"
                value={query.status}
                onChange={(event) => setQuery((current) => ({ ...current, status: event.target.value, page: 1 }))}
              >
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
                        <th>Contact</th>
                        {canReadEnrollments && <th>Courses</th>}
                        <th>Wallet</th>
                        <th>Status</th>
                        {showActions && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr key={student._id}>
                          <td>
                            <ItemTitle icon={UserRound} title={student.fullName} code={student.registrationNo || "No reg. no."} />
                          </td>
                          <td className="contact">
                            <p>{student.email || "—"}</p>
                            <p className="tabular-nums">{student.phone || ""}</p>
                          </td>
                          {canReadEnrollments && (
                            <td>
                              <CourseChips enrollments={courses[student._id]} />
                            </td>
                          )}
                          <td>
                            <StatusPill statuses={CLAIM_STATUSES} value={student.claimStatus || "NOT_INVITED"} />
                            <WalletLine student={student} />
                          </td>
                          <td>
                            <StatusPill statuses={STATUSES} value={student.studentStatus} />
                          </td>
                          {showActions && <td>{actions(student)}</td>}
                        </tr>
                      ))}
                      {students.length === 0 && (
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
            ) : students.length === 0 ? (
              <div className="panel empty">{emptyMessage}</div>
            ) : (
              <>
                <div className="item-grid">
                  {students.map((student) => (
                    <article key={student._id} className="item-card">
                      <div className="card-top">
                        <ItemIcon icon={UserRound} />
                        <StatusPill statuses={STATUSES} value={student.studentStatus} />
                      </div>
                      <div>
                        <h3 className="item-name">{student.fullName}</h3>
                        <p className="item-code">{student.registrationNo || "No reg. no."}</p>
                      </div>
                      <dl className="card-meta">
                        <div>
                          <dt>Email</dt>
                          <dd className="truncate" title={student.email}>
                            {student.email || "—"}
                          </dd>
                        </div>
                        <div>
                          <dt>Phone</dt>
                          <dd className="tabular-nums">{student.phone || "—"}</dd>
                        </div>
                        <div>
                          <dt>Wallet</dt>
                          <dd>
                            <StatusPill statuses={CLAIM_STATUSES} value={student.claimStatus || "NOT_INVITED"} />
                            <WalletLine student={student} />
                          </dd>
                        </div>
                      </dl>
                      {canReadEnrollments && <CourseChips enrollments={courses[student._id]} />}
                      {showActions && <div className="card-actions">{actions(student)}</div>}
                    </article>
                  ))}
                </div>
                <div className="table-card">
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
          endpoint="/institution/students/import"
          bodyKey="students"
          noun={["student", "students"]}
          preview={[
            ["Full name", "fullName"],
            ["Registration no.", "registrationNo"],
            ["Email", "email"],
          ]}
          onClose={() => setImporting(null)}
          onDone={reload}
        />
      )}

      {enrolling && (
        <EnrollForm
          student={enrolling}
          onClose={() => setEnrolling(null)}
          onSaved={() => {
            setEnrolling(null);
            reload();
          }}
        />
      )}

      {editor && (
        <StudentForm
          student={editor.student}
          onClose={closeEditor}
          onSaved={() => {
            closeEditor();
            reload();
          }}
        />
      )}
      {recovering && (
        <ReasonModal
          title={`Recover the wallet of ${recovering.fullName}`}
          intro={
            <>
              <p>
                Use this when the student can no longer use their wallet. They get an email at <b>{recovering.email || "(no email)"}</b> to connect and prove a
                new wallet. Then two different officials approve under <b>Approvals</b>, and all their credentials from your college move to the new wallet.
              </p>
              <p className="mt-2">Check the student&apos;s identity your usual way first. The old wallet link is kept in the history.</p>
            </>
          }
          submitLabel="Send recovery link"
          placeholder="e.g. Phone stolen, verified in person with ID"
          onClose={() => setRecovering(null)}
          onSubmit={startRecovery}
        />
      )}
    </div>
  );
}
