import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { SOLANA_RPC_URL } from "./lib/solana";
import { Layout } from "./components/Layout";
import AppRoutes from "./AppRoutes";
import { SolanaProvider } from "./context/SolanaContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

const App = () => {
  const endpoint = SOLANA_RPC_URL; // VITE_SOLANA_NETWORK / VITE_SOLANA_RPC_URL
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
