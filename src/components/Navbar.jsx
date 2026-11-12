import { Link, useNavigate } from "react-router-dom";
import { LogOut, Menu, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import { Brand } from "./Brand";
import { WalletButton } from "./WalletButton";
import { useAuth } from "../context/AuthContext";

const getInitials = (name) => {
  const initials = String(name || "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return initials || "?";
};

export function Navbar({ onMenuClick }) {
  const { isAuthenticated, user, roleName, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    toast.success("Signed out");
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-ink/20 bg-paper/90 backdrop-blur-md">
      <div className="flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          {onMenuClick ? (
            <button
              type="button"
              onClick={onMenuClick}
              className="flex h-9 w-9 items-center justify-center border border-ink/25 text-ink transition-colors hover:border-cobalt hover:text-cobalt lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </button>
          ) : null}

          <Brand />
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <WalletButton />
          </div>

          {isAuthenticated ? (
            <>
              <Link
                to="/profile"
                className="group flex items-center gap-2 border border-ink/25 px-2 py-1.5 transition-colors hover:border-cobalt sm:px-3"
                title="Manage profile"
              >
                <span className="flex h-6 w-6 items-center justify-center bg-cobalt font-mono text-[9px] font-medium text-paper">
                  {getInitials(user?.name)}
                </span>
                <span className="hidden max-w-28 truncate text-xs font-medium sm:block">
                  {user?.name || "Profile"}
                </span>
                <UserRound className="h-3.5 w-3.5 text-ink/40 transition-colors group-hover:text-cobalt" />
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                className="flex h-9 w-9 items-center justify-center border border-ink/25 text-ink/60 transition-colors hover:border-cobalt hover:text-cobalt"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden h-9 items-center border border-ink/25 px-3 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors hover:border-cobalt hover:text-cobalt sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                to="/login?mode=signup"
                className="inline-flex h-9 items-center bg-cobalt px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-paper transition-colors hover:bg-ink"
              >
                Create account
              </Link>
            </>
          )}
        </div>
      </div>

      {isAuthenticated && roleName ? (
        <div className="hidden border-t border-ink/10 px-8 py-1.5 font-mono text-[8px] uppercase tracking-[0.18em] text-ink/40 lg:block">
          Signed in as {roleName}
        </div>
      ) : null}
    </header>
  );
}
