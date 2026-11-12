import { useState } from "react";
import { Button } from "../components/Button";
import { useSolana } from "../context/SolanaContext";
import { Input } from "../components/Input";
import { shortenAddress } from "../lib/utils";
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
import axios from "axios";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Papa from "papaparse";
import { useNavigate } from "react-router-dom";




export function BatchUploadPortal() {


  const { connected, publicKey } = useWallet();
  const { setCurrentIpfsHash } = useSolana();
  const { isAuthenticated, hasPermission, roleName } = useAuth();
  const navigate = useNavigate();
  const canUploadBatches = hasPermission("batch:upload");

  // Add Pinata API configuration
  const PINATA_API_KEY = import.meta.env.VITE_APP_PINATA_API_KEY;
  const PINATA_SECRET_KEY = import.meta.env.VITE_APP_PINATA_API_SECRET;


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
      universityName: "Example University",
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
      name: `${formData.universityName} - ${formData.degreeType}`,
      symbol: "DegreeNFT",
      description: `${formData.degreeType} issued by ${formData.universityName} to ${formData.studentName}`,
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
          trait_type: "University",
          value: formData.universityName,
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
      const response = await axios.post(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        metadata,
        {
          headers: {
            "Content-Type": "application/json",
            pinata_api_key: PINATA_API_KEY,
            pinata_secret_api_key: PINATA_SECRET_KEY,
          },
        }
      );
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
        "universityName",
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
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <FileSpreadsheet className="h-16 w-16 text-cobalt" />
        <h2 className="mt-4 text-2xl font-bold">Batch Upload Portal</h2>
        <p className="mt-2 text-ink/60">
          Connect your wallet to issue academic credentials
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">University Batch Upload Portal</h2>
          <p className="mt-1 text-ink/60">
            Connected as: {shortenAddress(publicKey?.toBase58() || "")}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/university")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      <div className="rounded-none border border-ink/20 bg-paper-soft p-6">
        {uploadStep === "upload" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold">Batch Degree Issuance</h3>
              <p className="mt-1 text-sm text-ink/60">
                Upload a CSV file with multiple student records (max 200)
              </p>
            </div>

            <div className="flex flex-col items-center justify-center border-2 border-dashed border-ink/25 rounded-none p-12 text-center hover:border-ink/40 transition-all">
              <Upload className="h-12 w-12 text-ink/60 mb-3" />
              <p className="text-lg font-medium">
                Drag & drop your CSV file here
              </p>
              <p className="text-sm text-ink/60 mt-1 mb-4">
                or click to browse files
              </p>

              <input
                type="file"
                id="file-upload"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />

              <Button
                onClick={() => document.getElementById("file-upload").click()}
                className=" hover:cursor-pointer flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Select CSV File
              </Button>

              <Button
                variant="outline"
                onClick={downloadTemplateCSV}
                className="hover:cursor-pointer mt-4 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Template
              </Button>
            </div>

            <div className="mt-6 rounded-none bg-paper-deep p-4">
              <p className="flex items-start text-sm text-ink/70">
                <Info className="mr-2 h-4 w-4 flex-shrink-0 mt-0.5 text-cobalt" />
                <span>
                  The CSV file should contain columns for universityName,
                  studentName, studentAddress, degreeType, issueDate,
                  graduationYear, cgpa, programDuration, major, and optionally
                  honors. Each row represents one degree certificate to be
                  minted.
                </span>
              </p>
            </div>
          </div>
        )}

        {uploadStep === "review" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold">Review Data</h3>
              <p className="mt-1 text-sm text-ink/60">
                {parsedData.length} records found in {file?.name}
              </p>
            </div>

            {validationErrors.length > 0 && (
              <div className="rounded-none bg-red-600/10 border border-red-700 p-4 mb-4">
                <h4 className="font-medium text-red-700 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Validation Issues ({validationErrors.length})
                </h4>
                <div className="mt-2 max-h-48 overflow-y-auto">
                  {validationErrors.map((error, idx) => (
                    <div
                      key={idx}
                      className="py-2 border-t border-red-800 first:border-0"
                    >
                      <p className="font-medium">{error.studentName}</p>
                      <ul className="list-disc list-inside text-sm text-red-700">
                        {error.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border border-ink/20 rounded-none overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-ink/15">
                  <thead className="bg-paper-soft">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-ink/70 uppercase tracking-wider"
                      >
                        SL No.
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-ink/70 uppercase tracking-wider"
                      >
                        Student Name
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-ink/70 uppercase tracking-wider"
                      >
                        Wallet Address
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-ink/70 uppercase tracking-wider"
                      >
                        Degree
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-ink/70 uppercase tracking-wider"
                      >
                        Major
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-ink/70 uppercase tracking-wider"
                      >
                        CGPA
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-ink/70 uppercase tracking-wider"
                      >
                        Program Duration
                      </th>

                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-ink/70 uppercase tracking-wider"
                      >
                        Graduation Year
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-paper-soft divide-y divide-ink/15">
                    {parsedData.slice(0, 10).map((student, index) => (
                      <tr
                        key={index}
                        className={index % 2 === 0 ? "bg-paper-soft" : ""}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ink/70">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ink/70">
                          {student.studentName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ink/70">
                          {shortenAddress(student.studentAddress)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ink/70">
                          {student.degreeType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ink/70">
                          {student.major}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ink/70">
                          {student.cgpa}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ink/70">
                          {student.programDuration}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ink/70">
                          {student.graduationYear}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedData.length > 10 && (
                <div className="px-6 py-3 bg-paper-soft border-t border-ink/20 text-sm text-ink/60">
                  Showing 10 of {parsedData.length} records...
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>

              <Button
                onClick={handleBatchMint}
                disabled={validationErrors.length > 0 || isProcessing}
                className=" hover:cursor-pointer flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {isProcessing
                  ? "Processing..."
                  : `Process ${parsedData.length} Certificates`}
              </Button>
            </div>
          </div>
        )}

        {uploadStep === "processing" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold">Processing Certificates</h3>
              <p className="mt-1 text-sm text-ink/60">
                Please wait while we process all certificates. This may take
                several minutes.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-full max-w-md bg-paper-deep rounded-full h-4 mb-6">
                <div
                  className="bg-cobalt h-4 rounded-full transition-all duration-300"
                  style={{
                    width: `${(currentIndex / parsedData.length) * 100}%`,
                  }}
                ></div>
              </div>

              <div className="text-center mb-8">
                <p className="text-2xl font-bold text-cobalt">
                  {currentIndex + 1} <span className="text-ink/60">of</span>{" "}
                  {parsedData.length}
                </p>
                <p className="text-sm text-ink/60 mt-1">
                  Certificates Processed
                </p>
              </div>

              <div className="flex items-center justify-center space-x-2 mb-4">
                <Loader className="h-5 w-5 animate-spin text-cobalt" />
                <p className="text-ink/70">
                  {isProcessing && currentIndex < parsedData.length
                    ? `Processing: ${
                        parsedData[currentIndex]?.studentName || ""
                      }...`
                    : "Finalizing..."}
                </p>
              </div>
            </div>

            <div className="border border-ink/20 rounded-none overflow-hidden max-h-60">
              <div className="overflow-y-auto">
                <table className="min-w-full divide-y divide-ink/15">
                  <thead className="bg-paper-soft sticky top-0">
                    <tr>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-ink/70 uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-ink/70 uppercase tracking-wider"
                      >
                        Student
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-ink/70 uppercase tracking-wider"
                      >
                        Degree
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-ink/70 uppercase tracking-wider"
                      >
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-paper-soft divide-y divide-ink/15">
                    {processingResults.map((result, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {result.success ? (
                            <CheckCircle className="h-5 w-5 text-green-700" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-700" />
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-ink/70">
                          {result.studentName}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-ink/70">
                          {result.degreeType || "-"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-ink/60">
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
          </div>
        )}

        {uploadStep === "complete" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold">Processing Complete</h3>
              <p className="mt-1 text-sm text-ink/60">
                {processingResults.filter((r) => r.success).length} of{" "}
                {parsedData.length} certificates processed successfully
              </p>
            </div>

            <div className="flex justify-center py-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-green-600/10 text-green-700 mb-4">
                  <CheckCircle className="h-12 w-12" />
                </div>
                <h4 className="text-xl font-bold">
                  Batch Processing Completed
                </h4>
                <p className="text-ink/60 mt-1">
                  {new Date().toLocaleString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
              <div className="bg-paper-soft rounded-none p-4 border border-ink/20">
                <p className="text-sm text-ink/60">Total Processed</p>
                <p className="text-2xl font-bold">{parsedData.length}</p>
              </div>
              <div className="bg-paper-soft rounded-none p-4 border border-green-700/30">
                <p className="text-sm text-ink/60">Successful</p>
                <p className="text-2xl font-bold text-green-700">
                  {processingResults.filter((r) => r.success).length}
                </p>
              </div>
              <div className="bg-paper-soft rounded-none p-4 border border-red-700/30">
                <p className="text-sm text-ink/60">Failed</p>
                <p className="text-2xl font-bold text-red-700">
                  {processingResults.filter((r) => !r.success).length}
                </p>
              </div>
            </div>

            <div className="border border-ink/20 rounded-none overflow-hidden">
              <div className="overflow-x-auto max-h-80">
                <table className="min-w-full divide-y divide-ink/15">
                  <thead className="bg-paper-soft sticky top-0">
                    <tr>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-ink/70 uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-ink/70 uppercase tracking-wider"
                      >
                        Student
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-ink/70 uppercase tracking-wider"
                      >
                        Degree
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-ink/70 uppercase tracking-wider"
                      >
                        IPFS Hash
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-ink/70 uppercase tracking-wider"
                      >
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-paper-soft divide-y divide-ink/15">
                    {processingResults.map((result, index) => (
                      <tr
                        key={index}
                        className={index % 2 === 0 ? "bg-paper-soft" : ""}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          {result.success ? (
                            <CheckCircle className="h-5 w-5 text-green-700" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-700" />
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-ink/70">
                          {result.studentName}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-ink/70">
                          {result.degreeType || "-"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-ink/60">
                          {result.ipfsHash
                            ? shortenAddress(result.ipfsHash)
                            : "-"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {result.success ? (
                            <a
                              href={`https://ipfs.io/ipfs/${result.ipfsHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cobalt hover:text-cobalt inline-flex items-center"
                            >
                              View Metadata
                            </a>
                          ) : (
                            <span className="text-red-700">{result.error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Start New Batch
              </Button>
              <Button
                onClick={() => navigate("/university")}
                className="flex items-center gap-2"
              >
                Return to Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Help section */}
      <div className="rounded-none border border-ink/20 bg-paper-soft p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <HelpCircle className="h-6 w-6 text-cobalt" />
          </div>
          <div>
            <h3 className="text-lg font-medium">Need Help?</h3>
            <p className="mt-1 text-sm text-ink/60">
              The batch upload feature allows you to issue multiple degree
              certificates at once. Here's how it works:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-ink/60">
              <li className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-cobalt mt-0.5" />
                <span>Processing takes ~5-10 seconds per certificate</span>
              </li>
              <li className="flex items-start gap-2">
                <Info className="h-4 w-4 text-cobalt mt-0.5" />
                <span>
                  Each student must have a valid Solana wallet address
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-cobalt mt-0.5" />
                <span>
                  Certificates are stored permanently on IPFS and Solana
                  blockchain
                </span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-cobalt mt-0.5" />
                <span>Failed uploads can be retried individually later</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
