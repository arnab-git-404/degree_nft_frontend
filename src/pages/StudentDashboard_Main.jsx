import React, { useState, useEffect, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, clusterApiUrl } from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import {
  createNft,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { generateSigner, percentAmount } from "@metaplex-foundation/umi";
import {
  UserCheck,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle,
  Award,
  Calendar,
  School
} from "lucide-react";
import { shortenAddress } from "../lib/utils";

import { Button } from "../components/Button";
import axios from "axios";
import toast from "react-hot-toast";

const API_BASE_URL = import.meta.env.VITE_APP_SERVER_URL;

export function StudentDashboard() {
  const wallet = useWallet();
  const connection = new Connection(clusterApiUrl("devnet"));

  const { connected, publicKey } = wallet;
  
  const walletAddress = publicKey?.toBase58();

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

  // Initialize UMI when wallet is connected
  const umi = useMemo(() => {
    const umi = createUmi(connection);

    if (wallet.publicKey) {
      return umi.use(walletAdapterIdentity(wallet));
    }

    return umi;
  }, [connection, wallet]);

  // Fetch authorization status when wallet connects or changes
  useEffect(() => {
    const checkAuthorization = async () => {
      if (!connected || !walletAddress) {
        setIsAuthorized(false);
        setNftInfo(null);
        setAuthorizationError("");
        setIsLoading(false);
        setMintSuccess(false);
        setMintedNft(null);
        setMintError("");
        return;
      }

      setIsLoading(true);
      setAuthorizationError("");
      setMintSuccess(false);
      setMintedNft(null);
      setMintError("");

      try {
        const response = await axios.get(
          `${API_BASE_URL}/check-authorization/${walletAddress}`
        );

        if (response.data.authorized && response.data.nftInfo) {
          setIsAuthorized(true);
          setNftInfo(response.data.nftInfo);
          toast.success("Found credentials ready to mint!");
        } else {
          setIsAuthorized(false);
          setNftInfo(null);
          setAuthorizationError(
            response.data.message || "No NFT allocation found for this wallet."
          );
        }
      } catch (error) {
        console.error("Error checking authorization:", error);
        setIsAuthorized(false);
        setNftInfo(null);
        setAuthorizationError(
          error.response?.data?.message || "Failed to check authorization. Please try again."
        );
        toast.error("Failed to check credentials");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthorization();
    if (connected && walletAddress) {
      fetchMintedNFTs();
    }
  }, [connected, walletAddress]);

  // Handle Minting using UMI directly in the frontend
  const handleMintNft = async () => {
    if (!umi || !publicKey || !nftInfo || !nftInfo.uri || !nftInfo.name) {
      setMintError("Cannot mint: Missing wallet connection, UMI instance, or NFT metadata");
      toast.error("Missing required information for minting");
      return;
    }

    setIsMinting(true);
    setMintError("");
    setMintSuccess(false);
    setMintedNft(null);

    // Show toast for starting mint process
    const mintToastId = toast.loading("Minting your credential NFT...");

    try {
      const mint = generateSigner(umi);
      
      await umi.use(mplTokenMetadata());
      const { signature } = await createNft(umi, {
        mint: mint, 
        name: nftInfo.name,
        symbol: nftInfo.symbol,
        uri: nftInfo.uri,
        sellerFeeBasisPoints: percentAmount(0),
        creators: [
          { 
            address: publicKey,
            verified: true, 
            share: 100 
          }
        ],
      }).sendAndConfirm(umi, { confirm: { commitment: "confirmed" } });

      const mintedNftData = {
        address: mint.publicKey.toString(),
        signature: signature.toString(),
        name: nftInfo.name,
        symbol: nftInfo.symbol || "CRED",
        uri: nftInfo.uri,
        dateIssued: new Date().toISOString()
      };

      setMintSuccess(true);
      setMintedNft(mintedNftData);
      setIsAuthorized(false);
      
      // Update toast to success
      toast.success("NFT minted successfully!", { id: mintToastId });

      // Notify backend about successful mint
      try {
        await axios.post(`${API_BASE_URL}/confirm-mint`, {
          walletAddress: walletAddress,
          nft_Mint_Address: mint.publicKey.toString(),
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
      const response = await axios.get(`${API_BASE_URL}/minted-nfts/${walletAddress}`);
      
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

  // Render loading state for authorization check
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Loader2 className="h-12 w-12 animate-spin text-cobalt" />
        <p className="mt-4 text-ink/60">Checking your credentials...</p>
      </div>
    );
  }

  // Render disconnected state
  if (!connected) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <UserCheck className="h-16 w-16 text-cobalt" />
        <h2 className="mt-4 text-2xl font-bold">Student Dashboard</h2>
        <p className="mt-2 text-ink/60">
          Connect your wallet to view your credentials
        </p>
      </div>
    );
  }

  // Render connected state
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Credentials</h2>
          <p className="mt-1 text-ink/60">
            Connected as: <span className="font-mono">{shortenAddress(walletAddress || "")}</span>
          </p>
        </div>
        <Button 
          onClick={fetchMintedNFTs} 
          variant="outline"
          className="cursor-pointer"
        >
          Refresh NFTs
        </Button>
      </div>

      {/* Display Mint Success Message */}
      {mintSuccess && mintedNft && (
        <div className="rounded-none border border-green-600 bg-green-600/10 p-4 animate-fadeIn">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-700" />
            <div>
              <p className="font-medium text-green-700">
                NFT Minted Successfully!
              </p>
              <div className="mt-2 flex space-x-4">
                <a
                  href={getNftExplorerLink(mintedNft.address, mintedNft.signature, "address")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-green-700 hover:text-green-800 underline cursor-pointer"
                >
                  View NFT <ExternalLink className="ml-1 h-4 w-4" />
                </a>
                <a
                  href={getNftExplorerLink(mintedNft.address, mintedNft.signature, "transaction")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-green-700 hover:text-green-800 underline cursor-pointer"
                >
                  View Transaction <ExternalLink className="ml-1 h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Display Available NFT to Mint */}
      {isAuthorized && nftInfo && !mintSuccess && (
        <div className="rounded-none border border-cobalt bg-cobalt/5 p-6 shadow-[8px_8px_0_0_rgba(17,16,14,0.10)] hover:shadow-[8px_8px_0_0_rgba(17,16,14,0.10)] transition-all">
          <h3 className="text-xl font-semibold text-cobalt">
            <Award className="inline-block mr-2 h-5 w-5" />
            Credential Ready to Mint
          </h3>
          <div className="mt-4 space-y-2 text-ink/70">
            <p>
              <span className="font-medium text-ink">Name:</span>{" "}
              {nftInfo.name}
            </p>
            <p>
              <span className="font-medium text-ink">Symbol:</span>{" "}
              {nftInfo.symbol || "CRED"}
            </p>
            <p>
              <span className="font-medium text-ink">Metadata URI:</span>{" "}
              <a 
                href={nftInfo.uri} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="underline hover:text-cobalt break-all cursor-pointer"
              >
                {nftInfo.uri}
              </a>
            </p>
          </div>
          <div className="mt-6">
            <Button
              onClick={handleMintNft}
              disabled={isMinting || !umi.identity}
              className="w-full sm:w-auto cursor-pointer hover:bg-ink transition-colors"
            >
              {isMinting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Minting...
                </>
              ) : (
                "Mint My Credential NFT"
              )}
            </Button>
            {mintError && (
              <p className="mt-3 text-sm text-red-700 flex items-center">
                <AlertCircle className="mr-1 h-4 w-4" /> {mintError}
              </p>
            )}
            {!umi.identity && (
              <p className="mt-3 text-sm text-yellow-700 flex items-center">
                <AlertCircle className="mr-1 h-4 w-4" /> Wallet not fully ready for signing. Please ensure it's connected and initialized.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Display if not authorized or no allocation found */}
      {!isAuthorized && !isLoading && !mintSuccess && (
        <div className="rounded-none border border-ink/20 bg-paper-soft p-6">
          <h3 className="text-xl font-semibold flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-ink/60" />
            Pending Credentials 
          </h3>
          <div className="mt-4">
            <p className="text-ink/60">
              {authorizationError ||
                "No pending credentials found for your wallet, or they have already been minted."}
            </p>
          </div>
        </div>
      )}

      {/* Section for already minted NFTs */}
      <div className="rounded-none border border-ink/20 bg-paper-soft p-6">
        <h3 className="text-xl font-semibold flex items-center">
          <School className="mr-2 h-5 w-5 text-ink" />
          My Minted Credentials
        </h3>
        
        {loadingNfts ? (
          <div className="flex justify-center my-8">
            <Loader2 className="h-8 w-8 animate-spin text-cobalt" />
          </div>
        ) : mintedNfts.length > 0 ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {mintedNfts.map((nft, index) => (
              <div 
                key={index} 
                className="rounded-none border border-ink/20 bg-paper-soft p-5 hover:border-cobalt hover:shadow-[4px_4px_0_0_rgba(17,16,14,0.08)] transition-all cursor-pointer"
              >
                {nft.image && (
                  <div className="h-40 w-full overflow-hidden rounded-none mb-4 bg-paper-deep">
                    <img 
                      src={nft.image} 
                      alt={nft.name} 
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.target.src = "/api/placeholder/320/180";
                        e.target.alt = "Failed to load image";
                      }} 
                    />
                  </div>
                )}
                <h4 className="text-lg font-medium text-cobalt">{nft.name}</h4>
                <p className="text-sm text-ink/60 mt-1">{nft.symbol}</p>
                
                {nft.allocatedAt && (
                  <p className="text-xs text-ink/45 mt-2 flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    Issued: {new Date(nft.allocatedAt).toLocaleDateString()}
                  </p>
                )}

                {nft.mintedAt && (
                  <p className="text-xs text-ink/45 mt-2 flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    Minted : {new Date(nft.mintedAt).toLocaleDateString()}
                  </p>
                )}
                
                <div className="mt-4 flex space-x-2">
                  <a
                    href={getNftExplorerLink(nft.nftAddress, nft.signature, "address")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cobalt hover:text-cobalt underline flex items-center"
                    onClick={() =>{
                      console.log("clicked" )
                    }}
                  >
                    View <ExternalLink className="ml-0.5 h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-8 text-ink/60">
            <Award className="h-12 w-12 text-ink/50 mb-3" />
            <p>You haven't minted any credential NFTs yet.</p>
            {isAuthorized && nftInfo && (
              <p className="mt-2 text-cobalt">
                You have a credential ready to mint above!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}