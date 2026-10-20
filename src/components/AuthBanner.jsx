import { useWallet } from "@solana/wallet-adapter-react";
import { useLocation } from "react-router-dom";
import { Loader2, ShieldCheck, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { Button } from "./Button";

const AUTH_BANNER_PATHS = ["/batch-upload"];

export function AuthBanner() {
  const { connected } = useWallet();
  const { pathname } = useLocation();
  const {
    isAuthenticated,
    isRestoring,
    isAuthenticating,
    authError,
    signIn,
  } = useAuth();

  const shouldShow = AUTH_BANNER_PATHS.some((path) =>
    pathname.startsWith(path)
  );

  if (!shouldShow || !connected || isAuthenticated || isRestoring) {
    return null;
  }

  const handleSignIn = async () => {
    try {
      await signIn();
      toast.success("Signed in successfully");
    } catch (error) {
      toast.error(
        error.response?.data?.message || error.message || "Failed to sign in"
      );
    }
  };

  return (
    <div className="border-b border-indigo-500/30 bg-indigo-500/10">
      <div className="container mx-auto flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Wallet className="h-5 w-5 text-indigo-400" />
          <div>
            <p className="text-sm font-medium text-white">
              Wallet connected. Sign in to access protected features.
            </p>
            {authError ? (
              <p className="text-xs text-red-300">{authError}</p>
            ) : (
              <p className="text-xs text-gray-400">
                Signing is free and does not create a blockchain transaction.
              </p>
            )}
          </div>
        </div>

        <Button onClick={handleSignIn} disabled={isAuthenticating}>
          {isAuthenticating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Sign In
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
