import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import Papa from "papaparse";
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
import { useSolana } from "../../context/SolanaContext";
import { useAuth } from "../../context/AuthContext";
import api, { getErrorMessage } from "../../lib/api";
import { isValidPublicKey } from "../../lib/solana";
import { shortenAddress } from "../../lib/utils";
import "./BatchUploadPortal.css";

const MAX_RECORDS = 200;

const BATCH_STEPS = [
  { key: "upload", label: "Upload", sub: "Choose a CSV file" },
  { key: "review", label: "Review", sub: "Check the records" },
  { key: "processing", label: "Process", sub: "Pin and allocate" },
  { key: "complete", label: "Done", sub: "See the results" },
];

const CSV_COLUMNS = [
  "institutionName",
  "studentName",
  "studentAddress",
  "degreeType",
  "issueDate",
  "graduationYear",
  "cgpa",
  "programDuration",
  "major",
];

const HELP_ITEMS = [
  [Clock, "Processing takes about 5-10 seconds per certificate."],
  [Wallet, "Each student needs a valid Solana wallet address."],
  [ShieldCheck, "Metadata is pinned to IPFS; students mint the NFT on Solana."],
  [AlertCircle, "Failed rows can be fixed and uploaded again in a new batch."],
];

const templateData = [
  {
    institutionName: "Example Institution",
    studentName: "John Doe",
    studentAddress: "29peNqmLi7xRtQfyiibo4WTKwRDS9hWQ93iFZxq2YTPj",
    degreeType: "Bachelor of Technology",
    issueDate: new Date().toISOString().split("T")[0],
    graduationYear: "2026",
    cgpa: "10",
    programDuration: "4 years",
    major: "Computer Science Engineering",
    honors: "Lead Organizer Of Google Developer Groups",
  },
];

const downloadTemplateCSV = () => {
  const blob = new Blob([Papa.unparse(templateData)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "degree_certificate_template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const parseFile = (file) =>
  new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: reject,
    });
  });

const validateParsedData = (data) => {
  const errors = [];
  const currentYear = new Date().getFullYear();

  data.forEach((record, index) => {
    const recordErrors = [];

    CSV_COLUMNS.forEach((field) => {
      if (!record[field]?.trim()) {
        recordErrors.push(`Missing ${field}`);
      }
    });

    if (record.studentAddress && !isValidPublicKey(record.studentAddress.trim())) {
      recordErrors.push("Invalid Solana wallet address");
    }

    if (record.cgpa) {
      const cgpa = parseFloat(record.cgpa);
      if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
        recordErrors.push("CGPA should be between 0 and 10");
      }
    }

    if (record.graduationYear) {
      const year = parseInt(record.graduationYear);
      if (isNaN(year) || year < 1900 || year > currentYear + 10) {
        recordErrors.push("Invalid graduation year");
      }
    }

    if (recordErrors.length > 0) {
      errors.push({
        index,
        studentName: record.studentName || `Record #${index + 1}`,
        errors: recordErrors,
      });
    }
  });

  return errors;
};

