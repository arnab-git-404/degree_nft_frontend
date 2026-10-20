import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { Layout } from "./components/Layout";
import "@solana/wallet-adapter-react-ui/styles.css";
import AppRoutes from "./AppRoutes";
import { Toaster } from "react-hot-toast";
import { SolanaProvider } from "./context/SolanaContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { Buffer } from "buffer";

if (typeof window !== "undefined") {
  window.Buffer = Buffer;
}

const App = () => {
  // Set up Solana testnet connection
  const network = WalletAdapterNetwork.Testnet;
  const endpoint = clusterApiUrl(network);
  const wallets = [new PhantomWalletAdapter()];

  return (
    <>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <Toaster />

            <SolanaProvider>
              <AuthProvider>
                <Router>
                  <Toaster />
                  <Layout>
                    <AppRoutes />
                  </Layout>
                </Router>
              </AuthProvider>
            </SolanaProvider>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </>
  );
};

export default App;
