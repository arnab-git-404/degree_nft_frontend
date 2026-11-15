import { Outlet } from "react-router-dom";
import { Loader2, RefreshCw, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/Button";
import { SignInRequired } from "../components/SignInRequired";

export function AdminLayout() {
  const { isAuthenticated, isRestoring, canManagePlatform: isAdmin, refreshUser } = useAuth();

  if (isRestoring) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Loader2 className="h-10 w-10 animate-spin text-cobalt" />
        <p className="mt-4 text-xs text-ink/45">
          Restoring your session
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <SignInRequired
        title="Sign in to access the admin panel"
        description="Use your administrator email and password or a Solana wallet to continue."
      />
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-lg mx-auto max-w-xl border border-red-700/30 bg-paper-soft p-8 text-center">
        <XCircle className="mx-auto h-12 w-12 text-red-700" />
        <p className="eyebrow mt-6 text-red-700">Access restricted</p>
        <h2 className="mt-3 text-xl font-semibold">
          Administrator only
        </h2>
        <p className="mt-3 text-sm leading-6 text-ink/60">
          This account does not have Super Admin access. Ask a Super Admin to grant
          the role, then refresh.
        </p>
        <Button
          variant="secondary"
          className="mt-6"
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

  // The top-bar breadcrumb already names the section, so no extra banner here.
  return <Outlet />;
}
