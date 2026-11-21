import { Link, Navigate, useLocation } from "react-router-dom";
import { Loader2, XCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

// `anyOf`: the page opens if the user's role has at least one of these permissions.
export function ProtectedRoute({ children, anyOf }) {
  const { isAuthenticated, isRestoring, hasAnyPermission, hasRevokedCollegeAccess } = useAuth();
  const location = useLocation();

  if (isRestoring) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-cobalt" />
        <p className="eyebrow">Restoring your session</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (anyOf && !hasAnyPermission(...anyOf)) {
    // Their college role was made inactive: say so, instead of "no permission".
    if (hasRevokedCollegeAccess) return <Navigate to="/access-revoked" replace />;

    return (
      <div className="rounded-lg mx-auto max-w-xl border border-red-700/30 bg-paper-soft p-8 text-center">
        <XCircle className="mx-auto h-12 w-12 text-red-700" />
        <p className="eyebrow mt-6 text-red-700">Access restricted</p>
        <h2 className="mt-3 text-xl font-semibold">No permission for this page</h2>
        <p className="mt-3 text-sm leading-6 text-ink/60">
          Your role does not include the permission this page needs. Ask an
          admin to update your role.
        </p>
        <Link to="/" className="btn-outline mt-6 inline-flex">
          Go to your home page
        </Link>
      </div>
    );
  }

  return children;
}
