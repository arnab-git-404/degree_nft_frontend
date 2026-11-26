import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Gem,
  HelpCircle,
  Info,
  Loader2,
  ShieldCheck,
  Upload,
  Wallet,
} from "lucide-react";
import { Button } from "../../components/Button";
import { AdminError, AdminPageHeader, StatusBadge } from "../../components/admin/AdminUI";
import { StatCards } from "../../components/CatalogPage/CatalogPage";
import { useAuth } from "../../context/AuthContext";
import api, { getErrorMessage } from "../../lib/api";
import { shortenAddress } from "../../lib/utils";
import { credentialSheet, downloadTemplate, readSheet } from "../../lib/excelSheet";
import "./BatchUploadPortal.css";

const MAX_RECORDS = 200;

const BATCH_STEPS = [
  { key: "upload", label: "Upload", sub: "Choose an Excel file" },
  { key: "review", label: "Review", sub: "Check the records" },
  { key: "processing", label: "Process", sub: "Pin and issue" },
  { key: "complete", label: "Done", sub: "See the results" },
];

// One row per credential. The student and enrollment come from the college's own records (registration no. +
// program + batch); the credential always goes to the wallet the student proved, so there is no wallet column.
const REQUIRED_COLUMNS = ["Registration no.", "Program code", "Batch start year", "Credential type", "Degree / credential title", "CGPA"];
const OPTIONAL_COLUMNS = ["Batch end year", "Honors", "Issue date"];
const REQUIRED_KEYS = ["registrationNo", "programCode", "startYear", "credentialType", "degreeTitle", "cgpa"];

const HELP_ITEMS = [
  [Clock, "Processing takes a few seconds per credential."],
  [Wallet, "Each student must have linked their wallet first (Students page › Invite). Credentials go only to that wallet."],
  [ShieldCheck, "Rows are matched to enrollments by registration no., program code and batch start year (add the end year when two batches start the same year)."],
  [AlertCircle, "Fix rows with issues in the Excel file and upload it again; nothing is issued until every row is ready."],
];

// Checks that need no server: required columns, numbers, known credential types, repeated rows.
const validateParsedData = (data, typeCodes) => {
  const problems = new Map(); // index -> [messages]
  const add = (index, message) => problems.set(index, [...(problems.get(index) || []), message]);
  const seen = new Map();
  data.forEach((record, index) => {
    REQUIRED_KEYS.forEach((field, position) => !String(record[field] ?? "").trim() && add(index, `Missing ${REQUIRED_COLUMNS[position]}`));
    const cgpa = Number(record.cgpa);
    if (record.cgpa && (Number.isNaN(cgpa) || cgpa < 0 || cgpa > 10)) add(index, "CGPA should be between 0 and 10");
    if (record.startYear && !/^\d{4}$/.test(String(record.startYear).trim())) add(index, "Batch start year should be a year like 2022");
    if (record.endYear && !/^\d{4}$/.test(String(record.endYear).trim())) add(index, "Batch end year should be a year like 2026");
    // Excel may turn a typed date into a local format (11/25/2026): ask for the unambiguous form.
    if (record.issueDate && !/^\d{4}-\d{2}-\d{2}$/.test(String(record.issueDate).trim())) add(index, "Issue date should be written as YYYY-MM-DD (e.g. 2026-06-30)");
    const type = String(record.credentialType ?? "").trim().toUpperCase();
    if (type && !typeCodes.includes(type)) add(index, `"${type}" is not an active credential type (see Settings › Credential types)`);
    const key = [record.registrationNo, record.programCode, record.startYear, record.endYear, type].map((value) => String(value ?? "").trim().toUpperCase()).join("|");
    if (seen.has(key)) add(index, `Same student, batch and type as row ${data[seen.get(key)].row}`);
    else seen.set(key, index);
  });
  return problems;
};

