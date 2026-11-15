import { useState } from "react";
import { Button } from "../../components/Button";
import { useSolana } from "../../context/SolanaContext";
import { Input } from "../../components/Input";
import { shortenAddress } from "../../lib/utils";
import toast from "react-hot-toast";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader,
  ArrowLeft,
  Download,
  Clock,
  Info,
  HelpCircle,
} from "lucide-react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import Papa from "papaparse";
import { useNavigate } from "react-router-dom";
import "./BatchUploadPortal.css";




const BATCH_STEPS = [
  { key: "upload", label: "Upload" },
  { key: "review", label: "Review" },
  { key: "processing", label: "Process" },
  { key: "complete", label: "Done" },
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

export function BatchUploadPortal() {


  const { connected, publicKey } = useWallet();
  const { setCurrentIpfsHash } = useSolana();
  const { isAuthenticated, hasPermission, roleName } = useAuth();
  const navigate = useNavigate();
  const canUploadBatches = hasPermission("batch:upload");


  // State management
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResults, setProcessingResults] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [uploadStep, setUploadStep] = useState("upload");
  const [validationErrors, setValidationErrors] = useState([]);

  // For file download
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

  // For template download
  const downloadTemplateCSV = () => {
    const csvContent = Papa.unparse(templateData);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "degree_certificate_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse uploaded CSV file
  const parseFile = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          resolve(results.data);
        },
        error: function (error) {
          reject(error);
          toast.error("Error parsing CSV file");
        },
      });
    });
  };

  // Handle file upload
  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    // Validate file type
    const fileType = uploadedFile.name.split(".").pop().toLowerCase();
    if (fileType !== "csv") {
      toast.error("Please upload a CSV file");
      return;
    }

    setFile(uploadedFile);
    toast.loading("Parsing file...");

    try {
      // Parse CSV file
      const data = await parseFile(uploadedFile);

      if (data.length > 200) {
        toast.error("Maximum 200 records allowed. Please split your file.");
        return;
      }

      // Validate parsed data
      const errors = validateParsedData(data);
      setValidationErrors(errors);

      setParsedData(data);
      setUploadStep("review");
      toast.dismiss();

      if (errors.length > 0) {
        toast.error(
          `Found ${errors.length} validation issues. Please review before processing.`
        );
      } else {
        toast.success(`Successfully parsed ${data.length} records`);
      }
    } catch (error) {
      console.error("Error handling file upload:", error);
      toast.error("Error processing file");
    }
  };

  // Format form data into NFT metadata
  const createNftMetadata = (formData) => {
    return {
      name: `${formData.institutionName} - ${formData.degreeType}`,
      symbol: "DegreeNFT",
      description: `${formData.degreeType} issued by ${formData.institutionName} to ${formData.studentName}`,
      seller_fee_basis_points: 500,
      image:
        "https://cdn.tourradar.com/s3/tour/720x480/251218_65585c177b316.jpg", // Replace with your certificate image URL
      external_url: "https://degree-nft.vercel.app/",
      attributes: [
        {
          trait_type: "Student Name",
          value: formData.studentName,
        },
        {
          trait_type: "Institution",
          value: formData.institutionName,
        },
        {
          trait_type: "Degree",
          value: formData.degreeType,
        },
        {
          trait_type: "Major",
          value: formData.major,
        },
        {
          trait_type: "CGPA",
          value: formData.cgpa,
        },
        {
          trait_type: "Graduation Year",
          value: formData.graduationYear,
        },
        {
          trait_type: "Program Duration",
          value: formData.programDuration,
        },
        {
          trait_type: "Issue Date",
          value: formData.issueDate,
        },
        {
          trait_type: "Honors",
          value: formData.honors || "None",
        },
      ],
      properties: {
        creators: [
          {
            address:
              publicKey?.toString() ||
              "29peNqmLi7xRtQfyiibo4WTKwRDS9hWQ93iFZxq2YTPj",
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
    };
  };

  // Upload metadata to Pinata
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

  // Create NFT allocation
  const createNftAllocation = async (ipfsHash, studentData) => {
    const metadataUri = `https://ipfs.io/ipfs/${ipfsHash}`;

    try {
      const response = await api.post("/create-nft-ipfsHash-allocation", {
        studentWallet: studentData.studentAddress,
        name: studentData.degreeType,
        symbol: "DegreeNFT",
        uri: metadataUri,
        ipfsHash: ipfsHash,
        sellerFeeBasisPoints: 500,
      });
      console.log("Data Uploaded To Backend");
      return response.data;
    } catch (error) {
      console.error("Error creating NFT allocation:", error);
      throw error;
    }
  };

  // Validate data from CSV
  const validateParsedData = (data) => {
    const errors = [];

    data.forEach((record, index) => {
      const recordErrors = [];

      // Check required fields
      const requiredFields = [
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

      requiredFields.forEach((field) => {
        if (!record[field]?.trim()) {
          recordErrors.push(`Missing ${field}`);
        }
      });

      // Validate student address
      if (record.studentAddress && !isValidPublicKey(record.studentAddress)) {
        recordErrors.push("Invalid Solana wallet address");
      }

      // Validate CGPA
      if (record.cgpa) {
        const cgpa = parseFloat(record.cgpa);
        if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
          recordErrors.push("CGPA should be between 0 and 10");
        }
      }

      // Validate graduation year
      if (record.graduationYear) {
        const year = parseInt(record.graduationYear);
        const currentYear = new Date().getFullYear();
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

  // Helper function to check if a string is a valid Solana public key
  const isValidPublicKey = (address) => {
    try {
      if (address && address.length >= 32 && address.length <= 44) {
        // This is a basic check - for production, use proper validation
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Process batch certificates
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

    // Process each student sequentially
    for (let i = 0; i < parsedData.length; i++) {
      setCurrentIndex(i);
      const student = parsedData[i];

      try {
        // Create metadata
        const metadata = createNftMetadata(student);
        const metadataString = JSON.stringify(metadata);

        // Upload to IPFS
        const ipfsHash = await uploadToPinata(metadataString);

        // Create NFT allocation
        await createNftAllocation(ipfsHash, student);

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

        // Add a small delay to prevent rate limiting
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (error) {
        console.error(
          `Error processing student ${student.studentName}:`,
          error
        );

        setProcessingResults((prev) => [
          ...prev,
          {
            success: false,
            studentName: student.studentName,
            error: error.message || "Unknown error",
          },
        ]);
      }
    }

    setIsProcessing(false);
    setUploadStep("complete");

    // Show completion toast
    const successCount = processingResults.filter((r) => r.success).length;
    if (successCount === parsedData.length) {
      toast.success(`Successfully processed all ${successCount} certificates!`);
    } else {
      toast.success(
        `Processed ${successCount} of ${parsedData.length} certificates. Check results for details.`
      );
    }
  };

  // Handle going back to upload step
  const handleReset = () => {
    setFile(null);
    setParsedData([]);
    setProcessingResults([]);
    setCurrentIndex(0);
    setUploadStep("upload");
    setValidationErrors([]);
  };

  // If not connected, show connect wallet message
  if (!connected) {
    return (
      <div className="batch-page">
        <div className="state-card">
          <span className="state-icon">
            <FileSpreadsheet className="h-5 w-5" />
          </span>
          <div>
            <h2 className="state-title">Batch upload portal</h2>
            <p className="state-text">
              Connect your wallet to issue academic credentials.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const successCount = processingResults.filter((r) => r.success).length;
  const failedCount = processingResults.filter((r) => !r.success).length;
  const stepIndex = BATCH_STEPS.findIndex((step) => step.key === uploadStep);

  return (
    <div className="batch-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Batch upload</h1>
          <p className="cell-sub">
            Connected as{" "}
            <span className="font-mono">
              {shortenAddress(publicKey?.toBase58() || "")}
            </span>
          </p>
        </div>

        <ol className="steps" aria-label="Batch progress">
          {BATCH_STEPS.map((step, index) => (
            <li
              key={step.key}
              className={
                index === stepIndex ? "is-current" : index < stepIndex ? "is-done" : ""
              }
            >
              <span className="step-dot">{index + 1}</span>
              {step.label}
            </li>
          ))}
        </ol>

        <Button variant="outline" size="sm" onClick={() => navigate("/institution")}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </Button>
      </div>

      <div className="layout">
        <div className="card">
          {uploadStep === "upload" && (
            <>
              <div className="card-head">
                <h3 className="card-title">Batch degree issuance</h3>
                <p className="card-sub">
                  Upload a CSV file with multiple student records (max 200).
                </p>
              </div>

              <div className="card-body">
                <div className="dropzone">
                  <Upload className="h-7 w-7 text-ink/45" />
                  <div>
                    <p className="font-medium">Choose your CSV file</p>
                    <p className="cell-sub">
                      One row per degree certificate. Use the template if unsure.
                    </p>
                  </div>

                  <input
                    type="file"
                    id="file-upload"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <div className="dropzone-actions">
                    <Button
                      onClick={() => document.getElementById("file-upload").click()}
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      Select CSV file
                    </Button>
                    <Button variant="outline" onClick={downloadTemplateCSV}>
                      <Download className="h-3.5 w-3.5" />
                      Download template
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="section-label mb-1.5 flex items-center gap-1">
                    <Info className="h-3 w-3 text-cobalt" />
                    Required CSV columns
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
                <h3 className="card-title">Review data</h3>
                <p className="card-sub">
                  {parsedData.length} records found in {file?.name}
                </p>
              </div>

              <div className="card-body">
                {validationErrors.length > 0 && (
                  <div className="errors">
                    <p className="errors-title">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Validation issues ({validationErrors.length})
                    </p>
                    <div className="errors-list">
                      {validationErrors.map((error, idx) => (
                        <div key={idx} className="error-item">
                          <span className="font-medium">{error.studentName}</span>
                          <ul>
                            {error.errors.map((err, i) => (
                              <li key={i}>{err}</li>
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
                          <th>Program duration</th>
                          <th>Graduation year</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.slice(0, 10).map((student, index) => (
                          <tr key={index}>
                            <td className="cell-sub">{index + 1}</td>
                            <td className="nowrap font-medium">{student.studentName}</td>
                            <td className="cell-mono">{shortenAddress(student.studentAddress)}</td>
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
                    <div className="table-note">
                      Showing 10 of {parsedData.length} records...
                    </div>
                  )}
                </div>
              </div>

              <div className="card-foot">
                <Button variant="outline" onClick={handleReset}>
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </Button>
                <Button
                  onClick={handleBatchMint}
                  disabled={validationErrors.length > 0 || isProcessing}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {isProcessing
                    ? "Processing..."
                    : `Process ${parsedData.length} certificates`}
                </Button>
              </div>
            </>
          )}

          {uploadStep === "processing" && (
            <>
              <div className="card-head">
                <h3 className="card-title">Processing certificates</h3>
                <p className="card-sub">
                  Please wait while we process all certificates. This may take
                  several minutes.
                </p>
              </div>

              <div className="card-body">
                <div className="progress-row">
                  <div className="progress">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${(currentIndex / parsedData.length) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="progress-count">
                    {currentIndex + 1} <span className="text-ink/45">of</span>{" "}
                    {parsedData.length}
                  </span>
                </div>
                <p className="cell-sub flex items-center gap-1.5">
                  <Loader className="h-3.5 w-3.5 animate-spin text-cobalt" />
                  {isProcessing && currentIndex < parsedData.length
                    ? `Processing: ${parsedData[currentIndex]?.studentName || ""}...`
                    : "Finalizing..."}
                </p>

                <div className="table-card results">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Student</th>
                        <th>Degree</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processingResults.map((result, index) => (
                        <tr key={index}>
                          <td>
                            {result.success ? (
                              <CheckCircle className="h-4 w-4 text-green-700" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-700" />
                            )}
                          </td>
                          <td className="nowrap">{result.studentName}</td>
                          <td className="nowrap">{result.degreeType || "-"}</td>
                          <td className="cell-sub nowrap">
                            {result.timestamp
                              ? new Date(result.timestamp).toLocaleTimeString()
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {uploadStep === "complete" && (
            <>
              <div className="card-head complete-head">
                <span className="complete-icon">
                  <CheckCircle className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="card-title">Batch processing completed</h3>
                  <p className="card-sub">
                    {successCount} of {parsedData.length} certificates processed
                    successfully · {new Date().toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="card-body">
                <div className="totals">
                  <div>
                    <p className="total-label">Total processed</p>
                    <p className="total-value">{parsedData.length}</p>
                  </div>
                  <div className="is-ok">
                    <p className="total-label">Successful</p>
                    <p className="total-value">{successCount}</p>
                  </div>
                  <div className="is-bad">
                    <p className="total-label">Failed</p>
                    <p className="total-value">{failedCount}</p>
                  </div>
                </div>

                <div className="table-card results">
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th>Student</th>
                          <th>Degree</th>
                          <th>IPFS hash</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {processingResults.map((result, index) => (
                          <tr key={index}>
                            <td>
                              {result.success ? (
                                <CheckCircle className="h-4 w-4 text-green-700" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-red-700" />
                              )}
                            </td>
                            <td className="nowrap">{result.studentName}</td>
                            <td className="nowrap">{result.degreeType || "-"}</td>
                            <td className="cell-mono">
                              {result.ipfsHash ? shortenAddress(result.ipfsHash) : "-"}
                            </td>
                            <td className="nowrap">
                              {result.success ? (
                                <a
                                  href={`https://ipfs.io/ipfs/${result.ipfsHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="link-underline text-xs"
                                >
                                  View metadata
                                </a>
                              ) : (
                                <span className="text-xs text-red-700">{result.error}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="card-foot">
                <Button variant="outline" onClick={handleReset}>
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Start new batch
                </Button>
                <Button onClick={() => navigate("/institution")}>
                  Return to dashboard
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Help panel */}
        <aside className="help">
          <p className="help-title">
            <HelpCircle className="h-3.5 w-3.5 text-cobalt" />
            Need help?
          </p>
          <p className="cell-sub">
            Batch upload issues multiple degree certificates at once.
          </p>
          <ul className="help-list">
            <li>
              <Clock className="h-3.5 w-3.5" />
              Processing takes ~5-10 seconds per certificate
            </li>
            <li>
              <Info className="h-3.5 w-3.5" />
              Each student must have a valid Solana wallet address
            </li>
            <li>
              <CheckCircle className="h-3.5 w-3.5" />
              Certificates are stored permanently on IPFS and Solana blockchain
            </li>
            <li>
              <AlertCircle className="h-3.5 w-3.5" />
              Failed uploads can be retried individually later
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
