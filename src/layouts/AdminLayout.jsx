import { Outlet } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { Loader2, RefreshCw, Shield, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/Button";
import { SignInRequired } from "../components/SignInRequired";

export function AdminLayout() {
  const { connected } = useWallet();
  const { isAuthenticated, isRestoring, hasRole, refreshUser } = useAuth();
  const isAdmin = hasRole("admin");

  if (!connected) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Shield className="h-16 w-16 text-indigo-500" />
        <h2 className="mt-4 text-2xl font-bold">Admin Panel</h2>
        <p className="mt-2 text-gray-400">
          Connect your admin wallet to manage the platform
        </p>
      </div>
    );
  }

  if (isRestoring) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
        <p className="mt-4 text-gray-400">Restoring your session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <SignInRequired
        title="Sign in to access the admin panel"
        description="Sign a free message with your admin wallet to continue."
      />
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl space-y-4 rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center">
        <XCircle className="mx-auto h-12 w-12 text-red-400" />
        <h2 className="text-2xl font-bold">Access denied</h2>
        <p className="text-sm text-red-100/80">
          This wallet does not have admin access. Add its address to
          ADMIN_WALLET_ADDRESSES on the backend and sign in again.
        </p>
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              await refreshUser();
              toast.success("Role refreshed");
            } catch {
              toast.error("Failed to refresh role");
            }
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh role
        </Button>
      </div>
    );
  }

  return <Outlet />;
}