export function BatchUploadPortal() {
  const { connected, publicKey } = useWallet();
  const { isAuthenticated, hasPermission, roleName, activeMembership } = useAuth();
  const navigate = useNavigate();
  const canUploadBatches = hasPermission("batch:upload");
  const institution = activeMembership?.institutionId;

  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResults, setProcessingResults] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [uploadStep, setUploadStep] = useState("upload");
  const [validationErrors, setValidationErrors] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState("");
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [typeCodes, setTypeCodes] = useState([]);

  // The college's active credential types, to check the credentialType column before anything is sent.
  useEffect(() => {
    api
      .get("/institution/credential-types")
      .then(({ data }) => setTypeCodes(data.credentialTypes.filter((type) => type.status === "ACTIVE").map((type) => type.code)))
      .catch(() => setTypeCodes([]));
  }, [institution?._id]);

  const loadStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const { data } = await api.get("/institution/credential-stats");
      setStats(data.stats);
      setStatsError("");
    } catch (error) {
      setStatsError(getErrorMessage(error, "Failed to load credential stats"));
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    if (connected) loadStats();
  }, [connected, loadStats, institution?._id]);

  const handleFile = async (uploadedFile) => {
    if (!uploadedFile) return;

    if (uploadedFile.name.split(".").pop().toLowerCase() !== "xlsx") {
      toast.error("Please upload an Excel (.xlsx) file. Download the template to start.");
      return;
    }

    const toastId = toast.loading("Reading the Excel file...");

    try {
      // Each row keeps its Excel row number, so problems point at the right line in the sheet.
      const data = await readSheet(uploadedFile, credentialSheet(typeCodes));

      if (data.length === 0) {
        toast.error("The file has no records", { id: toastId });
        return;
      }

      if (data.length > MAX_RECORDS) {
        toast.error(`Maximum ${MAX_RECORDS} records allowed. Please split your file.`, { id: toastId });
        return;
      }

      toast.loading("Checking the rows against your college's records...", { id: toastId });
      const problems = validateParsedData(data, typeCodes);
      const { data: matched } = await api.post("/institution/credentials/resolve", {
        rows: data,
      });
      const rows = data.map((record, index) => ({ ...record, ...matched.results[index] }));
      rows.forEach((row, index) => row.error && problems.set(index, [...(problems.get(index) || []), row.error]));
      const errors = [...problems.entries()].map(([index, messages]) => ({
        index,
        rowNo: rows[index].row,
        studentName: rows[index].studentName || rows[index].registrationNo || `Record #${index + 1}`,
        errors: messages,
      }));
      setFile(uploadedFile);
      setValidationErrors(errors);
      setParsedData(rows);
      setUploadStep("review");

      if (errors.length > 0) {
        toast.error(`Found ${errors.length} records with issues. Please review them.`, { id: toastId });
      } else {
        toast.success(`Parsed ${data.length} records`, { id: toastId });
      }
    } catch (error) {
      // A bad file explains itself (missing column, not an Excel file); a server error comes from the API.
      toast.error(error.response ? getErrorMessage(error, "Could not check the rows") : error.message, { id: toastId });
    }
  };

  const handleInputChange = (event) => {
    handleFile(event.target.files[0]);
    // Lets the same file be picked again after "Start new batch".
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files[0]);
  };

  // Public metadata: the matched record supplies the student, program and batch years.
  const createMetadata = (row) => {
    const type = String(row.credentialType).trim().toUpperCase();
    return {
      name: `${institution?.name || "College"} - ${row.degreeTitle}`,
      symbol: "DegreeNFT",
      description: `${row.degreeTitle} issued by ${institution?.name || "the college"} to ${row.studentName}`,
      image: "https://cdn.tourradar.com/s3/tour/720x480/251218_65585c177b316.jpg", // Replace with your certificate image URL
      external_url: "https://degree-nft.vercel.app/",
      attributes: [
        { trait_type: "Student Name", value: row.studentName },
        { trait_type: "Institution", value: institution?.name || "" },
        { trait_type: "Credential Type", value: type },
        { trait_type: "Degree", value: row.degreeTitle },
        { trait_type: "Major", value: row.programName },
        { trait_type: "CGPA", value: String(row.cgpa).trim() },
        { trait_type: "Graduation Year", value: String(row.endYear) },
        { trait_type: "Program Duration", value: `${row.endYear - row.startYear} years` },
        { trait_type: "Issue Date", value: String(row.issueDate || "").trim() || new Date().toISOString().split("T")[0] },
        { trait_type: "Honors", value: String(row.honors || "").trim() || "None" },
      ],
      properties: {
        files: [{ type: "image/png", uri: "https://cdn.tourradar.com/s3/tour/720x480/251218_65585c177b316.jpg" }],
        category: "image",
      },
    };
  };

  // The server sends it to the enrollment's student, at the wallet they proved; no wallet is sent from here.
  const issueCredential = async (row) => {
    const { data: pinned } = await api.post("/ipfs/pin-json", createMetadata(row));
    await api.post("/institution/credentials", {
      enrollmentId: row.enrollmentId,
      credentialType: String(row.credentialType).trim().toUpperCase(),
      name: String(row.degreeTitle).trim(),
      symbol: "DegreeNFT",
      uri: `https://ipfs.io/ipfs/${pinned.IpfsHash}`,
      ipfsHash: pinned.IpfsHash,
    });
    return pinned.IpfsHash;
  };

  const handleBatchMint = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in with your wallet first");
      return;
    }

    if (!canUploadBatches) {
      toast.error(
        `This wallet is registered as '${roleName || "unknown"}'. Batch upload permission is required.`
      );
      return;
    }

    setIsProcessing(true);
    setUploadStep("processing");
    setCurrentIndex(0);
    setProcessingResults([]);
    // Counted locally: processingResults state is stale inside this loop.
    let succeeded = 0;

    for (let i = 0; i < parsedData.length; i++) {
      setCurrentIndex(i);
      const student = parsedData[i];

      try {
        const ipfsHash = await issueCredential(student);
        succeeded += 1;

        setProcessingResults((prev) => [
          ...prev,
          {
            success: true,
            studentName: student.studentName,
            degreeType: student.degreeTitle,
            timestamp: new Date().toISOString(),
            ipfsHash,
          },
        ]);

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (error) {

        setProcessingResults((prev) => [
          ...prev,
          {
            success: false,
            studentName: student.studentName,
            degreeType: student.degreeTitle,
            timestamp: new Date().toISOString(),
            error: getErrorMessage(error, "Unknown error"),
          },
        ]);
      }
    }

    setIsProcessing(false);
    setUploadStep("complete");
    loadStats();

    if (succeeded === parsedData.length) {
      toast.success(`Processed all ${succeeded} certificates`);
    } else {
      toast.error(`Processed ${succeeded} of ${parsedData.length} certificates. Check the results.`);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedData([]);
    setProcessingResults([]);
    setCurrentIndex(0);
    setUploadStep("upload");
    setValidationErrors([]);
  };

  if (!connected) {
    return (
      <div className="batch-page">
        <div className="guard-card">
          <span className="guard-icon">
            <FileSpreadsheet className="h-5 w-5" />
          </span>
          <div>
            <h2 className="guard-title">Batch upload portal</h2>
            <p className="guard-text">Connect your wallet to issue academic credentials.</p>
          </div>
        </div>
      </div>
    );
  }

  const successCount = processingResults.filter((r) => r.success).length;
  const failedCount = processingResults.length - successCount;
  const readyCount = parsedData.length - validationErrors.length;
  const stepIndex = BATCH_STEPS.findIndex((step) => step.key === uploadStep);
  const percent = parsedData.length
    ? Math.round((processingResults.length / parsedData.length) * 100)
    : 0;

  const statCards = [
    { label: "Credentials issued", value: stats?.total ?? "—", icon: BadgeCheck, tone: "cobalt" },
    { label: "Awaiting confirmation", value: stats?.pending ?? "—", icon: Clock, tone: "amber" },
    { label: "Confirmed by students", value: stats?.confirmed ?? "—", icon: CheckCircle, tone: "green" },
    { label: "Minted on-chain", value: stats?.minted ?? "—", icon: Gem, tone: "ink" },
  ];

  return (
    <div className="catalog-page batch-page">
      <AdminPageHeader
        title="Batch upload"
        description={`Issue credentials for ${institution?.name || "your institution"} from a single Excel file. Students then claim them.`}
        onRefresh={loadStats}
        isRefreshing={isLoadingStats}
        actions={
          <>
            <span className="wallet-chip">
              <Wallet className="h-3.5 w-3.5" />
              {shortenAddress(publicKey?.toBase58() || "")}
            </span>
            <Button variant="outline" size="sm" onClick={() => navigate("/institution")}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Dashboard
            </Button>
          </>
        }
      />

      <AdminError message={statsError} />
      <StatCards stats={statCards} />

      <ol className="stepper" aria-label="Batch progress">
        {BATCH_STEPS.map((step, index) => (
          <li
            key={step.key}
            className={index === stepIndex ? "is-current" : index < stepIndex ? "is-done" : ""}
            aria-current={index === stepIndex ? "step" : undefined}
          >
            <span className="stepper-dot">
              {index < stepIndex ? <CheckCircle className="h-4 w-4" /> : index + 1}
            </span>
            <span className="stepper-text">
              <span className="stepper-label">{step.label}</span>
              <span className="stepper-sub">{step.sub}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="layout">
        <section className="card">
          {uploadStep === "upload" && (
            <>
              <div className="card-head">
                <div>
                  <h2 className="card-title">Upload student records</h2>
                  <p className="card-sub">One row per credential, up to {MAX_RECORDS} rows. Students are found by registration no.</p>
                </div>
              </div>

              <div className="card-body">
                <label
                  htmlFor="file-upload"
                  className={`dropzone ${isDragging ? "is-dragging" : ""}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  <span className="dropzone-icon">
                    <Upload className="h-6 w-6" />
                  </span>
                  <span className="dropzone-title">
                    Drop your Excel file here or <span className="text-cobalt">browse</span>
                  </span>
                  <span className="dropzone-sub">Excel (.xlsx) · max {MAX_RECORDS} rows</span>
                  <input
                    type="file"
                    id="file-upload"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                </label>

                <div className="template-row">
                  <div className="template-info">
                    <FileSpreadsheet className="h-5 w-5 shrink-0 text-green-700" />
                    <div>
                      <p className="font-semibold">Not sure about the format?</p>
                      <p className="card-sub">Start from the template with one example row.</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadTemplate(credentialSheet(typeCodes)).catch(() => toast.error("Could not create the template"))}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download template
                  </Button>
                </div>

                <div>
                  <p className="section-label mb-2 flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-cobalt" />
                    Required columns
                  </p>
                  <div className="columns">
                    {REQUIRED_COLUMNS.map((column) => (
                      <code key={column}>{column}</code>
                    ))}
                    {OPTIONAL_COLUMNS.map((column) => (
                      <code key={column} className="optional">
                        {column} (optional)
                      </code>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {uploadStep === "review" && (
            <>
              <div className="card-head">
                <div className="file-chip">
                  <FileSpreadsheet className="h-5 w-5 shrink-0 text-green-700" />
                  <div className="min-w-0">
                    <h2 className="card-title truncate">{file?.name}</h2>
                    <p className="card-sub">{parsedData.length} records found</p>
                  </div>
                </div>
                <div className="pills">
                  <span className="pill is-ok">{readyCount} ready</span>
                  {validationErrors.length > 0 && (
                    <span className="pill is-bad">{validationErrors.length} with issues</span>
                  )}
                </div>
              </div>

              <div className="card-body">
                {validationErrors.length > 0 && (
                  <div className="errors">
                    <p className="errors-title">
                      <AlertCircle className="h-4 w-4" />
                      Fix these rows in your Excel file, then upload it again
                    </p>
                    <div className="errors-list">
                      {validationErrors.map((error) => (
                        <div key={error.index} className="error-item">
                          <span className="font-semibold">
                            Row {error.rowNo} · {error.studentName}
                          </span>
                          <ul>
                            {error.errors.map((err) => (
                              <li key={err}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="table-card">
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Student</th>
                          <th>Batch</th>
                          <th>Type</th>
                          <th>Degree</th>
                          <th>CGPA</th>
                          <th>Goes to wallet</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.slice(0, 10).map((student, index) => (
                          <tr key={index}>
                            <td className="cell-sub">{student.row}</td>
                            <td className="nowrap font-medium">
                              {student.studentName || "—"}
                              <span className="cell-sub block">{student.registrationNo}</span>
                            </td>
                            <td className="nowrap">
                              {student.programCode} {student.startYear}
                              {student.endYear ? `–${student.endYear}` : ""}
                            </td>
                            <td className="nowrap">{String(student.credentialType || "").toUpperCase()}</td>
                            <td className="nowrap">{student.degreeTitle}</td>
                            <td className="tabular-nums">{student.cgpa}</td>
                            <td className="cell-mono">{student.wallet ? shortenAddress(student.wallet) : <span className="text-red-700">not linked</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedData.length > 10 && (
                    <div className="table-note">Showing 10 of {parsedData.length} records</div>
                  )}
                </div>
              </div>

              <div className="card-foot">
                <Button variant="outline" onClick={handleReset}>
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Choose another file
                </Button>
                <Button onClick={handleBatchMint} disabled={validationErrors.length > 0 || isProcessing}>
                  <Upload className="h-3.5 w-3.5" />
                  Issue {parsedData.length} credentials
                </Button>
              </div>
            </>
          )}

          {uploadStep === "processing" && (
            <>
              <div className="card-head">
                <div>
                  <h2 className="card-title">Processing certificates</h2>
                  <p className="card-sub">Keep this tab open. This can take several minutes.</p>
                </div>
              </div>

              <div className="card-body">
                <div className="progress-box">
                  <div className="progress-top">
                    <span className="progress-now">
                      <Loader2 className="h-4 w-4 animate-spin text-cobalt" />
                      {parsedData[currentIndex]?.studentName || "Finalizing"}
                    </span>
                    <span className="progress-count">
                      {processingResults.length} / {parsedData.length}
                    </span>
                  </div>
                  <div
                    className="progress"
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className="progress-fill" style={{ width: `${percent}%` }} />
                  </div>
                  <p className="progress-meta">
                    {percent}% · {successCount} succeeded · {failedCount} failed
                  </p>
                </div>

                <ResultsTable results={processingResults} />
              </div>
            </>
          )}

          {uploadStep === "complete" && (
            <>
              <div className="card-head">
                <div className="complete-head">
                  <span className={`complete-icon ${failedCount ? "is-bad" : ""}`}>
                    {failedCount ? <AlertCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                  </span>
                  <div>
                    <h2 className="card-title">
                      {failedCount ? "Batch finished with errors" : "Batch completed"}
                    </h2>
                    <p className="card-sub">
                      {successCount} of {parsedData.length} certificates issued
                    </p>
                  </div>
                </div>
              </div>

              <div className="card-body">
                <div className="totals">
                  <div>
                    <p className="total-label">Total</p>
                    <p className="total-value">{parsedData.length}</p>
                  </div>
                  <div className="is-ok">
                    <p className="total-label">Succeeded</p>
                    <p className="total-value">{successCount}</p>
                  </div>
                  <div className="is-bad">
                    <p className="total-label">Failed</p>
                    <p className="total-value">{failedCount}</p>
                  </div>
                </div>

                <ResultsTable results={processingResults} showDetails />
              </div>

              <div className="card-foot">
                <Button variant="outline" onClick={handleReset}>
                  <Upload className="h-3.5 w-3.5" />
                  Start new batch
                </Button>
                <Button onClick={() => navigate("/institution")}>Return to dashboard</Button>
              </div>
            </>
          )}
        </section>

        <aside className="help">
          <h2 className="help-title">
            <HelpCircle className="h-4 w-4 text-cobalt" />
            Good to know
          </h2>
          <ul className="help-list">
            {HELP_ITEMS.map(([Icon, text]) => (
              <li key={text}>
                <span className="help-icon">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}

function ResultsTable({ results, showDetails = false }) {
  return (
    <div className="table-card results">
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Student</th>
              <th>Degree</th>
              {showDetails ? (
                <>
                  <th>IPFS hash</th>
                  <th>Details</th>
                </>
              ) : (
                <th>Time</th>
              )}
            </tr>
          </thead>
          <tbody>
            {results.length === 0 ? (
              <tr>
                <td colSpan={showDetails ? 5 : 4} className="cell-sub text-center">
                  Results appear here as each certificate finishes.
                </td>
              </tr>
            ) : (
              results.map((result, index) => (
                <tr key={index}>
                  <td>
                    <StatusBadge tone={result.success ? "success" : "danger"}>
                      {result.success ? "Issued" : "Failed"}
                    </StatusBadge>
                  </td>
                  <td className="nowrap font-medium">{result.studentName}</td>
                  <td className="nowrap">{result.degreeType || "-"}</td>
                  {showDetails ? (
                    <>
                      <td className="cell-mono">
                        {result.ipfsHash ? shortenAddress(result.ipfsHash) : "-"}
                      </td>
                      <td className="nowrap">
                        {result.success ? (
                          <a
                            href={`https://ipfs.io/ipfs/${result.ipfsHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-underline inline-flex items-center gap-1"
                          >
                            View metadata
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <span className="text-red-700">{result.error}</span>
                        )}
                      </td>
                    </>
                  ) : (
                    <td className="cell-sub nowrap">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
