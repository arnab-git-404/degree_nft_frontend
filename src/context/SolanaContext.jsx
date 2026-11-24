import { createContext, useContext, useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

// Wallet connection state and the IPFS hash of the credential being issued.
// Minting is done by the backend (Metaplex Core, POST /student/credentials/claim), never in the browser.
const SolanaContext = createContext(null);

const isValidPublicKey = (address) => {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
};

export function SolanaProvider({ children }) {
  const wallet = useWallet();
  const [connected, setConected] = useState(false);
  const [publicKey, setPublicKey] = useState(null);
  const [currentIpfsHash, setCurrentIpfsHash] = useState(null);

  useEffect(() => {
    setConected(wallet.connected);
    setPublicKey(wallet.publicKey?.toString() || null);
  }, [wallet.connected, wallet.publicKey]);

  const value = {
    connected,
    setConected,
    publicKey,
    setPublicKey,
    isValidPublicKey,
    setCurrentIpfsHash,
    currentIpfsHash,
    isLoading: false,
  };

  return <SolanaContext.Provider value={value}>{children}</SolanaContext.Provider>;
}

export function useSolana() {
  const context = useContext(SolanaContext);
  if (!context) {
    throw new Error("useSolana must be used within a SolanaProvider");
  }
  return context;
}
