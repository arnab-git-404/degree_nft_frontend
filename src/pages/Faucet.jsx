
// Type 1 
import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Button } from '../components/Button';
import { Loader2, ExternalLink, Droplet, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export function Faucet() {
  const { connected, publicKey } = useWallet();
  const [isRequesting, setIsRequesting] = useState(false);
  const [signature, setSignature] = useState('');
  const [balance, setBalance] = useState(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);

  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

  const fetchBalance = useCallback(async () => {
    if (!publicKey) return;
    setIsBalanceLoading(true);
    try {
      const lamports = await connection.getBalance(publicKey);
      setBalance(lamports / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error("Failed to fetch balance:", error);
      setBalance(null);
      toast.error("Could not fetch wallet balance.");
    } finally {
      setIsBalanceLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    if (connected && publicKey) {
      fetchBalance();
    } else {
      setBalance(null); // Reset balance when disconnected
    }
  }, [connected, publicKey, fetchBalance]);

  const handleRequestAirdrop = async () => {
    if (!publicKey) {
      toast.error('Please connect your wallet first.');
      return;
    }

    setIsRequesting(true);
    setSignature('');
    const toastId = toast.loading('Requesting airdrop...');

    try {
      const airdropSignature = await connection.requestAirdrop(
        publicKey,
        LAMPORTS_PER_SOL // Request 1 SOL
      );

      await connection.confirmTransaction(airdropSignature, 'confirmed');

      setSignature(airdropSignature);
      toast.success('Airdrop successful! Your balance will update shortly.', { id: toastId });
      // Refresh balance after a short delay
      setTimeout(fetchBalance, 2000);

      await new Promise(resolve => setTimeout(resolve, 2000)); 
      toast.success('Balance updated!', { id: toastId });

    } catch (error) {
      console.error('Airdrop failed:', error);
      let errorMessage = 'Airdrop failed. Please try again later.';
      if (error instanceof Error && error.message.includes('429')) {
          errorMessage = 'Too many requests. The devnet faucet is busy. Please wait before requesting again.';
      }
      toast.error(errorMessage, { id: toastId, duration: 5000 });
    } finally {
      setIsRequesting(false);
    }
  };

  const getExplorerLink = (sig) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="text-center">
        <Droplet className="mx-auto h-12 w-12 text-cobalt" />
        
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Solana Devnet Faucet</h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-ink/60">
          Get free devnet SOL to pay for transaction fees while testing the application in a development environment.
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Info */}
        <div className="space-y-6 p-6 rounded-none border border-ink/20 bg-paper-soft">
          <div className="flex items-start">
            <Info className="h-6 w-6 text-blue-700 flex-shrink-0 mr-3 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-ink">What is a Faucet?</h3>
              <p className="mt-1 text-ink/60">
                A faucet provides developers with a small amount of free cryptocurrency for testing on non-production networks like 'devnet'. It mimics real network transactions without using real money.
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <CheckCircle className="h-6 w-6 text-green-700 flex-shrink-0 mr-3 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-ink">How to Use</h3>
              <p className="mt-1 text-ink/60">
                1. Connect your Solana wallet.<br/>
                2. Click the "Request 1 Devnet SOL" button.<br/>
                3. Wait for the transaction to be confirmed.<br/>
                4. Your balance will update automatically.
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <AlertTriangle className="h-6 w-6 text-yellow-700 flex-shrink-0 mr-3 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-ink">Faucet Not Working?</h3>
              <p className="mt-1 text-ink/60">
                Devnet faucets can sometimes be slow or unavailable due to high demand. If you encounter an error, please wait a few minutes before trying again.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Interaction */}
        <div className="p-6 rounded-none border border-ink/20 bg-paper-soft">
          {connected && publicKey ? (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-ink">Your Wallet</h3>
                <div className="mt-2 p-3 bg-paper-deep rounded-none space-y-2">
                  <div>
                    <p className="text-sm text-ink/60">Status</p>
                    <p className="font-medium text-green-700">Connected</p>
                  </div>
                  <div>
                    <p className="text-sm text-ink/60">Address</p>
                    <p className="font-mono text-ink break-all text-sm">{publicKey.toBase58()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-ink/60">Balance</p>
                    <p className="font-mono text-ink">
                      {isBalanceLoading ? 'Loading...' : balance !== null ? `${balance.toFixed(4)} SOL` : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleRequestAirdrop}
                disabled={isRequesting || isBalanceLoading}
                className="w-full cursor-pointer"
              >
                {isRequesting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Requesting...</>
                ) : (
                  'Request 1 Devnet SOL'
                )}
              </Button>

              {signature && (
                <div className="mt-4 p-3 bg-green-600/10 border border-green-600 rounded-none animate-fadeIn">
                  <p className="text-green-700 font-medium">Airdrop Confirmed!</p>
                  <a
                    href={getExplorerLink(signature)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-green-700 hover:text-green-800 underline break-all flex items-center"
                  >
                    View Transaction <ExternalLink className="ml-1.5 h-4 w-4" />
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center flex flex-col items-center justify-center h-full">
              <AlertTriangle className="h-10 w-10 text-yellow-700" />
              <p className="mt-4 text-lg font-medium text-ink">Wallet Not Connected</p>
              <p className="mt-1 text-ink/60">Please connect your wallet to use the faucet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}




// Type 2 
// import React, { useState, useEffect, useCallback, useMemo } from 'react';
// import { useWallet } from '@solana/wallet-adapter-react';
// import { Connection, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
// import { Button } from '../components/Button';
// import { Loader2, ExternalLink, Droplet, Copy, RefreshCw, History, AlertTriangle } from 'lucide-react';
// import toast from 'react-hot-toast';

// const AirdropAmountOptions = [0.5, 1, 2];
// const FAUCET_COOLDOWN_SECONDS = 30;

// export function Faucet() {
//   const { connected, publicKey } = useWallet();
//   const [isRequesting, setIsRequesting] = useState(false);
//   const [balance, setBalance] = useState(null);
//   const [isBalanceLoading, setIsBalanceLoading] = useState(false);
//   const [airdropAmount, setAirdropAmount] = useState(1);
//   const [txHistory, setTxHistory] = useState([]);
//   const [cooldown, setCooldown] = useState(0);

//   const connection = useMemo(() => new Connection(clusterApiUrl('devnet'), 'confirmed'), []);

//   // Cooldown timer effect
//   useEffect(() => {
//     if (cooldown <= 0) return;
//     const timer = setInterval(() => {
//       setCooldown(prev => prev - 1);
//     }, 1000);
//     return () => clearInterval(timer);
//   }, [cooldown]);

//   // Load transaction history from localStorage
//   useEffect(() => {
//     if (publicKey) {
//       const history = localStorage.getItem(`txHistory_${publicKey.toBase58()}`);
//       if (history) setTxHistory(JSON.parse(history));
//     }
//   }, [publicKey]);

//   const fetchBalance = useCallback(async (showToast = false) => {
//     if (!publicKey) return;
//     setIsBalanceLoading(true);
//     try {
//       const lamports = await connection.getBalance(publicKey);
//       setBalance(lamports / LAMPORTS_PER_SOL);
//       if (showToast) toast.success("Balance updated!");
//     } catch (error) {
//       console.error("Failed to fetch balance:", error);
//       setBalance(null);
//       toast.error("Could not fetch wallet balance.");
//     } finally {
//       setIsBalanceLoading(false);
//     }
//   }, [publicKey, connection]);

//   useEffect(() => {
//     if (connected && publicKey) {
//       fetchBalance();
//     } else {
//       setBalance(null);
//       setTxHistory([]);
//     }
//   }, [connected, publicKey, fetchBalance]);

//   const handleRequestAirdrop = async () => {
//     if (!publicKey || cooldown > 0) return;
//     setIsRequesting(true);
//     const toastId = toast.loading(`Requesting ${airdropAmount} SOL...`);
//     try {
//       const signature = await connection.requestAirdrop(publicKey, airdropAmount * LAMPORTS_PER_SOL);
//       await connection.confirmTransaction(signature, 'confirmed');
      
//       const newHistory = [{ sig: signature, time: new Date().toISOString() }, ...txHistory].slice(0, 5);
//       setTxHistory(newHistory);
//       localStorage.setItem(`txHistory_${publicKey.toBase58()}`, JSON.stringify(newHistory));

//       toast.success('Airdrop successful!', { id: toastId });
//       setTimeout(() => fetchBalance(), 1000);
//     } catch (error) {
//       console.error('Airdrop failed:', error);
//       let errorMessage = 'Airdrop failed. Please try again.';
//       if (error instanceof Error && error.message.includes('429')) {
//         errorMessage = 'Faucet is rate-limited. Please wait before requesting again.';
//       }
//       toast.error(errorMessage, { id: toastId, duration: 5000 });
//     } finally {
//       setIsRequesting(false);
//       setCooldown(FAUCET_COOLDOWN_SECONDS);
//     }
//   };

//   const handleCopyToClipboard = () => {
//     if (publicKey) {
//       navigator.clipboard.writeText(publicKey.toBase58());
//       toast.success('Address copied!');
//     }
//   };

//   const getExplorerLink = (sig) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

//   return (
//     <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
//       <div className="text-center">
//         <Droplet className="mx-auto h-12 w-12 text-cobalt" />
//         <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Solana Devnet Faucet</h1>
//         <p className="mt-4 text-ink/60">Get free devnet SOL for testing purposes.</p>
//       </div>

//       {connected && publicKey ? (
//         <div className="space-y-8">
//           {/* Wallet Status */}
//           <div className="p-6 rounded-none border border-ink/20 bg-paper-soft">
//             <h3 className="font-semibold text-ink mb-4 text-lg">Wallet Status</h3>
//             <div className="space-y-3">
//               <div className="flex justify-between items-center">
//                 <span className="text-sm text-ink/60">Address</span>
//                 <div className="flex items-center gap-2">
//                   <span className="font-mono text-sm text-ink">{`${publicKey.toBase58().slice(0, 6)}...${publicKey.toBase58().slice(-6)}`}</span>
//                   <Copy className="h-4 w-4 text-ink/60 hover:text-ink cursor-pointer" onClick={handleCopyToClipboard} />
//                 </div>
//               </div>
//               <div className="flex justify-between items-center">
//                 <span className="text-sm text-ink/60">Balance</span>
//                 <div className="flex items-center gap-2">
//                   <span className="font-mono text-ink">{balance !== null ? `${balance.toFixed(4)} SOL` : 'N/A'}</span>
//                   <RefreshCw 
//                     className={`h-4 w-4 text-ink/60 hover:text-ink cursor-pointer ${isBalanceLoading ? 'animate-spin' : ''}`} 
//                     onClick={() => fetchBalance(true)} 
//                   />
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Faucet Controls */}
//           <div className="p-6 rounded-none border border-ink/20 bg-paper-soft">
//             <h3 className="font-semibold text-ink mb-4 text-lg">Request Funds</h3>
//             <div className="mb-4">
//               <label className="text-sm text-ink/60 mb-2 block">Amount</label>
//               <div className="flex bg-ink/60 rounded-none p-1">
//                 {AirdropAmountOptions.map(amount => (
//                   <button key={amount} onClick={() => setAirdropAmount(amount)} className={`w-full text-center text-sm font-medium py-2 rounded-none transition-colors ${airdropAmount === amount ? 'bg-cobalt text-paper' : 'text-ink/70 hover:bg-paper-deep'}`}>
//                     {amount} SOL
//                   </button>
//                 ))}
//               </div>
//             </div>
//             <Button onClick={handleRequestAirdrop} disabled={isRequesting || cooldown > 0} className="w-full">
//               {isRequesting ? (
//                 <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Requesting...</>
//               ) : cooldown > 0 ? (
//                 `On Cooldown (${cooldown}s)`
//               ) : (
//                 `Request ${airdropAmount} SOL`
//               )}
//             </Button>
//           </div>

//           {/* Transaction History */}
//           {txHistory.length > 0 && (
//             <div className="p-6 rounded-none border border-ink/20 bg-paper-soft">
//               <h3 className="font-semibold text-ink mb-4 text-lg flex items-center"><History className="mr-2 h-5 w-5"/>Recent Airdrops</h3>
//               <div className="space-y-3">
//                 {txHistory.map(({ sig, time }) => (
//                   <a key={sig} href={getExplorerLink(sig)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between text-sm font-mono text-blue-700 hover:text-blue-700 transition-colors">
//                     <div className="truncate pr-4">
//                       <p className="truncate">{sig}</p>
//                       <p className="text-xs text-ink/45">{new Date(time).toLocaleString()}</p>
//                     </div>
//                     <ExternalLink className="h-4 w-4 ml-2 flex-shrink-0"/>
//                   </a>
//                 ))}
//               </div>
//             </div>
//           )}
//         </div>
//       ) : (
//         <div className="text-center flex flex-col items-center justify-center h-full p-10 rounded-none border border-dashed border-ink/25 bg-paper-soft">
//           <AlertTriangle className="h-10 w-10 text-yellow-700" />
//           <p className="mt-4 text-lg font-medium text-ink">Wallet Not Connected</p>
//           <p className="mt-1 text-ink/60">Please connect your wallet to use the faucet.</p>
//         </div>
//       )}
//     </div>
//   );
// }










