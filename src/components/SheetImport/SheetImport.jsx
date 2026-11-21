import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../../lib/api";
import { downloadTemplate, readSheet } from "../../lib/excelSheet";
import { Button } from "../Button";
import { CatalogModal } from "../CatalogPage/CatalogPage";
import "./SheetImport.css";

const CHUNK = 200; // rows per request; the server accepts up to 500

// "Template | Import" joined buttons. Reads the picked file with `spec` and hands the rows to onRows.
export function SheetActions({ spec, onRows }) {
  const [busy, setBusy] = useState("");
  const fileInput = useRef(null);

  const template = async () => {
    setBusy("template");
    try {
      await downloadTemplate(spec);
    } catch {
      toast.error("Could not create the template");
    } finally {
      setBusy("");
    }
  };

  const pick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // the same file can be picked again after fixing it
    if (!file) return;
    setBusy("import");
    try {
      onRows({ fileName: file.name, rows: await readSheet(file, spec) });
    } catch (readError) {
      toast.error(readError.message);
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <div className="sheet-actions">
        <Button variant="secondary" onClick={template} isLoading={busy === "template"}>
          {busy !== "template" && <Download className="h-4 w-4" />} Template
        </Button>
        <Button variant="secondary" onClick={() => fileInput.current?.click()} isLoading={busy === "import"}>
          {busy !== "import" && <Upload className="h-4 w-4" />} Import
        </Button>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        aria-label="Excel file to import"
        onChange={pick}
      />
    </>
  );
}

/**
 * Preview → import in chunks (with progress) → results per sheet row.
 * `noun` is [singular, plural]; `preview` is [[header, key], …] for the first five rows.
 */
export function ImportRows({ fileName, rows, endpoint, bodyKey, noun, preview, onClose, onDone }) {
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const label = (count) => `${count} ${count === 1 ? noun[0] : noun[1]}`;

  const submit = async (event) => {
    event.preventDefault();
    if (result) {
      onClose();
      return;
    }
    const totals = { created: 0, failed: [] };
    setProgress(0);
    try {
      for (let start = 0; start < rows.length; start += CHUNK) {
        const { data } = await api.post(endpoint, { [bodyKey]: rows.slice(start, start + CHUNK) });
        totals.created += data.created;
        totals.failed.push(...data.failed);
        setProgress(Math.min(start + CHUNK, rows.length));
      }
    } catch (importError) {
      // Earlier chunks are already saved; say so instead of pretending nothing happened.
      totals.failed.push({ row: "—", message: getErrorMessage(importError, "The import stopped") });
    }
    setResult(totals);
    setProgress(null);
    if (totals.created) {
      onDone();
      toast.success(`${label(totals.created)} imported`);
    }
  };

  return (
    <CatalogModal
      title={result ? "Import finished" : `Import ${fileName}`}
      submitLabel={result ? "Done" : `Import ${label(rows.length)}`}
      isSaving={progress !== null}
      onClose={onClose}
      onSubmit={submit}
    >
      {result ? (
        <>
          <p className="import-summary">
            <strong>{result.created}</strong> added
            {result.failed.length > 0 && (
              <>
                {" "}· <strong className="text-red-700">{result.failed.length}</strong> not added (fix them in the file and import those rows again)
              </>
            )}
          </p>
          {result.failed.length > 0 && (
            <div className="import-table">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Problem</th>
                  </tr>
                </thead>
                <tbody>
                  {result.failed.map((item, index) => (
                    <tr key={`${item.row}-${index}`}>
                      <td className="tabular-nums">{item.row}</td>
                      <td>{item.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="import-summary">
            Found <strong>{label(rows.length)}</strong> in the file.
            {progress !== null && ` Importing… ${progress} of ${rows.length}`}
          </p>
          <div className="import-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Row</th>
                  {preview.map(([header]) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((row) => (
                  <tr key={row.row}>
                    <td className="tabular-nums">{row.row}</td>
                    {preview.map(([header, key]) => (
                      <td key={header}>{row[key] || "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 5 && <p className="import-note">Showing the first 5 rows. Every row is checked when you import.</p>}
        </>
      )}
    </CatalogModal>
  );
}
