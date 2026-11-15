import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Mail, Send, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../../../lib/api";
import { formatDate } from "../../../lib/admin";
import { Button } from "../../../components/Button";
import { AdminError, AdminLoading, AdminPageHeader } from "../../../components/admin/AdminUI";
import "./AdminSettings.css";

// Common choices; "secure" means SSL/TLS from the start (465), otherwise STARTTLS.
const PORTS = [
  [587, "587 (STARTTLS, recommended)"],
  [465, "465 (SSL/TLS)"],
  [2525, "2525 (STARTTLS, alternative)"],
  [25, "25 (plain / STARTTLS)"],
];

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

  return (
    <div className="admin-settings">
      <AdminPageHeader title="Settings" description="Platform-wide settings. Changes are saved in the activity log." />

      <section className="settings-card">
        <header className="settings-head">
          <span className="settings-icon">
            <Mail className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="settings-title">Email (SMTP)</h2>
            <p className="settings-sub">
              Activation and invitation emails. When SMTP is off, email falls back to the server configuration
              (Resend), or to the server log.
            </p>
          </div>
          <span className={`state-pill ${smtp.enabled ? "is-on" : ""}`}>{smtp.enabled ? "In use" : "Off"}</span>
        </header>

        {!encryptionReady && (
          <p className="settings-warning">
            The server has no SETTINGS_ENCRYPTION_KEY, so a password cannot be saved. Add it to the backend .env and
            restart the server.
          </p>
        )}

        <form onSubmit={save}>
          <div className="settings-body">
            <label className="toggle">
              <input type="checkbox" checked={form.enabled} onChange={set("enabled")} className="check" />
              <span>
                <span className="font-medium">Send email through this SMTP server</span>
                <span className="hint">Test it first: if this server fails, emails are not delivered.</span>
              </span>
            </label>

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

              <div>
                <label htmlFor="smtp-from-name" className="field-label">From name</label>
                <input id="smtp-from-name" className="input-field" value={form.fromName} onChange={set("fromName")} />
              </div>
              <div>
                <label htmlFor="smtp-from-email" className="field-label">From email</label>
                <input id="smtp-from-email" type="email" className="input-field" placeholder="no-reply@yourdomain.com" value={form.fromEmail} onChange={set("fromEmail")} />
              </div>
            </div>
          </div>

          <footer className="settings-foot">
            <Button type="button" size="sm" variant="ghost" disabled={!dirty || isSaving} onClick={() => setForm(toForm(smtp))}>
              Discard changes
            </Button>
            <Button type="submit" size="sm" disabled={!dirty || isSaving}>
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save SMTP settings
            </Button>
          </footer>
        </form>

        <form className="test-row" onSubmit={sendTest}>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Send a test email</p>
            <p className="hint">
              Uses the saved settings, even while SMTP is off.
              {smtp.lastTestAt && (
                <span className={`test-result ${smtp.lastTestOk ? "is-ok" : "is-failed"}`}>
                  {smtp.lastTestOk ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  Last test {smtp.lastTestOk ? "worked" : "failed"} · {formatDate(smtp.lastTestAt)}
                  {smtp.lastTestError ? `: ${smtp.lastTestError}` : ""}
                </span>
              )}
            </p>
          </div>
          <input
            type="email"
            required
            aria-label="Send the test to"
            placeholder="you@example.com"
            className="input-field test-input"
            value={testTo}
            onChange={(event) => setTestTo(event.target.value)}
          />
          <Button type="submit" size="sm" variant="secondary" disabled={isTesting || dirty || !smtp.host} title={dirty ? "Save your changes first" : undefined}>
            {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Send test
          </Button>
        </form>
      </section>
    </div>
  );
}
