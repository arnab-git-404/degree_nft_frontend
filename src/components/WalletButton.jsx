import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function WalletButton({ className = "" }) {
  return <WalletMultiButton className={className} />;
}
