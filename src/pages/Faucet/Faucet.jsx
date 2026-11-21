import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Copy, ExternalLink, Info, Loader2, RefreshCw, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import { SOLANA_CONNECTION } from "../../lib/solana";
import { WalletButton } from "../../components/WalletButton";
import "./Faucet.css";

// The public devnet RPC no longer airdrops (it answers 410 "faucet is closed"),
// so test SOL comes from Solana's web faucet instead.
const FAUCET_URL = "https://faucet.solana.com";
const MIN_BALANCE_FOR_MINT = 0.01;

export function Faucet() {
  const { connected, publicKey } = useWallet();
  const address = publicKey?.toBase58() || "";
  const [balance, setBalance] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!publicKey) return;
    setIsLoading(true);

    try {
      const lamports = await SOLANA_CONNECTION.getBalance(publicKey);
      setBalance(lamports / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error("Failed to fetch balance:", error);
      setBalance(null);
      toast.error("Could not fetch wallet balance");
    } finally {
      setIsLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    if (!connected || !publicKey) {
      setBalance(null);
      return;
    }

    fetchBalance();
    // Refresh when the user comes back from the faucet tab.
    window.addEventListener("focus", fetchBalance);
    return () => window.removeEventListener("focus", fetchBalance);
  }, [connected, publicKey, fetchBalance]);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success("Wallet address copied");
    } catch {
      toast.error("Could not copy the address");
    }
  };

  const hasEnough = balance !== null && balance >= MIN_BALANCE_FOR_MINT;

  return (
    <div className="faucet-page">
      <div>
        <h1 className="page-title">Devnet faucet</h1>
        <p className="page-sub">
          Get free test SOL on Solana devnet to pay the fee for minting a
          credential. Devnet SOL has no real value.
        </p>
      </div>

      <div className="layout">
        <section className="card">
          <h2 className="section-label">Your wallet</h2>

          {connected && publicKey ? (
            <div className="wallet-body">
              <div className="address-row">
                <code className="address">{address}</code>
                <button
                  type="button"
                  onClick={copyAddress}
                  className="btn-outline h-7 px-2.5 text-xs"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </button>
              </div>

              <div className="stats">
                <div className="stat">
                  <p className="stat-label">Balance</p>
                  <p className="stat-row">
                    <span className="stat-number">
                      {balance === null ? "—" : balance.toFixed(4)}
                    </span>
                    <span className="cell-sub">SOL</span>
                    <button
                      type="button"
                      onClick={fetchBalance}
                      disabled={isLoading}
                      className="refresh-btn"
                      aria-label="Refresh balance"
                    >
                      {isLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </p>
                </div>
                <div className="stat">
                  <p className="stat-label">Ready to mint</p>
                  <span className={`ready ${hasEnough ? "is-ready" : "is-low"}`}>
                    {hasEnough
                      ? "Yes"
                      : `Needs at least ${MIN_BALANCE_FOR_MINT} SOL`}
                  </span>
                </div>
              </div>

              <a
                href={FAUCET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full"
              >
                Open Solana faucet
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : (
            <div className="connect">
              <Wallet className="h-6 w-6 text-ink/40" />
              <p className="cell-sub">
                Connect your wallet to see its address and balance.
              </p>
              <WalletButton />
            </div>
          )}
        </section>

        <aside className="card">
          <h2 className="help-title">
            <Info className="h-3.5 w-3.5 text-cobalt" />
            How to get test SOL
          </h2>
          <ol className="help-steps">
            <li>Connect your wallet and copy its address.</li>
            <li>Open the Solana faucet in a new tab.</li>
            <li>Paste the address, choose <strong>devnet</strong> and request SOL.</li>
            <li>Come back here; your balance refreshes automatically.</li>
          </ol>
          <p className="help-note">
            The Solana faucet may ask you to sign in with GitHub and limits how
            often you can request. Make sure your wallet is also set to devnet.
          </p>
        </aside>
      </div>
    </div>
  );
}
