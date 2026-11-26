import { useEffect, useState } from "react";
import { AtSign, CheckCircle2, KeyRound, Loader2, Mail, Send, Server, TriangleAlert, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../../../lib/api";
import { formatDate } from "../../../lib/admin";
import { Button } from "../../../components/Button";
import { AdminError, AdminLoading, AdminPageHeader } from "../../../components/admin/AdminUI";
import { BillingSettings } from "./BillingSettings";
import { CompressionSettings } from "./CompressionSettings";
import "./AdminSettings.css";

// Common choices; "secure" means SSL/TLS from the start (465), otherwise STARTTLS.
const PORTS = [
  [587, "587 (STARTTLS, recommended)"],
  [465, "465 (SSL/TLS)"],
  [2525, "2525 (STARTTLS, alternative)"],
  [25, "25 (plain / STARTTLS)"],
];

// The test email has its own form (forms cannot nest), so the Save button in the card footer points here.
const SMTP_FORM_ID = "smtp-settings-form";

const toForm = (smtp) => ({
  enabled: Boolean(smtp.enabled),
  host: smtp.host || "",
  port: smtp.port || 587,
  secure: Boolean(smtp.secure),
  username: smtp.username || "",
  password: "",
  clearPassword: false,
  fromName: smtp.fromName || "DegreeNFT",
  fromEmail: smtp.fromEmail || "",
});

function GroupTitle({ icon: Icon, children }) {
  return (
    <legend className="group-title">
      <Icon className="h-3.5 w-3.5" />
      {children}
    </legend>
  );
}

export function AdminSettings() {
  const [smtp, setSmtp] = useState(null);
  const [form, setForm] = useState(null);
  const [encryptionReady, setEncryptionReady] = useState(true);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [isTesting, setIsTesting] = useState(false);

  const apply = (data) => {
    setSmtp(data.smtp);
    setForm(toForm(data.smtp));
    setEncryptionReady(data.encryptionReady);
  };

  const load = async () => {
    try {
      const { data } = await api.get("/admin/settings/smtp");
      apply(data);
      setError("");
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load settings"));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const set = (key) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const changePort = (event) => {
    const port = Number(event.target.value);
    // 465 always uses SSL/TLS; the others start plain and upgrade.
    setForm((current) => ({ ...current, port, secure: port === 465 }));
  };

  const save = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const { data } = await api.put("/admin/settings/smtp", { ...form, port: Number(form.port) });
      apply(data);
      toast.success("SMTP settings saved");
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, "Failed to save settings"));
    } finally {
      setIsSaving(false);
    }
  };

  const sendTest = async (event) => {
    event.preventDefault();
    setIsTesting(true);

    try {
      const { data } = await api.post("/admin/settings/smtp/test", { to: testTo });
      toast.success(data.message);
    } catch (testError) {
      toast.error(getErrorMessage(testError, "Test email failed"));
    } finally {
      setIsTesting(false);
      await load();
    }
  };

  if (error) return <AdminError message={error} />;
  if (!form) return <AdminLoading />;

  const dirty = JSON.stringify(toForm(smtp)) !== JSON.stringify(form);
  // Shown under the test button so the reason it is disabled is visible, not only in a tooltip.
  const testBlocker = !smtp.host
    ? "Save an SMTP server first."
    : dirty
      ? "Save your changes before sending a test."
      : "";

  return (
    <div className="admin-settings">
      <AdminPageHeader title="Settings" description="Platform-wide settings. Changes are saved in the activity log." />

      <section className="settings-card">
        <header className="card-head">
          <span className="card-icon">
            <Mail className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="card-title">Email (SMTP)</h2>
            <p className="card-sub">
              Activation and invitation emails. When SMTP is off, email falls back to the server configuration
              (Resend), or to the server log.
            </p>
          </div>
          <span className={`state-pill ${smtp.enabled ? "is-on" : ""}`}>
            <span className="state-dot" aria-hidden="true" />
            {smtp.enabled ? "In use" : "Off"}
          </span>
        </header>

        <div className="card-body">
          {!encryptionReady && (
            <div className="settings-warning" role="alert">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                The server has no <code>SETTINGS_ENCRYPTION_KEY</code>, so a password cannot be saved. Add it to the
                backend <code>.env</code> and restart the server.
              </p>
            </div>
          )}

          <form id={SMTP_FORM_ID} onSubmit={save} className="card-section">
            <label className="toggle-row">
              <span className="min-w-0">
                <span className="toggle-title">Send email through this SMTP server</span>
                <span className="toggle-sub">Test it first: if this server fails, emails are not delivered.</span>
              </span>
              <span className="switch">
                <input type="checkbox" role="switch" checked={form.enabled} onChange={set("enabled")} />
                <span className="switch-track" aria-hidden="true" />
              </span>
            </label>

            <fieldset className="field-group">
              <GroupTitle icon={Server}>Server</GroupTitle>
              <div className="field-grid">
                <div>
                  <label htmlFor="smtp-host" className="field-label">SMTP server</label>
                  <input id="smtp-host" className="input-field" placeholder="smtp.gmail.com" value={form.host} onChange={set("host")} />
                </div>
                <div>
                  <label htmlFor="smtp-port" className="field-label">Port</label>
                  <select id="smtp-port" className="select-field" value={form.port} onChange={changePort}>
                    {PORTS.map(([port, label]) => (
                      <option key={port} value={port}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <label className="inline-check">
                    <input type="checkbox" checked={form.secure} onChange={set("secure")} />
                    Use SSL/TLS from the start (usually only for 465)
                  </label>
                </div>
              </div>
            </fieldset>

            <fieldset className="field-group">
              <GroupTitle icon={KeyRound}>Sign-in</GroupTitle>
              <div className="field-grid">
                <div>
                  <label htmlFor="smtp-user" className="field-label">Username</label>
                  <input id="smtp-user" className="input-field" autoComplete="off" placeholder="Usually the full email address" value={form.username} onChange={set("username")} />
                </div>
                <div>
                  <label htmlFor="smtp-pass" className="field-label">Password</label>
                  <input
                    id="smtp-pass"
                    type="password"
                    className="input-field"
                    autoComplete="new-password"
                    placeholder={smtp.hasPassword && !form.clearPassword ? "•••••••• saved (type to replace)" : "App password"}
                    value={form.password}
                    disabled={!encryptionReady || form.clearPassword}
                    onChange={set("password")}
                  />
                  {smtp.hasPassword && (
                    <label className="inline-check">
                      <input type="checkbox" checked={form.clearPassword} onChange={set("clearPassword")} />
                      Remove the saved password
                    </label>
                  )}
                </div>
              </div>
            </fieldset>

            <fieldset className="field-group">
              <GroupTitle icon={AtSign}>Sender</GroupTitle>
              <div className="field-grid">
                <div>
                  <label htmlFor="smtp-from-name" className="field-label">From name</label>
                  <input id="smtp-from-name" className="input-field" value={form.fromName} onChange={set("fromName")} />
                </div>
                <div>
                  <label htmlFor="smtp-from-email" className="field-label">From email</label>
                  <input id="smtp-from-email" type="email" className="input-field" placeholder="no-reply@yourdomain.com" value={form.fromEmail} onChange={set("fromEmail")} />
                </div>
              </div>
            </fieldset>
          </form>

          <form onSubmit={sendTest}>
            <fieldset className="field-group">
              <GroupTitle icon={Send}>Test email</GroupTitle>

              {smtp.lastTestAt && (
                <div className={`test-result ${smtp.lastTestOk ? "is-ok" : "is-failed"}`}>
                  {smtp.lastTestOk ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                  <div className="min-w-0">
                    <p>
                      <span className="font-semibold">Last test {smtp.lastTestOk ? "worked" : "failed"}</span>
                      <span className="test-date"> · {formatDate(smtp.lastTestAt)}</span>
                    </p>
                    {smtp.lastTestError && <p className="test-error">{smtp.lastTestError}</p>}
                  </div>
                </div>
              )}

              <label htmlFor="smtp-test-to" className="field-label">Send the test to</label>
              <div className="test-row">
                <input
                  id="smtp-test-to"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="input-field"
                  value={testTo}
                  onChange={(event) => setTestTo(event.target.value)}
                />
                <Button type="submit" variant="secondary" className="shrink-0" disabled={isTesting || Boolean(testBlocker)}>
                  {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send test email
                </Button>
              </div>
              <p className={`test-hint ${testBlocker ? "is-blocked" : ""}`}>
                {testBlocker || "Uses the saved settings, even while SMTP is off."}
              </p>
            </fieldset>
          </form>
        </div>

        <footer className="card-foot">
          <span className={`save-state ${dirty ? "is-dirty" : ""}`}>
            {dirty ? "Unsaved changes" : "All changes saved"}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" disabled={!dirty || isSaving} onClick={() => setForm(toForm(smtp))}>
              Discard
            </Button>
            <Button type="submit" form={SMTP_FORM_ID} disabled={!dirty || isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save settings
            </Button>
          </div>
        </footer>
      </section>

      <BillingSettings />
      <CompressionSettings />
    </div>
  );
}
