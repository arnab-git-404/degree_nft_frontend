import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2, ShieldOff } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/Button";
import "./AccessRevoked.css";

// Shown when the user's role has been made inactive: by the whole account (platform role) or at a college.
export function AccessRevoked() {
  const navigate = useNavigate();
  const { token, user, isRestoring, accessRevoked, revokedMemberships, hasRevokedCollegeAccess, refreshUser, signOut } = useAuth();
  const [isChecking, setIsChecking] = useState(false);

  // Learn the real state: which college role is inactive, or whether access came back.
  useEffect(() => {
    if (token) refreshUser().catch(() => {});
  }, [token, refreshUser]);

  if (isRestoring) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cobalt" />
      </div>
    );
  }
  if (!token) return <Navigate to="/login" replace />;
  if (!accessRevoked && !hasRevokedCollegeAccess) return <Navigate to="/" replace />;

  const checkAgain = async () => {
    setIsChecking(true);
    try {
      await refreshUser();
      toast.success("Checked. If your access is back you will be taken in.");
    } catch {
      toast.error("Your access is still revoked");
    } finally {
      setIsChecking(false);
    }
  };

  // A college role is inactive: name the roles. Otherwise the account's own role is.
  const colleges = revokedMemberships.map((membership) => `${membership.roleId?.displayName || "role"} at ${membership.institutionId?.name || "a college"}`);

  return (
    <div className="access-revoked">
      <ShieldOff className="access-revoked__icon" aria-hidden="true" />
      <p className="eyebrow access-revoked__eyebrow">Access revoked</p>
      <h1 className="access-revoked__title">Your access has been revoked</h1>
      <p className="access-revoked__text">
        {accessRevoked && colleges.length === 0
          ? "The role on your account has been made inactive, so you can no longer use the platform."
          : `Your ${colleges.join(", ")} has been made inactive, so you can no longer work there.`}{" "}
        If you think this is a mistake, ask your administrator to make the role active again.
      </p>
      <div className="access-revoked__actions">
        <Button onClick={checkAgain} isLoading={isChecking}>
          Check again
        </Button>
        {user && !accessRevoked && (
          <Button variant="secondary" onClick={() => navigate("/")}>
            Go to my home page
          </Button>
        )}
        <Button variant="secondary" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
