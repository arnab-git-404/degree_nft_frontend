import React, { useState, useEffect, useMemo, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, clusterApiUrl } from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { CredentialCard } from "../../components/nft/CredentialCard";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import {
  createNft,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { generateSigner } from "@metaplex-foundation/umi";
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
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import "./StudentDashboard.css";

const INSTITUTION_FEES = 0.01;

export function StudentDashboard() {
  const navigate = useNavigate();

  const wallet = useWallet();
  const connection = new Connection(clusterApiUrl("devnet"));
  const { isAuthenticated, isRestoring } = useAuth();

  const { connected, publicKey } = wallet;
  const walletAddress = publicKey?.toBase58();
  const toastShownRef = useRef(false);
  const [walletBalance, setWalletBalance] = useState(null);
  const [balanceRefreshing, setBalanceRefreshing] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [nftInfo, setNftInfo] = useState(null);
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

  // Initialize UMI when wallet is connected
  const umi = useMemo(() => {
    const umi = createUmi(connection);

    if (wallet.publicKey) {
      return umi.use(walletAdapterIdentity(wallet));
    }

    return umi;
  }, [connection, wallet]);

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

  // Fetch authorization status when wallet connects or changes
  useEffect(() => {
    const checkAuthorization = async () => {
      if (!connected || !walletAddress) {
        resetStates();
        return;
      }

      if (!isAuthenticated) {
        resetStates();
        return;
      }

      setIsLoading(true);
      resetErrorStates();

      try {
        const response = await api.get(
          `/check-authorization/${walletAddress}`,
        );

        if (response.data.authorized && response.data.nftInfo) {
          setIsAuthorized(true);
          setNftInfo(response.data.nftInfo);
          fetchMetadata(response.data.nftInfo.uri);

          if (response.data.existingReport) {
            setAlreadyReported(true);
          }
          // Set confirmation status and deadline
          if (response.data.nftInfo.confirmationStatus) {
            setIsConfirmed(
              response.data.nftInfo.confirmationStatus === "CONFIRMED",
            );
            setConfirmationDeadline(response.data.confirmationDeadline);
          } else {
            setIsConfirmed(false);
            setConfirmationDeadline(null);
          }

          if (!toastShownRef.current) {
            toast.success("Found credentials ready to review!");
            toastShownRef.current = true;
          }
        } else {
          setIsAuthorized(false);
          setNftInfo(null);
          setAuthorizationError(
            response.data.message || "No NFT allocation found for this wallet.",
          );
        }
      } catch (error) {
        console.error("Error checking authorization:", error);
        setIsAuthorized(false);
        setNftInfo(null);
        setAuthorizationError(
          error.response?.data?.message ||
            "Failed to check authorization. Please try again.",
        );
        toast.error("Failed to check credentials");
      } finally {
        setIsLoading(false);
      }
    };

    const resetStates = () => {
      setIsAuthorized(false);
      setNftInfo(null);
      setAuthorizationError("");
      setIsLoading(false);
      setMintSuccess(false);
      setMintedNft(null);
      setMintError("");
      setConfirmationDeadline(null);
      setTimeRemaining(null);
      setIsConfirmed(false);
    };

    const resetErrorStates = () => {
      setAuthorizationError("");
      setMintSuccess(false);
      setMintedNft(null);
      setMintError("");
    };

    checkAuthorization();

    if (connected && walletAddress) {
      fetchMintedNFTs();
      checkWalletBalance(); // Initial balance check

      const balanceInterval = setInterval(() => checkWalletBalance(), 5000); // Refresh every 5 seconds
      return () => clearInterval(balanceInterval); // Cleanup interval
    }
  }, [connected, walletAddress, isAuthenticated]);

  const handleConfirm = async () => {
    if (!walletAddress || !nftInfo) return;

    if (alreadyReported) {
      toast.error("You have already reported an issue for this credential.");
      return;
    }

    setIsSavingChanges(true);

    try {
      const response = await api.post("/confirm-nft-credential", {
        walletAddress,
        nftId: nftInfo._id,
        revision: nftInfo.revision,
      });

      if (response.data.success) {
        setIsConfirmed(true);
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

  // Handle Minting using UMI directly in the frontend
  const handleMintNft = async () => {
    const minimumBalance = 0.01;

    // Check if UMI, publicKey, and nftInfo are available
    if (!umi || !publicKey || !nftInfo || !nftInfo.uri || !nftInfo.name) {
      setMintError(
        "Cannot mint: Missing wallet connection, UMI instance, or NFT metadata",
      );
      toast.error("Missing required information for minting");
      return;
    }

    // Check wallet balance & Forward to faucet if insufficient
    if (walletBalance < minimumBalance) {
      toast(
        (t) => (
          <div className="flex items-center justify-between w-full  p-1">
            <div className="flex-1">
              <p className="font-bold text-red-600">Insufficient Balance</p>
              <p className="text-m text-ink">
                You need minimum ~{minimumBalance} Devnet SOL for minting. Your
                balance: {walletBalance} SOL
              </p>
            </div>

            <Button
              onClick={() => {
                navigate("/faucet");
                toast.dismiss(t.id);
              }}
              className="ml-4 !py-1.5 !px-3 hover:bg-cobalt bg-cobalt text-paper hover:cursor-pointer"
            >
              Go to Faucet
            </Button>
          </div>
        ),
        {
          duration: 3000,
          id: "insufficient-balance-toast", // Prevent duplicate toasts
        },
      );
      return;
    }

    setIsMinting(true);
    setMintError("");
    setMintSuccess(false);
    setMintedNft(null);

    // Show toast for starting mint process
    const mintToastId = toast.loading("Minting your credential NFT...");

    try {
      await umi.use(mplTokenMetadata());

      const mint = generateSigner(umi);

      const { signature } = await createNft(umi, {
        mint: mint,
        name: nftInfo.name,
        symbol: nftInfo.symbol,
        uri: nftInfo.uri,
        sellerFeeBasisPoints: 500, // 5% royalty
        creators: [
          {
            address: publicKey,
            verified: true,
            share: 100,
          },
        ],
      }).sendAndConfirm(umi, { confirm: { commitment: "confirmed" } });

      const mintedNftData = {
        address: mint.publicKey.toString(),
        signature: signature.toString(),
        name: nftInfo.name,
        symbol: nftInfo.symbol || "CRED",
        uri: nftInfo.uri,
        dateIssued: new Date().toISOString(),
      };

      setMintSuccess(true);
      setMintedNft(mintedNftData);
      setIsAuthorized(false);

      // Update toast to success
      toast.success("NFT minted successfully!", { id: mintToastId });

      // Notify backend about successful mint
      try {
        await api.post("/confirm-mint", {
          walletAddress: walletAddress,
          nft_Mint_Address: mint.publicKey.toString(),
          nftId: nftInfo._id,
          revision: nftInfo.revision,
        });
        console.log("Backend notified of successful mint.");
      } catch (backendError) {
        console.error("Failed to notify backend:", backendError);
        toast.warning("Minting succeeded, but failed to update server status");
      }

      // Refresh minted NFTs list
      fetchMintedNFTs();
    } catch (err) {
      console.error("Failed to mint NFT:", err);
      let errorMessage = "An error occurred during minting.";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setMintError(`Minting failed: ${errorMessage}`);
      toast.error("Failed to mint NFT", { id: mintToastId });
    } finally {
      setIsMinting(false);
    }
  };

  const fetchMintedNFTs = async () => {
    if (!walletAddress) return;

    setLoadingNfts(true);
    try {
      const response = await api.get(`/minted-nfts/${walletAddress}`);

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
    if (!walletAddress || !nftInfo || !issueDescription.trim()) {
      toast.error("Please provide a description of the issue");
      return;
    }

    setIsSendingIssue(true);

    try {
      // Fetch NFT data from Pinata
      const nftUriDataFromPinata = await fetch(nftInfo.uri);
      const nftUriData = await nftUriDataFromPinata.json();
      // console.log("NFT Data:", nftUriData);

      const response = await api.post("/report-issue", {
        //  institutionWallet: we need to extract this from the NFT uri or metadata. So Do it Later || Done (9.17PM , 19.06.2025)
        institutionWallet:
          nftUriData.properties.creators[0].institutionWalletAddress || "",
        studentWallet: walletAddress,
        nftIpfsHash: nftInfo.uri,
        reportType: "NFT Credential Issue",
        reportDetails: issueDescription.trim(),
      });

      console.log(
        "Institution Wallet:",
        nftUriData.properties.creators[0].institutionWalletAddress,
      );

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

  //Check user current wallet balance
  const checkWalletBalance = async () => {
    if (!walletAddress) {
      toast.error("Wallet not connected");
      return false;
    }
    setBalanceRefreshing(true);

    try {
      const balanceInLamports = await connection.getBalance(publicKey);
      const solBalance = balanceInLamports / 1_000_000_000; // Convert lamports to SOL
      setWalletBalance(solBalance.toFixed(3));
      return true; // Sufficient balance
    } catch (error) {
      console.error("Error checking wallet balance:", error);
      toast.error("Failed to check wallet balance");
      setWalletBalance(null);
      return false;
    } finally {
      setBalanceRefreshing(false);
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

  // Add function to fetch metadata
  const fetchMetadata = async (uri) => {
    if (!uri) return;

    setLoadingMetadata(true);
    try {
      const response = await fetch(uri);
      const data = await response.json();
      setMetadataDetails(data);
    } catch (error) {
      console.error("Error fetching metadata:", error);
      toast.error("Failed to load credential details");
    } finally {
      setLoadingMetadata(false);
    }
  };

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
            <span className="pill">
              Balance{" "}
              <span className="font-mono">
                {balanceRefreshing ? (
                  <Loader2 className="inline-block h-3 w-3 animate-spin" />
                ) : (
                  `${walletBalance} SOL`
                )}
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
          <span className="font-semibold text-green-800">NFT minted successfully!</span>
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
          <button
            type="button"
            className="success-link"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      )}

      {/* Credential to review / mint */}
      {isAuthorized && nftInfo && !mintSuccess && (
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
                    <dd>{nftInfo.name}</dd>
                  </div>
                  <div>
                    <dt>Symbol</dt>
                    <dd>{nftInfo.symbol || "CRED"}</dd>
                  </div>
                  <div>
                    <dt>Metadata URI</dt>
                    <dd>
                      <a
                        href={nftInfo.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="uri"
                      >
                        {nftInfo.uri}
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

                  {(isConfirmed || timeRemaining?.expired) && (
                    <Button
                      onClick={handleMintNft}
                      disabled={isMinting || !umi.identity}
                    >
                      {isMinting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Minting...
                        </>
                      ) : (
                        "Mint credential NFT"
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

                {!umi.identity && (
                  <p className="msg msg-warn">
                    <AlertCircle className="h-3.5 w-3.5" /> Wallet not fully
                    ready for signing. Please ensure it's connected and
                    initialized.
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
            Pending credentials: {nftInfo ? nftInfo.length : "None"}
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
            {isAuthorized && nftInfo && (
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
