import { useEffect, useState } from "react";
import { Gauge, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../../../lib/api";
import { Button } from "../../../components/Button";
import { AdminError } from "../../../components/admin/AdminUI";

const LEVEL_NOTES = { 1: "Fastest, largest responses", 6: "Balanced (default)", 9: "Smallest responses, most server CPU" };

// Admin › Settings › Response compression: the gzip level (1–9) the API uses.
export function CompressionSettings() {
  const [savedLevel, setSavedLevel] = useState(null);
  const [level, setLevel] = useState(6);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    api
      .get("/admin/settings/compression")
      .then(({ data }) => {
        setSavedLevel(data.gzipLevel);
        setLevel(data.gzipLevel);
      })
      .catch((loadError) => setError(getErrorMessage(loadError, "Failed to load the compression level")));
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const { data } = await api.put("/admin/settings/compression", { gzipLevel: level });
      setSavedLevel(data.gzipLevel);
      toast.success("Compression level saved");
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, "Failed to save the compression level"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="settings-card">
      <header className="card-head">
        <span className="card-icon">
          <Gauge className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="card-title">Response compression</h2>
          <p className="card-sub">
            How hard the server gzips API responses. Higher levels send less data but use more server CPU. Responses under 1 KB are never
            compressed.
          </p>
        </div>
        {savedLevel && (
          <span className="state-pill is-on">
            <span className="state-dot" aria-hidden="true" />
            Level {savedLevel}
          </span>
        )}
      </header>

      <div className="card-body">
        <AdminError message={error} />
        {savedLevel && (
          <form id="compression-settings-form" onSubmit={save} className="card-section">
            <div className="field-grid">
              <div className="space-y-1.5">
                <label htmlFor="gzip-level" className="field-label">gzip level</label>
                <select id="gzip-level" className="select-field" value={level} onChange={(event) => setLevel(Number(event.target.value))}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
                    <option key={value} value={value}>
                      {value}
                      {LEVEL_NOTES[value] ? ` · ${LEVEL_NOTES[value]}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </form>
        )}
      </div>

      {savedLevel && (
        <footer className="card-foot">
          <span className="save-state">Applies at once here; other servers pick it up within a minute.</span>
          <Button type="submit" form="compression-settings-form" disabled={isSaving || level === savedLevel}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save level
          </Button>
        </footer>
      )}
    </section>
  );
}
