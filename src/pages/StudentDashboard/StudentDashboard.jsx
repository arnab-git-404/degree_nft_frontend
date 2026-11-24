import React, { useState, useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { CredentialCard } from "../../components/nft/CredentialCard";
import {
  UserCheck,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle,
  Award,
  Calendar,
  School,
  Clock,
  Flag,
  MessageSquare,
  Edit2,
  Save,
  X,
} from "lucide-react";
import { shortenAddress } from "../../lib/utils";
import { Button } from "../../components/Button";
import { SignInRequired } from "../../components/SignInRequired";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import "./StudentDashboard.css";

export function StudentDashboard() {

  const wallet = useWallet();
  const { isAuthenticated, isRestoring } = useAuth();

  const { connected, publicKey } = wallet;
  const walletAddress = publicKey?.toBase58();
  const toastShownRef = useRef(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [credentialInfo, setCredentialInfo] = useState(null);
  const [authorizationError, setAuthorizationError] = useState("");

  const [isMinting, setIsMinting] = useState(false);
  const [mintError, setMintError] = useState("");
  const [mintSuccess, setMintSuccess] = useState(false);
  const [mintedNft, setMintedNft] = useState(null);

  const [mintedNfts, setMintedNfts] = useState([]);
  const [loadingNfts, setLoadingNfts] = useState(false);

  const [confirmationDeadline, setConfirmationDeadline] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false);

  // New states for reporting issues
  const [isReportingIssue, setIsReportingIssue] = useState(false);
  const [issueDescription, setIssueDescription] = useState("");
  const [isSendingIssue, setIsSendingIssue] = useState(false);
  const [alreadyReported, setAlreadyReported] = useState(false);

  // New state for store metadata
  const [metadataDetails, setMetadataDetails] = useState(null);
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  // Every credential waiting for this student (oldest first); the review panel shows the selected one.
  const [pending, setPending] = useState([]);

  const fetchMetadata = async (uri) => {
    if (!uri) return;
    setLoadingMetadata(true);
    try {
      const response = await fetch(uri);
      setMetadataDetails(await response.json());
    } catch {
      toast.error("Failed to load credential details");
    } finally {
      setLoadingMetadata(false);
    }
  };

  const selectCredential = (item) => {
    setCredentialInfo(item);
    setIsConfirmed(Boolean(item.isConfirmed));
    setConfirmationDeadline(item.confirmationDeadline || null);
    setAlreadyReported(Boolean(item.existingReport));
    setIsReportingIssue(false);
    setMintError("");
    setMetadataDetails(null);
    fetchMetadata(item.uri);
  };

  // Keeps the list in step after a confirm or a report on the selected credential.
  const patchSelected = (changes) =>
    setPending((list) => list.map((item) => (item._id === credentialInfo?._id ? { ...item, ...changes } : item)));

  const loadPending = async () => {
    setIsLoading(true);
    setAuthorizationError("");
    try {
      const { data } = await api.get(`/student/credentials/next/${walletAddress}`);
      const list = data.credentials || [];
      setPending(list);
      if (list.length) {
        setIsAuthorized(true);
        selectCredential(list.find((item) => item._id === credentialInfo?._id) || list[0]);
        if (!toastShownRef.current) {
          toast.success(list.length > 1 ? `${list.length} credentials are waiting for you` : "A credential is waiting for you");
          toastShownRef.current = true;
        }
      } else {
        setIsAuthorized(false);
        setCredentialInfo(null);
        setAuthorizationError(data.message || "No credential found for this wallet.");
      }
    } catch (error) {
      setIsAuthorized(false);
      setCredentialInfo(null);
      setAuthorizationError(error.response?.data?.message || "Failed to load your credentials. Please try again.");
      toast.error("Failed to check credentials");
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate time remaining for confirmation deadline
  useEffect(() => {
    if (!confirmationDeadline) return;

    const updateTimeRemaining = () => {
      const now = new Date();
      const deadline = new Date(confirmationDeadline);
      const diffMs = deadline - now;

      if (diffMs <= 0) {
        setTimeRemaining({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          expired: true,
        });
        return;
      }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds, expired: false });
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [confirmationDeadline]);

  // Load the student's pending and claimed credentials when the wallet or sign-in changes.
  useEffect(() => {
    setMintSuccess(false);
    setMintedNft(null);
    setMintError("");
    if (!connected || !walletAddress || !isAuthenticated) {
      setPending([]);
      setIsAuthorized(false);
      setCredentialInfo(null);
      setAuthorizationError("");
      setConfirmationDeadline(null);
      setTimeRemaining(null);
      setIsConfirmed(false);
      return;
    }
    loadPending();
    fetchMintedNFTs();
  }, [connected, walletAddress, isAuthenticated]);

  const handleConfirm = async () => {
    if (!walletAddress || !credentialInfo) return;

    if (alreadyReported) {
      toast.error("You have already reported an issue for this credential.");
      return;
    }

    setIsSavingChanges(true);

    try {
      const response = await api.post("/student/credentials/confirm", {
        walletAddress,
        credentialId: credentialInfo._id,
        revision: credentialInfo.revision,
      });

      if (response.data.success) {
        setIsConfirmed(true);
        patchSelected({ isConfirmed: true, confirmationStatus: "CONFIRMED" });
        toast.success("Credential confirmed successfully!");
      } else {
        toast.error("Failed to confirm credential");
      }
    } catch (error) {
      console.error("Error confirming credential:", error);
      toast.error("Failed to confirm credential");
    } finally {
      setIsSavingChanges(false);
    }
  };

  // Claim: the backend mints the credential into this (signed-in) wallet. The student needs no SOL.
  const handleMintNft = async () => {
    if (!credentialInfo) return;
    setIsMinting(true);
    setMintError("");
    setMintSuccess(false);
    setMintedNft(null);
    const toastId = toast.loading("Issuing your credential to your wallet...");
    try {
      const { data } = await api.post("/student/credentials/claim", {
        walletAddress,
        credentialId: credentialInfo._id,
        revision: credentialInfo.revision,
      });
      setMintedNft({ address: data.nft.assetAddress, signature: data.nft.mintSignature, name: credentialInfo.name });
      setMintSuccess(true);
      toast.success("Your credential is in your wallet!", { id: toastId });
      fetchMintedNFTs();
      loadPending();
    } catch (error) {
      const message = error.response?.data?.message || "Claiming failed. Please try again.";
      setMintError(message);
      toast.error(message, { id: toastId });
    } finally {
      setIsMinting(false);
    }
  };

  const fetchMintedNFTs = async () => {
    if (!walletAddress) return;

    setLoadingNfts(true);
    try {
      const response = await api.get(`/student/credentials/minted/${walletAddress}`);

      if (response.data.nfts) {
        setMintedNfts(response.data.nfts || []);
      } else {
        console.error("Failed to fetch minted NFTs:", response.data.error);
        toast.error("Failed to load your minted credentials");
      }
    } catch (error) {
      console.error("Error fetching minted NFTs:", error);
      setMintedNfts([]);
    } finally {
      setLoadingNfts(false);
    }
  };

  const getNftExplorerLink = (address, signature, type = "address") => {
    const cluster = "devnet";

    try {
      if (type === "address" && address) {
        return `https://explorer.solana.com/address/${address}?cluster=${cluster}`;
      } else if (type === "transaction" && signature) {
        return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
      }
      return null;
    } catch (error) {
      console.error("Error creating explorer link:", error);
      return null;
    }
  };

  // Format remaining time into a readable string
  const formatTimeRemaining = () => {
    if (!timeRemaining) return "Calculating...";

    if (timeRemaining.expired) {
      return "Deadline expired";
    }

    const { days, hours, minutes, seconds } = timeRemaining;
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  // Handle reporting an issue
  const handleReportIssue = () => {
    if (alreadyReported) {
      toast.error(
        "You've already reported an issue about this credential. Please contact your institution for further assistance.",
      );
    } else {
      setIsReportingIssue(true);
    }
  };

  // Handle canceling issue report
  const handleCancelReport = () => {
    setIsReportingIssue(false);
    setIssueDescription("");
  };

  // Handle submitting the issue
  const handleSubmitIssue = async () => {
    if (!walletAddress || !credentialInfo || !issueDescription.trim()) {
      toast.error("Please provide a description of the issue");
      return;
    }

    setIsSendingIssue(true);

    try {
      const response = await api.post("/student/credentials/report", {
        studentWallet: walletAddress,
        credentialId: credentialInfo._id,
        reportType: "Credential Issue",
        reportDetails: issueDescription.trim(),
      });

      // Handle if the user has already reported an issue
      if (response.status === 409) {
        setAlreadyReported(true);
        toast.error(
          "You have already reported an issue. Please contact your institution for further assistance.",
        );
      } else if (response.data.success) {
        setIsReportingIssue(false);
        setIssueDescription("");
        setAlreadyReported(true);
        patchSelected({ existingReport: true });
        toast.success("Issue reported Successfully! Contact Your institution.");
      } else {
        toast.error(response.data.message || "Failed to report issue");
      }
    } catch (error) {
      console.error("Error reporting issue:", error);
      toast.error("Failed to report issue. Please try again.");
    } finally {
      setIsSendingIssue(false);
    }
  };


  // Render loading state for authorization check
  if (isLoading) {
    return (
      <div className="student-page">
        <div className="loading">
          <Loader2 className="h-6 w-6 animate-spin text-cobalt" />
          <p>Checking your credentials...</p>
        </div>
      </div>
    );
  }

  // Render disconnected state
  if (!connected) {
    return (
      <div className="student-page">
        <div className="state-card">
          <span className="state-icon">
            <UserCheck className="h-5 w-5" />
          </span>
          <div>
            <h2 className="state-title">Student dashboard</h2>
            <p className="state-text">
              Connect your wallet to view your credentials.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isRestoring) {
    return (
      <div className="student-page">
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
        title="Sign in to view your credentials"
        description="Sign a free message with your connected wallet to access your student dashboard."
      />
    );
  }

  // Render connected state
  return (
    <div className="student-page">
      {/* Header: title, wallet, balance, refresh */}
      <div className="page-head">
        <div>
          <h1 className="page-title">Student dashboard</h1>
          <div className="pills">
            <span className="pill">
              Wallet{" "}
              <span className="font-mono">
                {shortenAddress(walletAddress || "")}
              </span>
            </span>
          </div>
        </div>

        <Button onClick={fetchMintedNFTs} variant="outline" size="sm">
          Refresh NFTs
        </Button>
      </div>

      {/* Mint success */}
      {mintSuccess && mintedNft && (
        <div className="success">
          <CheckCircle className="h-4 w-4 shrink-0 text-green-700" />
          <span className="font-semibold text-green-800">Credential claimed: it is now in your wallet.</span>
          <a
            href={getNftExplorerLink(
              mintedNft.address,
              mintedNft.signature,
              "address",
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="success-link"
          >
            View NFT <ExternalLink className="h-3 w-3" />
          </a>
          {pending.length > 0 && (
            <button type="button" className="success-link" onClick={() => setMintSuccess(false)}>
              Review the next credential ({pending.length} left)
            </button>
          )}
        </div>
      )}

      {/* Pick which pending credential to review (when there are several) */}
      {pending.length > 1 && !mintSuccess && (
        <div className="picker" role="tablist" aria-label="Your pending credentials">
          {pending.map((item) => {
            const state =
              item.academicStatus !== "ACTIVE"
                ? { label: item.academicStatus === "SUSPENDED" ? "Suspended" : "Revoked", tone: "bad" }
                : item.existingReport
                  ? { label: "Reported", tone: "bad" }
                  : item.isConfirmed
                    ? { label: "Ready to claim", tone: "ok" }
                    : { label: "Needs review", tone: "warn" };
            return (
              <button
                key={item._id}
                type="button"
                role="tab"
                aria-selected={item._id === credentialInfo?._id}
                className={`picker-item ${item._id === credentialInfo?._id ? "is-on" : ""}`}
                onClick={() => selectCredential(item)}
              >
                <span className="picker-name">{item.name}</span>
                <span className="picker-sub">
                  {item.credentialType} · {item.institutionName || "College"}
                </span>
                <span className={`picker-state is-${state.tone}`}>{state.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Credential to review / mint */}
      {isAuthorized && credentialInfo && !mintSuccess && (
        <div className="review">
          <div className="review-head">
            <h3 className="review-title">
              <Award className="h-4 w-4" />
              {isConfirmed ? "Credential ready to mint" : "Review your credential"}
            </h3>

            {confirmationDeadline && !isConfirmed && (
              <span className="countdown" title="Auto-confirms after deadline">
                <Clock className="h-3.5 w-3.5" />
                {formatTimeRemaining()} left · auto-confirms after deadline
              </span>
            )}
          </div>

          {credentialInfo.revision > 1 && (
            <p className="mx-4 mb-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
              <b>Corrected by your institution (revision {credentialInfo.revision}).</b>
              {credentialInfo.revisionNote ? ` Reason: ${credentialInfo.revisionNote}.` : ""} Your earlier confirmation no longer applies, so please review the details and
              confirm again.
            </p>
          )}
          {credentialInfo.academicStatus && credentialInfo.academicStatus !== "ACTIVE" && (
            <p className="mx-4 mb-2 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">
              Your institution has {credentialInfo.academicStatus === "SUSPENDED" ? "suspended" : "revoked"} this credential, so it can&apos;t be
              claimed now. Contact your institution.
            </p>
          )}
          {alreadyReported && (
            <p className="mx-4 mb-2 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">
              You have an open report on this credential. Minting is on hold until your institution corrects or resolves it.
            </p>
          )}

          {isReportingIssue ? (
            <div className="review-body report">
              <label htmlFor="issue-description" className="field-label">
                Report an issue with your credential information that requires
                institution attention
              </label>
              <textarea
                id="issue-description"
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                className="textarea-field"
                rows={3}
                placeholder="Describe the issue with your credential details..."
              />

              <div className="actions">
                <Button
                  onClick={handleSubmitIssue}
                  disabled={isSendingIssue || !issueDescription.trim()}
                  title="Submit issue to institution"
                >
                  {isSendingIssue ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-3.5 w-3.5" />
                      Submit issue
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleCancelReport}
                  variant="outline"
                  disabled={isSendingIssue}
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="review-body review-grid">
              {/* Left: image + basic info */}
              <div className="review-side">
                {metadataDetails?.image && (
                  <img
                    src={metadataDetails.image}
                    alt={metadataDetails.name}
                    className="cert-image"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                )}
                <dl className="basic">
                  <div>
                    <dt>Name</dt>
                    <dd>{credentialInfo.name}</dd>
                  </div>
                  <div>
                    <dt>Symbol</dt>
                    <dd>{credentialInfo.symbol || "CRED"}</dd>
                  </div>
                  <div>
                    <dt>Metadata URI</dt>
                    <dd>
                      <a
                        href={credentialInfo.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="uri"
                      >
                        {credentialInfo.uri}
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Right: details + actions */}
              <div className="review-main">
                {loadingMetadata ? (
                  <div className="cell-sub flex items-center gap-2 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-cobalt" />
                    Loading credential details...
                  </div>
                ) : metadataDetails ? (
                  <>
                    {metadataDetails.description && (
                      <p className="description">{metadataDetails.description}</p>
                    )}

                    {metadataDetails.attributes &&
                      metadataDetails.attributes.length > 0 && (
                        <div>
                          <p className="section-label mb-1.5">Credential details</p>
                          <dl className="attributes">
                            {metadataDetails.attributes.map((attr, index) => (
                              <div key={index}>
                                <dt>{attr.trait_type}</dt>
                                <dd>{attr.value}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      )}

                    {metadataDetails.external_url && (
                      <a
                        href={metadataDetails.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="external"
                      >
                        {metadataDetails.external_url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </>
                ) : null}

                <div className="actions">
                  {!isConfirmed && !timeRemaining?.expired && (
                    <>
                      <Button
                        disabled={isSavingChanges}
                        onClick={handleConfirm}
                        {...(alreadyReported
                          ? {
                              title:
                                "You have already reported an issue for this credential. Please contact your institution for further assistance.",
                            }
                          : {
                              title:
                                "Confirm that, the above details are correct",
                            })}
                      >
                        {isSavingChanges ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Confirming...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-3.5 w-3.5" />
                            Confirm details
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={handleReportIssue}
                        variant="outline"
                        disabled={isSendingIssue}
                      >
                        <Flag className="h-3.5 w-3.5" />
                        Report issue to institution
                      </Button>
                    </>
                  )}

                  {(isConfirmed || timeRemaining?.expired) && (credentialInfo.academicStatus || "ACTIVE") === "ACTIVE" && (
                    <Button onClick={handleMintNft} disabled={isMinting || alreadyReported}>
                      {isMinting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Claiming...
                        </>
                      ) : (
                        "Claim credential NFT"
                      )}
                    </Button>
                  )}
                </div>

                {isConfirmed && (
                  <p className="msg msg-ok">
                    <CheckCircle className="h-3.5 w-3.5" />
                    You've confirmed these details are correct
                  </p>
                )}

                {timeRemaining?.expired && !isConfirmed && (
                  <p className="msg msg-warn">
                    <Clock className="h-3.5 w-3.5" />
                    Review period expired. Details are auto-confirmed.
                  </p>
                )}

                {mintError && (
                  <p className="msg msg-bad">
                    <AlertCircle className="h-3.5 w-3.5" /> {mintError}
                  </p>
                )}

              </div>
            </div>
          )}
        </div>
      )}

      {/* Nothing pending */}
      {!isAuthorized && !isLoading && !mintSuccess && (
        <div className="pending">
          <Calendar className="h-4 w-4 shrink-0 text-ink/50" />
          <span className="font-medium">
            Pending credentials: {pending.length || "None"}
          </span>
          <span className="cell-sub">
            {authorizationError ||
              "No pending credentials found for your wallet, or they have already been minted."}
          </span>
        </div>
      )}

      {/* Minted credentials */}
      <section className="minted">
        <div className="minted-head">
          <h3 className="minted-title">
            <School className="h-4 w-4" />
            Minted credentials
          </h3>
          <span className="count">{mintedNfts.length}</span>
        </div>

        {loadingNfts ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-cobalt" />
          </div>
        ) : mintedNfts.length > 0 ? (
          <div className="minted-grid">
            {mintedNfts.map((nft, index) => (
              <CredentialCard
                key={index}
                nft={nft}
                getNftExplorerLink={getNftExplorerLink}
              />
            ))}
          </div>
        ) : (
          <div className="empty">
            <Award className="h-6 w-6 text-ink/40" />
            <p>You haven't minted any credential NFTs yet.</p>
            {isAuthorized && credentialInfo && (
              <p className="text-cobalt">
                You have a credential ready to {isConfirmed ? "mint" : "review"}{" "}
                above!
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
