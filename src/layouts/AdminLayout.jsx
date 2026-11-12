import { Outlet } from "react-router-dom";
import { Loader2, RefreshCw, Shield, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/Button";
import { SignInRequired } from "../components/SignInRequired";

export function AdminLayout() {
  const { isAuthenticated, isRestoring, hasRole, refreshUser } = useAuth();
  const isAdmin = hasRole("admin");

  if (isRestoring) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Loader2 className="h-10 w-10 animate-spin text-cobalt" />
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-ink/45">
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
      <div className="mx-auto max-w-xl border border-red-700/30 bg-paper-soft p-8 text-center">
        <XCircle className="mx-auto h-12 w-12 text-red-700" />
        <p className="eyebrow mt-6 text-red-700">Access restricted</p>
        <h2 className="mt-3 font-serif text-4xl leading-tight tracking-tight">
          Administrator only
        </h2>
        <p className="mt-3 text-sm leading-6 text-ink/60">
          This account does not have admin access. Ask a platform owner to grant
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 pb-4">
        <p className="eyebrow flex items-center gap-2">
          <Shield className="h-3 w-3" />
          Registry control room
        </p>
        <p className="text-xs text-ink/45">
          Institutions, credentials and moderation queues.
        </p>
      </div>
      <Outlet />
    </div>
  );
}