export function BatchUploadPortal() {
  const { connected, publicKey } = useWallet();
  const { setCurrentIpfsHash } = useSolana();
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

    if (uploadedFile.name.split(".").pop().toLowerCase() !== "csv") {
      toast.error("Please upload a CSV file");
      return;
    }

    const toastId = toast.loading("Parsing file...");

    try {
      const data = await parseFile(uploadedFile);

      if (data.length === 0) {
        toast.error("The file has no records", { id: toastId });
        return;
      }

      if (data.length > MAX_RECORDS) {
        toast.error(`Maximum ${MAX_RECORDS} records allowed. Please split your file.`, { id: toastId });
        return;
      }

      const errors = validateParsedData(data);
      setFile(uploadedFile);
      setValidationErrors(errors);
      setParsedData(data);
      setUploadStep("review");

      if (errors.length > 0) {
        toast.error(`Found ${errors.length} records with issues. Please review them.`, { id: toastId });
      } else {
        toast.success(`Parsed ${data.length} records`, { id: toastId });
      }
    } catch (error) {
      console.error("Error handling file upload:", error);
      toast.error("Error reading the CSV file", { id: toastId });
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

  const createNftMetadata = (formData) => ({
    name: `${formData.institutionName} - ${formData.degreeType}`,
    symbol: "DegreeNFT",
    description: `${formData.degreeType} issued by ${formData.institutionName} to ${formData.studentName}`,
    seller_fee_basis_points: 500,
    image: "https://cdn.tourradar.com/s3/tour/720x480/251218_65585c177b316.jpg", // Replace with your certificate image URL
    external_url: "https://degree-nft.vercel.app/",
    attributes: [
      { trait_type: "Student Name", value: formData.studentName },
      { trait_type: "Institution", value: formData.institutionName },
      { trait_type: "Degree", value: formData.degreeType },
      { trait_type: "Major", value: formData.major },
      { trait_type: "CGPA", value: formData.cgpa },
      { trait_type: "Graduation Year", value: formData.graduationYear },
      { trait_type: "Program Duration", value: formData.programDuration },
      { trait_type: "Issue Date", value: formData.issueDate },
      { trait_type: "Honors", value: formData.honors || "None" },
    ],
    properties: {
      creators: [
        {
          address: publicKey?.toString() || "29peNqmLi7xRtQfyiibo4WTKwRDS9hWQ93iFZxq2YTPj",
          share: 100,
        },
      ],
      files: [
        {
          type: "image/png",
          uri: "https://cdn.tourradar.com/s3/tour/720x480/251218_65585c177b316.jpg", // Replace with your certificate image URL
        },
      ],
      category: "image",
    },
  });

  const uploadToPinata = async (metadata) => {
    try {
      const response = await api.post("/ipfs/pin-json", metadata);
      setCurrentIpfsHash(response.data.IpfsHash);
      return response.data.IpfsHash;
    } catch (error) {
      console.error("Error uploading to Pinata:", error);
      throw new Error("Failed to upload metadata to IPFS");
    }
  };

  const createNftAllocation = async (ipfsHash, studentData) => {
    const response = await api.post("/institution/credentials", {
      studentWallet: studentData.studentAddress.trim(),
      name: studentData.degreeType,
      symbol: "DegreeNFT",
      uri: `https://ipfs.io/ipfs/${ipfsHash}`,
      ipfsHash,
      sellerFeeBasisPoints: 500,
    });
    return response.data;
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
        const ipfsHash = await uploadToPinata(JSON.stringify(createNftMetadata(student)));
        await createNftAllocation(ipfsHash, student);
        succeeded += 1;

        setProcessingResults((prev) => [
          ...prev,
          {
            success: true,
            studentName: student.studentName,
            degreeType: student.degreeType,
            timestamp: new Date().toISOString(),
            ipfsHash,
          },
        ]);

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`Error processing student ${student.studentName}:`, error);

        setProcessingResults((prev) => [
          ...prev,
          {
            success: false,
            studentName: student.studentName,
            degreeType: student.degreeType,
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
        description={`Issue degree credentials for ${institution?.name || "your institution"} from a single CSV file.`}
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
                  <p className="card-sub">One row per degree certificate, up to {MAX_RECORDS} rows.</p>
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
                    Drop your CSV here or <span className="text-cobalt">browse</span>
                  </span>
                  <span className="dropzone-sub">.csv only · max {MAX_RECORDS} records</span>
                  <input
                    type="file"
                    id="file-upload"
                    accept=".csv"
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
                  <Button variant="outline" size="sm" onClick={downloadTemplateCSV}>
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
                    {CSV_COLUMNS.map((column) => (
                      <code key={column}>{column}</code>
                    ))}
                    <code className="optional">honors (optional)</code>
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
                      Fix these rows in your CSV, then upload it again
                    </p>
                    <div className="errors-list">
                      {validationErrors.map((error) => (
                        <div key={error.index} className="error-item">
                          <span className="font-semibold">
                            Row {error.index + 1} · {error.studentName}
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
                          <th>#</th>
                          <th>Student name</th>
                          <th>Wallet address</th>
                          <th>Degree</th>
                          <th>Major</th>
                          <th>CGPA</th>
                          <th>Duration</th>
                          <th>Graduation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.slice(0, 10).map((student, index) => (
                          <tr key={index}>
                            <td className="cell-sub">{index + 1}</td>
                            <td className="nowrap font-medium">{student.studentName}</td>
                            <td className="cell-mono">{shortenAddress(student.studentAddress || "")}</td>
                            <td className="nowrap">{student.degreeType}</td>
                            <td className="nowrap">{student.major}</td>
                            <td className="tabular-nums">{student.cgpa}</td>
                            <td className="nowrap">{student.programDuration}</td>
                            <td className="tabular-nums">{student.graduationYear}</td>
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
                  Process {parsedData.length} certificates
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
