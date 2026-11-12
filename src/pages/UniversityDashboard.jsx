import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  School,
  Plus,
  CheckCircle,
  Info,
  HelpCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { shortenAddress } from "../lib/utils";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { SignInRequired } from "../components/SignInRequired";
import { useSolana } from "../context/SolanaContext";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import api from "../lib/api";

export function UniversityDashboard() {
  // Add Pinata API configuration
  const PINATA_API_KEY = import.meta.env.VITE_APP_PINATA_API_KEY;
  const PINATA_SECRET_KEY = import.meta.env.VITE_APP_PINATA_API_SECRET;
  const EXTERNAL_API_URL = "https://degree-nft.vercel.app/";

  const { publicKey } = useWallet();
  const {
    isAuthenticated,
    isRestoring,
    hasPermission,
    roleName,
    refreshUser,
  } = useAuth();
  const navigate = useNavigate();
  const canIssueCredentials =
    hasPermission("nft:create") || hasPermission("batch:upload");

  const [issuingNftData, setIssuingNftData] = useState(false);
  const [universityProfile, setUniversityProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [profileFormError, setProfileFormError] = useState("");
  const [profileForm, setProfileForm] = useState({
    name: "",
    code: "",
    email: "",
    phone: "",
    website: "",
    accreditation: "",
  });

  const {
    connected,
    isValidPublicKey,
    setCurrentIpfsHash,
    isLoading,
  } = useSolana();

  // Form state
  const [formData, setFormData] = useState({
    universityName: "",
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

  useEffect(() => {
    if (!isAuthenticated) {
      setUniversityProfile(null);
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      setIsLoadingProfile(true);
      setProfileError("");

      try {
        const { data } = await api.get("/university/profile");

        if (!cancelled) {
          setUniversityProfile(data.university);
        }
      } catch (error) {
        if (cancelled) return;

        if (error.response?.status === 404) {
          setUniversityProfile(null);
        } else {
          setProfileError(
            error.response?.data?.message ||
              "Failed to load your university profile"
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
  }, [isAuthenticated]);

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;

    setProfileForm((prev) => ({
      ...prev,
      [name]: name === "code" ? value.toUpperCase() : value,
    }));
  };

  const handleCreateProfile = async (e) => {
    e.preventDefault();

    if (!publicKey) {
      toast.error("Connect your wallet first");
      return;
    }

    setIsCreatingProfile(true);
    setProfileFormError("");

    try {
      const { data } = await api.post("/university/profile", {
        ...profileForm,
        walletAddress: publicKey.toBase58(),
      });

      setUniversityProfile(data.university);
      await refreshUser().catch(() => {});
      toast.success("University profile created successfully");
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to create university profile";
      setProfileFormError(message);
      toast.error(message);
    } finally {
      setIsCreatingProfile(false);
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
      external_url: `${EXTERNAL_API_URL}`,
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
            universityWalletAddress: `${publicKey.toString()}`,
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

  const validateForm = () => {
    // University information validation
    if (!formData.universityName?.trim()) return "University name is required";

    // Student information validation
    if (!formData.studentName?.trim()) return "Student name is required";

    if (
      !formData.studentAddress?.trim() &&
      !isValidPublicKey(formData.studentAddress)
    )
      return "Student wallet address is required";

    if (formData.studentAddress === publicKey?.toString())
      return "Student wallet address cannot be the same as the university wallet address";

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

      // Reset form
      setFormData({
        universityName: formData.universityName,
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
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <School className="h-16 w-16 text-cobalt" />

        <h2 className="mt-4 text-2xl font-bold">University Dashboard</h2>

        <p className="mt-2 text-ink/60">
          Connect your wallet to issue academic credentials
        </p>
      </div>
    );
  }

  if (isRestoring) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Loader2 className="h-12 w-12 animate-spin text-cobalt" />
        <p className="mt-4 text-ink/60">Restoring your session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <SignInRequired
        title="Sign in to manage your university"
        description="Sign a free message with your connected wallet to create a profile and issue credentials."
      />
    );
  }

  if (isLoadingProfile) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Loader2 className="h-12 w-12 animate-spin text-cobalt" />
        <p className="mt-4 text-ink/60">Loading your university profile...</p>
      </div>
    );
  }

  if (!universityProfile) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <School className="mx-auto h-16 w-16 text-cobalt" />
          <h2 className="mt-4 text-2xl font-bold">Register Your University</h2>
          <p className="mt-2 text-ink/60">
            Create a university profile to issue credentials. Your account will
            be upgraded to the university role and marked as pending
            verification.
          </p>
        </div>

        <form
          onSubmit={handleCreateProfile}
          className="space-y-4 rounded-none border border-ink/20 bg-paper-soft p-6"
        >
          <Input
            label="University or Institution Name"
            name="name"
            placeholder="e.g. Harvard University"
            value={profileForm.name}
            onChange={handleProfileInputChange}
            required
          />

          <Input
            label="University Code"
            name="code"
            placeholder="e.g. HARVARD"
            value={profileForm.code}
            onChange={handleProfileInputChange}
            description="A unique short code used to identify your institution"
            required
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Contact Email"
              name="email"
              type="email"
              placeholder="registrar@university.edu"
              value={profileForm.email}
              onChange={handleProfileInputChange}
            />

            <Input
              label="Phone"
              name="phone"
              placeholder="+1 555 000 0000"
              value={profileForm.phone}
              onChange={handleProfileInputChange}
            />
          </div>

          <Input
            label="Website"
            name="website"
            placeholder="https://university.edu"
            value={profileForm.website}
            onChange={handleProfileInputChange}
          />

          <Input
            label="Accreditation"
            name="accreditation"
            placeholder="Accrediting body or reference"
            value={profileForm.accreditation}
            onChange={handleProfileInputChange}
          />

          <div className="rounded-none bg-paper-deep p-3">
            <p className="text-sm text-ink/70">
              Profile wallet:{" "}
              <span className="font-mono">
                {shortenAddress(publicKey?.toBase58() || "")}
              </span>
            </p>
          </div>

          {profileError && (
            <p className="text-sm text-red-700">{profileError}</p>
          )}

          {profileFormError && (
            <p className="text-sm text-red-700">{profileFormError}</p>
          )}

          <Button
            type="submit"
            disabled={isCreatingProfile || !profileForm.name || !profileForm.code}
            className="w-full"
          >
            {isCreatingProfile ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating profile...
              </>
            ) : (
              "Create University Profile"
            )}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">University Dashboard</h2>

          <p className="mt-1 text-ink/60">
            Connected as: {shortenAddress(publicKey?.toBase58() || "")}
          </p>
        </div>

        <div>
          {/* <h2 className="text-2xl font-bold">Go For Batch Upload</h2> */}

          <Button
            variant="outline"
            onClick={() => {
              navigate("/batch-upload");
              toast("Please use .csv files ", {
                icon: "ℹ️",
                duration: 2000,
              });
            }}
            className="flex items-center gap-2 hover:cursor-pointer "
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Batch Upload
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-none border border-ink/20 bg-paper-soft p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold">{universityProfile.name}</h3>
          <p className="mt-1 text-sm text-ink/60">
            Code: {universityProfile.code} · Wallet:{" "}
            {shortenAddress(universityProfile.walletAddress)}
          </p>
        </div>
        <span
          className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${
            universityProfile.verificationStatus === "VERIFIED"
              ? "bg-green-600/10 text-green-700"
              : universityProfile.verificationStatus === "REJECTED"
              ? "bg-red-600/10 text-red-700"
              : "bg-yellow-500/15 text-yellow-800"
          }`}
        >
          {universityProfile.verificationStatus || "PENDING"}
        </span>
      </div>

      {!canIssueCredentials && (
        <div className="rounded-none border border-yellow-600/40 bg-yellow-500/10 p-4">
          <p className="font-medium text-yellow-800">
            University account required
          </p>
          <p className="mt-1 text-sm text-yellow-900/80">
            This wallet is registered as &apos;{roleName || "unknown"}&apos;.
            Credential issuing and batch uploads require a university role.
          </p>
        </div>
      )}

      <div className="rounded-none border border-ink/20 bg-paper-soft p-6">
        <h3 className="text-xl font-semibold">Issue New Degree Credential</h3>
        <p className="mt-1 text-sm text-ink/60">
          Fill in all the required information to mint a degree certificate NFT
        </p>

        <form onSubmit={handleIssueDegree} className="mt-6 space-y-6">
          {/* University Information */}
          <div className="space-y-4">
            <div className="flex items-center">
              <h4 className="font-medium text-cobalt">
                University Information
              </h4>
              <div
                className="tooltip ml-2 cursor-help"
                title="Information about the institution issuing this degree"
              >
                <HelpCircle className="h-4 w-4 text-ink/60" />
              </div>
            </div>
            <Input
              label="University or Institution Name"
              name="universityName"
              placeholder="e.g. Harvard University"
              value={formData.universityName}
              onChange={handleInputChange}
              description="Official name of the university or educational institution"
              required
            />
          </div>

          {/* Student Information */}
          <div className="space-y-4">
            <div className="flex items-center">
              <h4 className="font-medium text-cobalt">
                Student Information
              </h4>
              <div
                className="tooltip ml-2 cursor-help"
                title="Details about the recipient of this degree"
              >
                <HelpCircle className="h-4 w-4 text-ink/60" />
              </div>
            </div>
            <Input
              label="Student Full Name"
              name="studentName"
              placeholder="e.g. John A. Smith"
              value={formData.studentName}
              onChange={handleInputChange}
              description="Complete legal name as it appears on official documents"
              required
            />

            <Input
              label="Student Wallet Address (Solana)"
              name="studentAddress"
              placeholder="e.g. EzAvxJV9odS9WTfgnMCmRjKmvn82ziEWDMKJTnrEP4gH"
              value={formData.studentAddress}
              onChange={handleInputChange}
              description="The Solana wallet address where the degree NFT will be sent"
              error={
                formData.studentAddress &&
                !isValidPublicKey(formData.studentAddress)
                  ? "Invalid Solana address"
                  : formData.studentAddress === publicKey?.toString()
                  ? "Student wallet address cannot be the same as the university wallet address"
                  : undefined
              }
              required
            />
          </div>

          {/* Degree Information */}
          <div className="space-y-4">
            <div className="flex items-center">
              <h4 className="font-medium text-cobalt">
                Degree Information
              </h4>
              <div
                className="tooltip ml-2 cursor-help"
                title="Academic details about the degree being awarded"
              >
                <HelpCircle className="h-4 w-4 text-ink/60" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Degree Type/Title"
                name="degreeType"
                placeholder="e.g. Bachelor of Science"
                value={formData.degreeType}
                onChange={handleInputChange}
                description="The specific academic degree being awarded"
                required
              />

              <Input
                label="Major/Field of Study"
                name="major"
                placeholder="e.g. Computer Science"
                value={formData.major}
                onChange={handleInputChange}
                description="The student's specialized field or concentration"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Input
                label="Issue Date"
                name="issueDate"
                type="date"
                value={formData.issueDate}
                onChange={handleInputChange}
                description="When this degree certificate is being issued"
                required
              />

              <Input
                label="Graduation Year"
                name="graduationYear"
                placeholder="e.g. 2023"
                type="number"
                min="1900"
                max="2099"
                value={formData.graduationYear}
                onChange={handleInputChange}
                description="The year when graduation was completed"
                required
              />

              <Input
                label="Program Duration"
                name="programDuration"
                placeholder="e.g. 4 years"
                value={formData.programDuration}
                onChange={handleInputChange}
                description="Length of time required to complete the degree"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="CGPA/Final Grade"
                name="cgpa"
                placeholder="e.g. 3.8"
                value={formData.cgpa}
                onChange={handleInputChange}
                description="Cumulative Grade Point Average or final grade received"
                required
              />

              <Input
                label="Honors/Distinctions"
                name="honors"
                placeholder="e.g. Magna Cum Laude"
                value={formData.honors}
                onChange={handleInputChange}
                description="Any special honors or achievements (optional)"
              />
            </div>
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              disabled={
                !formData.universityName ||
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
              className=" hover:cursor-pointer w-full"
            >
              {issuingNftData ? (
                <> <Loader2 className="mr-2 h-4 w-4 animate-spin" />Issuing Credential...</>
              ) : (
                <>
                  {/* <Plus className="mr-2 h-4 w-4" /> */}
                  Issue Degree Certificate NFT
                </>
              )}
            </Button>

            <div className="mt-2 rounded-none bg-paper-deep p-3">
              <p className="flex items-start text-sm text-ink/70">
                <Info className="mr-2 h-4 w-4 flex-shrink-0 mt-0.5 text-cobalt" />
                <span>
                  This will create an on-chain NFT credential on the Solana
                  blockchain that will be sent directly to the student's wallet.
                  The credential will be permanently recorded and verifiable by
                  anyone with the NFT address.
                </span>
              </p>
            </div>
          </div>
        </form>
      </div>

      {/* <div className="rounded-none border border-ink/20 bg-paper-soft p-6">
        <h3 className="text-xl font-semibold">Recent Credentials</h3>
        <div className="mt-4 space-y-4">
          {recentCredentials.length > 0 ? (
            <div className="space-y-4">
              {recentCredentials.map((credential) => (
                <div
                  key={credential.id}
                  className="border border-ink/15 rounded-none p-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{credential.studentName}</h4>
                      <p className="text-sm text-ink/50">
                        {credential.degreeType}
                      </p>
                      <p className="text-xs text-ink/45 mt-1">
                        {new Date(credential.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <a
                      href={getCredentialExplorerUrl(
                        "address",
                        credential.address
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 hover:text-blue-800"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <Info className="h-12 w-12 mx-auto text-ink/60 mb-3" />
              <p className="text-ink/45">No credentials issued yet.</p>
              <p className="text-sm text-ink/60 mt-1">
                Issued credentials will appear here
              </p>
            </div>
          )}

          {mintedNft && (
            <div className="mt-8 p-4 bg-green-50 rounded-none border border-green-200">
              <h4 className="font-medium text-green-800 flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Latest NFT Created
              </h4>
              <p className="text-sm mt-2 text-green-700">
                NFT Address:
                {explorerLink ? (
                  <a
                    href={explorerLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 underline"
                  >
                    {mintedNft.address.toString().substring(0, 8)}...
                  </a>
                ) : (
                  <span className="ml-1">
                    {mintedNft.address.toString().substring(0, 8)}...
                  </span>
                )}
              </p>
              {mintedNft.metadataUri && (
                <a
                  href={mintedNft.metadataUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-700 hover:text-blue-800 mt-1 flex items-center"
                >
                  <span>View Metadata</span>
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              )}
            </div>
          )}
        </div>
      </div> */}




    </div>
  );
}

