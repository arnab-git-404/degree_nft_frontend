import { NavLink } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  BadgeCheck,
  ChevronRight,
  Droplets,
  FileWarning,
  LayoutDashboard,
  Loader2,
  LogOut,
  School,
  Shield,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { shortenAddress } from "../lib/utils";

const MAIN_MODULES = [
  {
    to: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: "/university",
    label: "Universities",
    icon: School,
  },
  {
    to: "/student",
    label: "Students",
    icon: Users,
  },
  {
    to: "/verify",
    label: "Verify Credentials",
    icon: BadgeCheck,
  },
  {
    to: "/batch-upload",
    label: "Batch Upload",
    icon: Upload,
  },
  {
    to: "/faucet",
    label: "Faucet",
    icon: Droplets,
  },
];

const ADMIN_MODULES = [
  {
    to: "/admin",
    label: "Overview",
    icon: Shield,
    end: true,
  },
  {
    to: "/admin/universities",
    label: "Manage Universities",
    icon: School,
  },
  {
    to: "/admin/users",
    label: "Manage Users",
    icon: Users,
  },
  {
    to: "/admin/credentials",
    label: "All Credentials",
    icon: BadgeCheck,
  },
  {
    to: "/admin/reports",
    label: "Reports",
    icon: FileWarning,
  },
];

function SidebarLink({ module, onNavigate }) {
  const Icon = module.icon;

  return (
    <NavLink
      to={module.to}
      end={module.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/30"
            : "text-gray-300 hover:bg-gray-800 hover:text-white"
        }`
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{module.label}</span>
      <ChevronRight className="ml-auto h-4 w-4 shrink-0 opacity-40" />
    </NavLink>
  );
}

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

export function AppSidebar({ onNavigate, onClose }) {
  const { connected, publicKey } = useWallet();
  const {
    user,
    roleName,
    isAuthenticated,
    isRestoring,
    isAuthenticating,
    authError,
    signIn,
    signOut,
    hasRole,
  } = useAuth();

  const walletAddress =
    user?.primaryWallet?.address || publicKey?.toBase58() || "";
  const displayName = user?.name || "Guest";
  const roleLabel = roleName
    ? `${roleName.charAt(0).toUpperCase()}${roleName.slice(1)}`
    : "Not signed in";

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

  const handleSignOut = () => {
    signOut();
    toast.success("Signed out");
    onNavigate?.();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-900/50">
      <div className="flex items-center justify-between border-b border-gray-700/70 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Navigation
        </p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {MAIN_MODULES.map((module) => (
          <SidebarLink
            key={module.to}
            module={module}
            onNavigate={onNavigate}
          />
        ))}

        {hasRole("admin") && (
          <>
            <p className="px-3 pb-2 pt-5 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Administration
            </p>
            {ADMIN_MODULES.map((module) => (
              <SidebarLink
                key={module.to}
                module={module}
                onNavigate={onNavigate}
              />
            ))}
          </>
        )}
      </nav>

      <div className="border-t border-gray-700/70 p-4">
        {isRestoring ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Restoring session...
          </div>
        ) : isAuthenticated ? (
          <>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
                {getInitials(displayName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold" title={displayName}>
                  {displayName}
                </p>
                <p className="truncate text-xs text-gray-400">
                  {roleLabel}
                  {walletAddress ? ` · ${shortenAddress(walletAddress)}` : ""}
                </p>
              </div>
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-emerald-400"
                title="Signed in"
              />
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-4 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-700 text-gray-300">
                <User className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">Guest</p>
                <p className="truncate text-xs text-gray-400">
                  {connected ? "Sign in to continue" : "Connect a wallet"}
                </p>
              </div>
            </div>
            {authError && (
              <p className="mt-2 text-xs text-red-300">{authError}</p>
            )}
            {connected && (
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isAuthenticating}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAuthenticating && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {isAuthenticating ? "Signing in..." : "Sign in"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
