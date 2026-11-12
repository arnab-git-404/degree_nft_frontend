import { createContext, useContext, useState, useEffect, useMemo } from "react";
import {
  createNft,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";

import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, clusterApiUrl, PublicKey } from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { generateSigner, percentAmount } from "@metaplex-foundation/umi";




const SolanaContext = createContext(null);

export function SolanaProvider({ children }) {
  const wallet = useWallet();
  const connection = new Connection(clusterApiUrl("devnet"));

  const [connected, setConected] = useState(false);
  const [publicKey, setPublicKey] = useState(null);
  const [currentIpfsHash, setCurrentIpfsHash] = useState(null);
  const [mintedNft, setMintedNft] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize UMI when wallet is connected - FIXED
  const umi = useMemo(() => {
    const umi = createUmi(connection);

    if (wallet.publicKey) {
      // Use walletAdapterIdentity instead of signerIdentity
      return umi.use(walletAdapterIdentity(wallet));
    }

    return umi;
  }, [connection, wallet]);

  // Update connected state when wallet changes
  useEffect(() => {
    if (wallet) {
      setConected(wallet.connected);
      setPublicKey(wallet.publicKey?.toString() || null);
    }
  }, [wallet.connected, wallet.publicKey]);

  
  const isValidPublicKey = (address) => {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  };

  console.log("this is PublicKEy", publicKey);
  console.log("This is curremt Hash: " + currentIpfsHash);


  // Create NFT using the IPFS hash
  const createNftFromIpfs = async (nftname) => {

    if (!currentIpfsHash || !wallet.publicKey) {
      setError("IPFS hash or wallet not available");
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Prepare the NFT metadata
      // const metadataUri = `https://gateway.pinata.cloud/ipfs/${currentIpfsHash}`;
      const metadataUri = `https://ipfs.io/ipfs/${currentIpfsHash}`;

      const mint = generateSigner(umi);

      // Create the NFT
      await umi.use(mplTokenMetadata());
      const { signature } = await createNft(umi, {
        mint,
        name: nftname,
        symbol: "DegreeNFT",
        uri: metadataUri,
        maxSupply: 1,
        sellerFeeBasisPoints: percentAmount(0),
        creators: [
          {
            address: publicKey,
            share: 100,
            verified: true,
          },
        ],
      }).sendAndConfirm(umi);

      // Store the minted NFT details
      const mintedNftData = {
        address: mint.publicKey,
        signature,
        metadataUri,
      };

      setMintedNft(mintedNftData);
      console.log(mintedNft);
      return mintedNftData;
    } catch (err) {
      console.error("Failed to create NFT:", err);
      setError(`Failed to create NFT: ${err.message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };



  // Get Solana Explorer link for the NFT
  const getNftExplorerLink = (type = "address") => {
    if (!mintedNft) return null;

    const cluster = "devnet";

    try {
      // Make sure we're working with string values
      const addressString = mintedNft.address.toString();
      const signatureString = mintedNft.signature.toString();

      // Manually construct explorer URLs to avoid any formatting issues
      if (type === "address") {
        return `https://explorer.solana.com/address/${addressString}?cluster=${cluster}`;
      } else if (type === "transaction") {
        return `https://explorer.solana.com/tx/${signatureString}?cluster=${cluster}`;
      }
      return null;
    } catch (error) {
      console.error("Error creating explorer link:", error);
      return null;
    }
  };

  const value = {
    connected,
    setConected,
    publicKey,
    setPublicKey,
    isValidPublicKey,
    setCurrentIpfsHash,
    currentIpfsHash,
    createNftFromIpfs,
    mintedNft,
    getNftExplorerLink,
    isLoading,
    error,
  };

  return (
    <SolanaContext.Provider value={value}>{children}</SolanaContext.Provider>
  );
}

// Custom hook to use the Solana context
export function useSolana() {
  const context = useContext(SolanaContext);
  if (!context) {
    throw new Error("useSolana must be used within a SolanaProvider");
  }
  return context;
}
