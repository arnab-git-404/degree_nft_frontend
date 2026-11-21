import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { School, Info, HelpCircle, Loader2, Upload } from "lucide-react";
import { shortenAddress } from "../../lib/utils";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { SignInRequired } from "../../components/SignInRequired";
import { useSolana } from "../../context/SolanaContext";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { Select } from "../../components/CatalogPage/CatalogPage";
import "./InstitutionDashboard.css";

// Mirrors CREDENTIAL_TYPES in the backend nft model.
const CREDENTIAL_TYPES = ["DEGREE", "PROVISIONAL", "MARKSHEET", "TRANSCRIPT", "CERTIFICATE", "OTHER"];
const typeLabel = (type) => type.charAt(0) + type.slice(1).toLowerCase();

export function InstitutionDashboard() {
  const EXTERNAL_API_URL = "https://degree-nft.vercel.app/";

  const { publicKey } = useWallet();
  const {
    isAuthenticated,
    isRestoring,
    hasPermission,
    roleName,
    activeInstitutionId,
  } = useAuth();
  const navigate = useNavigate();
  const canIssueCredentials =
    hasPermission("nft:create") || hasPermission("batch:upload");

  const [issuingNftData, setIssuingNftData] = useState(false);
  const [institutionProfile, setInstitutionProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState("");

  const {
    connected,
    isValidPublicKey,
    setCurrentIpfsHash,
    isLoading,
  } = useSolana();

  // Form state
  const [formData, setFormData] = useState({
    institutionName: "",
    studentName: "",
    studentAddress: "",
    degreeType: "",
    issueDate: new Date().toISOString().split("T")[0],
    graduationYear: "",
    cgpa: "",
    programDuration: "",
    major: "",
    honors: "",
  });

  // P06-04: a credential is issued for one exact enrollment + type.
  const [enrollments, setEnrollments] = useState([]);
  const [enrollmentSearch, setEnrollmentSearch] = useState("");
  const [enrollmentId, setEnrollmentId] = useState("");
  const [credentialType, setCredentialType] = useState("DEGREE");

  useEffect(() => {
    if (!isAuthenticated || !activeInstitutionId) return;
    // shortcut: first 100 matches only, so the search box is how a big college finds a student.
    const timer = setTimeout(() => {
      api
        .get("/institution/enrollments", { params: { search: enrollmentSearch.trim() || undefined, limit: 100 } })
        .then(({ data }) => setEnrollments(data.enrollments.filter((e) => e.status !== "CANCELLED")))
        .catch(() => setEnrollments([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [isAuthenticated, activeInstitutionId, enrollmentSearch]);

  const chooseEnrollment = (id) => {
    setEnrollmentId(id);
    const enrollment = enrollments.find((e) => e._id === id);
    if (!enrollment) return;
    const { programId: program, programSessionId: session, studentId: student } = enrollment;
    setFormData((prev) => ({
      ...prev,
      studentName: student?.fullName || "",
      studentAddress: student?.walletHint || "",
      major: program?.name || "",
      graduationYear: session?.endYear ? String(session.endYear) : "",
      programDuration: session?.startYear && session?.endYear ? `${session.endYear - session.startYear} years` : "",
    }));
  };

  useEffect(() => {
    // No selected college means no active membership: show how to join.
    if (!isAuthenticated || !activeInstitutionId) {
      setInstitutionProfile(null);
      setIsLoadingProfile(false);
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      setIsLoadingProfile(true);
      setProfileError("");

      try {
        const { data } = await api.get("/institution/profile");

        if (!cancelled) {
          setInstitutionProfile(data.institution);
        }
      } catch (error) {
        if (cancelled) return;

        if (error.response?.status === 404) {
          setInstitutionProfile(null);
        } else {
          setProfileError(
            error.response?.data?.message ||
              "Failed to load your institution profile"
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProfile(false);
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, activeInstitutionId]);

  // Format form data into NFT metadata
  const createNftMetadata = (formData) => {
    return {
      name: `${formData.institutionName} - ${formData.degreeType}`,
      symbol: "DegreeNFT",
      description: `${formData.degreeType} issued by ${formData.institutionName} to ${formData.studentName}`,
      seller_fee_basis_points: 500,
      image:
        "https://cdn.tourradar.com/s3/tour/720x480/251218_65585c177b316.jpg", // Replace with your certificate image URL
      external_url: `${EXTERNAL_API_URL}`,
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
          trait_type: "Credential Type",
          value: credentialType,
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
            institutionWalletAddress: `${publicKey.toString()}`,
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

  const validateForm = () => {
    // Institution information validation
    if (!enrollmentId) return "Choose the student's enrollment";

    if (!formData.institutionName?.trim()) return "Institution name is required";

    // Student information validation
    if (!formData.studentName?.trim()) return "Student name is required";

    if (
      !formData.studentAddress?.trim() &&
      !isValidPublicKey(formData.studentAddress)
    )
      return "Student wallet address is required";

    if (formData.studentAddress === publicKey?.toString())
      return "Student wallet address cannot be the same as the institution wallet address";

    // Degree information validation
    if (!formData.degreeType?.trim()) return "Degree type is required";

    if (!formData.major?.trim()) return "Major field of study is required";

    if (!formData.issueDate) return "Issue date is required";

    if (!formData.graduationYear) return "Graduation year is required";

    // Check graduation year is within reasonable range
    const year = parseInt(formData.graduationYear);
    const currentYear = new Date().getFullYear();
    if (isNaN(year) || year < 1900 || year > currentYear + 10)
      return "Please enter a valid graduation year";

    if (!formData.programDuration?.trim())
      return "Program duration is required";

    if (!formData.cgpa?.trim()) return "CGPA is required";

    // Validate CGPA format if needed
    const cgpa = parseFloat(formData.cgpa);
    if (isNaN(cgpa) || cgpa < 0 || cgpa > 10)
      // Adjust max value based on your grading system
      return "Please enter a valid CGPA value";

    // All validations passed
    return null;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleIssueDegree = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast.error("Please sign in with your wallet first");
      return;
    }

    if (!canIssueCredentials) {
      toast.error(
        `This wallet is registered as '${roleName || "unknown"}'. Credential issuing permission is required.`
      );
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIssuingNftData(true);
    try {
      toast.loading("Creating degree NFT...");

      // Create metadata
      const metadata = createNftMetadata(formData);

      const metadataString = JSON.stringify(metadata);

      // Upload to IPFS
      const ipfsHash = await uploadToPinata(metadataString);
      console.log("IPFS Hash:", ipfsHash);

      await createNftAllocation(ipfsHash);

      toast.dismiss();
      // toast.success("Degree NFT created successfully!");

      // Reset form (the enrollment stays chosen so a second credential type is one click away)
      setFormData({
        institutionName: formData.institutionName,
        studentName: "",
        studentAddress: "",
        degreeType: "",
        issueDate: new Date().toISOString().split("T")[0],
        graduationYear: "",
        cgpa: "",
        programDuration: "",
        major: "",
        honors: "",
      });
      chooseEnrollment(enrollmentId);

      toast.success("Degree credential issued successfully!");
    } catch (error) {
      console.error("Error issuing degree:", error);
      toast.error(`Failed to issue credential: ${error.message}`);
    }finally {
      setIssuingNftData(false);
    }
  };

  const createNftAllocation = async (ipfsHash) => {
    const metadataUri = `https://ipfs.io/ipfs/${ipfsHash}`;



    try {
      const response = await api.post("/create-nft-ipfsHash-allocation", {
        studentWallet: formData.studentAddress,
        name: formData.degreeType,
        symbol: "DegreeNFT",
        uri: metadataUri,
        ipfsHash: ipfsHash,
        sellerFeeBasisPoints: 500,
        enrollmentId,
        credentialType,
      });
      console.log("Data Uploaded TO Backend");
      return response.data;
    } catch (error) {
      console.error("Error creating NFT allocation:", error);
      throw error;
    }
  };

  if (!connected) {
    return (
      <div className="institution-page">
        <div className="state-card">
          <span className="state-icon">
            <School className="h-5 w-5" />
          </span>
          <div>
            <h2 className="state-title">Institution dashboard</h2>
            <p className="state-text">
              Connect your wallet to issue academic credentials.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isRestoring) {
    return (
      <div className="institution-page">
        <div className="loading">
          <Loader2 className="h-6 w-6 animate-spin text-cobalt" />
          <p>Restoring your session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <SignInRequired
        title="Sign in to manage your institution"
        description="Sign a free message with your connected wallet to create a profile and issue credentials."
      />
    );
  }

  if (isLoadingProfile) {
    return (
      <div className="institution-page">
        <div className="loading">
          <Loader2 className="h-6 w-6 animate-spin text-cobalt" />
          <p>Loading your institution profile...</p>
        </div>
      </div>
    );
  }

  // Institutions are created only when a Super Admin approves an application (no self-registration).
  if (!institutionProfile) {
    return (
      <div className="institution-page">
        <div className="card register-card">
          <div className="card-head">
            <span className="state-icon">
              <School className="h-4 w-4" />
            </span>
            <div>
              <h2 className="card-title">You are not part of an institution yet</h2>
              <p className="card-sub">
                Institutions join DegreeNFT by applying through a registration
                link from the DegreeNFT team. When a Super Admin approves the
                application, the head of the institution receives an activation
                link by email. Open that link to activate access, then sign in
                with the wallet named in the application.
              </p>
            </div>
          </div>

          {profileError && (
            <div className="card-body">
              <p className="error-text">{profileError}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const verificationStatus = institutionProfile.verificationStatus || "PENDING";

  return (
    <div className="institution-page">
      {/* Header: institution identity + batch upload */}
      <div className="page-head">
        <div className="inst">
          <span className="state-icon">
            <School className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="inst-name-row">
              <h1 className="inst-name">{institutionProfile.name}</h1>
              <span className={`status status-${verificationStatus.toLowerCase()}`}>
                {verificationStatus}
              </span>
            </div>
            <p className="cell-sub">
              Code {institutionProfile.code} · Institution wallet{" "}
              <span className="font-mono">
                {shortenAddress(institutionProfile.walletAddress)}
              </span>{" "}
              · Connected as{" "}
              <span className="font-mono">
                {shortenAddress(publicKey?.toBase58() || "")}
              </span>
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            navigate("/batch-upload");
            toast("Please use .csv files ", {
              icon: "ℹ️",
              duration: 2000,
            });
          }}
        >
          <Upload className="h-3.5 w-3.5" />
          Batch upload
        </Button>
      </div>

      {!canIssueCredentials && (
        <div className="warning">
          <span className="font-medium">Institution account required.</span>{" "}
          This wallet is registered as &apos;{roleName || "unknown"}&apos;.
          Credential issuing and batch uploads require an institution role.
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <div>
            <h2 className="card-title">Issue new degree credential</h2>
            <p className="card-sub">
              Fill in all the required information to mint a degree certificate NFT.
            </p>
          </div>
        </div>

        <form onSubmit={handleIssueDegree}>
          <div className="card-body">
            <fieldset className="group">
              <legend
                className="group-label"
                title="Who issues the degree and who receives it"
              >
                Institution &amp; student
                <HelpCircle className="h-3 w-3" />
              </legend>
              <div className="fields-3">
                <Input
                  label="Find enrollment"
                  placeholder="Student name, reg. no. or enrollment code"
                  value={enrollmentSearch}
                  onChange={(e) => setEnrollmentSearch(e.target.value)}
                />
                <div className="space-y-1">
                  <label className="field-label block">Enrollment</label>
                  <Select value={enrollmentId} onChange={(e) => chooseEnrollment(e.target.value)} required>
                    <option value="">Choose student and batch…</option>
                    {enrollments.map((e) => (
                      <option key={e._id} value={e._id}>
                        {e.studentId?.fullName} · {e.programId?.code} {e.programSessionId?.startYear}–{e.programSessionId?.endYear}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="field-label block">Credential type</label>
                  <Select value={credentialType} onChange={(e) => setCredentialType(e.target.value)}>
                    {CREDENTIAL_TYPES.map((type) => (
                      <option key={type} value={type}>{typeLabel(type)}</option>
                    ))}
                  </Select>
                </div>
                <Input
                  label="Institution name"
                  name="institutionName"
                  placeholder="e.g. Harvard Institution"
                  value={formData.institutionName}
                  onChange={handleInputChange}
                  title="Official name of the institution or educational institution"
                  required
                />
                <Input
                  label="Student full name"
                  name="studentName"
                  placeholder="e.g. John A. Smith"
                  value={formData.studentName}
                  onChange={handleInputChange}
                  title="Complete legal name as it appears on official documents"
                  required
                />
                <Input
                  label="Student wallet address (Solana)"
                  name="studentAddress"
                  placeholder="e.g. EzAvxJV9odS9WTfgnMCmRjKmvn82ziEWDMKJTnrEP4gH"
                  value={formData.studentAddress}
                  onChange={handleInputChange}
                  className="font-mono"
                  description="The degree NFT is sent to this wallet"
                  error={
                    formData.studentAddress &&
                    !isValidPublicKey(formData.studentAddress)
                      ? "Invalid Solana address"
                      : formData.studentAddress === publicKey?.toString()
                      ? "Student wallet address cannot be the same as the institution wallet address"
                      : undefined
                  }
                  required
                />
              </div>
            </fieldset>

            <fieldset className="group">
              <legend
                className="group-label"
                title="Academic details about the degree being awarded"
              >
                Degree
                <HelpCircle className="h-3 w-3" />
              </legend>
              <div className="fields-3">
                <Input
                  label="Degree type / title"
                  name="degreeType"
                  placeholder="e.g. Bachelor of Science"
                  value={formData.degreeType}
                  onChange={handleInputChange}
                  title="The specific academic degree being awarded"
                  required
                />
                <Input
                  label="Major / field of study"
                  name="major"
                  placeholder="e.g. Computer Science"
                  value={formData.major}
                  onChange={handleInputChange}
                  title="The student's specialized field or concentration"
                  required
                />
                <Input
                  label="Honors / distinctions"
                  name="honors"
                  placeholder="e.g. Magna Cum Laude (optional)"
                  value={formData.honors}
                  onChange={handleInputChange}
                  title="Any special honors or achievements (optional)"
                />
              </div>
              <div className="fields-4">
                <Input
                  label="Issue date"
                  name="issueDate"
                  type="date"
                  value={formData.issueDate}
                  onChange={handleInputChange}
                  title="When this degree certificate is being issued"
                  required
                />
                <Input
                  label="Graduation year"
                  name="graduationYear"
                  placeholder="e.g. 2023"
                  type="number"
                  min="1900"
                  max="2099"
                  value={formData.graduationYear}
                  onChange={handleInputChange}
                  title="The year when graduation was completed"
                  required
                />
                <Input
                  label="Program duration"
                  name="programDuration"
                  placeholder="e.g. 4 years"
                  value={formData.programDuration}
                  onChange={handleInputChange}
                  title="Length of time required to complete the degree"
                  required
                />
                <Input
                  label="CGPA / final grade"
                  name="cgpa"
                  placeholder="e.g. 3.8"
                  value={formData.cgpa}
                  onChange={handleInputChange}
                  title="Cumulative Grade Point Average or final grade received"
                  required
                />
              </div>
            </fieldset>
          </div>

          <div className="card-foot">
            <p className="info">
              <Info className="h-3.5 w-3.5 shrink-0 text-cobalt" />
              Creates an on-chain NFT credential on Solana, sent directly to the
              student's wallet and permanently verifiable by anyone with the NFT
              address.
            </p>
            <Button
              type="submit"
              disabled={
                !enrollmentId ||
                !formData.institutionName ||
                !formData.studentName ||
                !isValidPublicKey(formData.studentAddress) ||
                !formData.degreeType ||
                !formData.issueDate ||
                !formData.graduationYear ||
                !formData.cgpa ||
                !formData.programDuration ||
                !formData.major ||
                !canIssueCredentials ||
                isLoading
              }
              className="shrink-0"
            >
              {issuingNftData ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Issuing credential...
                </>
              ) : (
                "Issue degree certificate NFT"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
