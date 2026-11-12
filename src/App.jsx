import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { Layout } from "./components/Layout";
import AppRoutes from "./AppRoutes";
import { SolanaProvider } from "./context/SolanaContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

const App = () => {
  // Set up Solana testnet connection
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = clusterApiUrl(network);
  const wallets = [new PhantomWalletAdapter()];

  return (
    <>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <SolanaProvider>
              <AuthProvider>
                <Router>
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
