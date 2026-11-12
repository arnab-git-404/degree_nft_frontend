import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Copy, ExternalLink, Info, Loader2, RefreshCw, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import { SOLANA_CONNECTION } from "../lib/solana";
import { WalletButton } from "../components/WalletButton";

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
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Devnet faucet</h1>
        <p className="mt-1 text-sm text-ink/60">
          Get free test SOL on Solana devnet to pay the fee for minting a
          credential. Devnet SOL has no real value.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <section className="panel p-5">
          <h2 className="text-sm font-semibold">Your wallet</h2>

          {connected && publicKey ? (
            <div className="mt-4 space-y-5">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-xs text-ink/55">Address</dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate rounded-md bg-paper px-2.5 py-1.5 font-mono text-xs">
                      {address}
                    </code>
                    <button
                      type="button"
                      onClick={copyAddress}
                      className="btn-outline h-8 px-3"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </button>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink/55">Balance</dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <span className="text-2xl font-semibold tabular-nums">
                      {balance === null ? "—" : balance.toFixed(4)}
                    </span>
                    <span className="text-sm text-ink/55">SOL</span>
                    <button
                      type="button"
                      onClick={fetchBalance}
                      disabled={isLoading}
                      className="ml-1 rounded-md p-1.5 text-ink/55 hover:bg-paper hover:text-ink disabled:opacity-50"
                      aria-label="Refresh balance"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </button>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink/55">Ready to mint</dt>
                  <dd className="mt-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        hasEnough
                          ? "bg-green-600/10 text-green-700"
                          : "bg-yellow-500/15 text-yellow-800"
                      }`}
                    >
                      {hasEnough
                        ? "Yes"
                        : `Needs at least ${MIN_BALANCE_FOR_MINT} SOL`}
                    </span>
                  </dd>
                </div>
              </dl>

              <a
                href={FAUCET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full"
              >
                Open Solana faucet
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-3 rounded-md bg-paper py-8 text-center">
              <Wallet className="h-8 w-8 text-ink/40" />
              <p className="text-sm text-ink/60">
                Connect your wallet to see its address and balance.
              </p>
              <WalletButton />
            </div>
          )}
        </section>

        <aside className="panel p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Info className="h-4 w-4 text-cobalt" />
            How to get test SOL
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm text-ink/70">
            <li>Connect your wallet and copy its address.</li>
            <li>Open the Solana faucet in a new tab.</li>
            <li>Paste the address, choose <strong>devnet</strong> and request SOL.</li>
            <li>Come back here; your balance refreshes automatically.</li>
          </ol>
          <p className="mt-4 text-xs leading-5 text-ink/50">
            The Solana faucet may ask you to sign in with GitHub and limits how
            often you can request. Make sure your wallet is also set to devnet.
          </p>
        </aside>
      </div>
    </div>
  );
}
