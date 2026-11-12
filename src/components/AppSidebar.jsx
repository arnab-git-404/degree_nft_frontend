import { Link, NavLink, useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  BadgeCheck,
  ChevronRight,
  Droplets,
  FileWarning,
  KeyRound,
  Loader2,
  LogOut,
  School,
  Shield,
  Upload,
  UserRound,
  Users,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { shortenAddress } from "../lib/utils";

const MAIN_MODULES = [
  {
    to: "/university",
    label: "University desk",
    icon: School,
    permissions: ["nft:create", "batch:upload", "student:read"],
  },
  {
    to: "/student",
    label: "Student desk",
    icon: Users,
    permissions: ["nft:read", "nft:confirm", "report:create"],
  },
  { to: "/verify", label: "Verify credentials", icon: BadgeCheck },
  {
    to: "/batch-upload",
    label: "Batch upload",
    icon: Upload,
    permissions: ["batch:upload"],
  },
  { to: "/faucet", label: "Devnet faucet", icon: Droplets },
];

const ADMIN_MODULES = [
  { to: "/admin", label: "Overview", icon: Shield, end: true },
  { to: "/admin/universities", label: "Universities", icon: School },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/roles", label: "Roles & permissions", icon: KeyRound },
  { to: "/admin/credentials", label: "Credentials", icon: BadgeCheck },
  { to: "/admin/reports", label: "Reports", icon: FileWarning },
];

function SidebarLink({ module, onNavigate }) {
  const Icon = module.icon;

  return (
    <NavLink
      to={module.to}
      end={module.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
          isActive
            ? "bg-cobalt text-paper"
            : "text-ink/65 hover:bg-paper-deep hover:text-ink"
        }`
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{module.label}</span>
      <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 opacity-40" />
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
  const { publicKey } = useWallet();
  const {
    user,
    roleName,
    isAuthenticated,
    isRestoring,
    signOut,
    hasRole,
    hasAnyPermission,
  } = useAuth();
  const navigate = useNavigate();

  const walletAddress =
    user?.primaryWallet?.address || publicKey?.toBase58() || "";
  const displayName = user?.name || "Guest";
  const roleLabel = roleName
    ? `${roleName.charAt(0).toUpperCase()}${roleName.slice(1)}`
    : "Not signed in";
  const visibleMainModules = MAIN_MODULES.filter(
    (module) =>
      !module.permissions || hasAnyPermission(...module.permissions)
  );

  const handleSignOut = () => {
    signOut();
    toast.success("Signed out");
    onNavigate?.();
    navigate("/login");
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-paper">
      <div className="flex items-center justify-between border-b border-ink/15 px-4 py-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink/45">
          Navigation
        </p>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center border border-ink/20 text-ink/60 transition-colors hover:border-cobalt hover:text-cobalt"
            aria-label="Close sidebar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visibleMainModules.map((module) => (
          <SidebarLink
            key={module.to}
            module={module}
            onNavigate={onNavigate}
          />
        ))}

        {hasRole("admin") ? (
          <>
            <p className="px-3 pb-2 pt-5 font-mono text-[8px] uppercase tracking-[0.2em] text-ink/40">
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
        ) : null}

        <p className="px-3 pb-2 pt-5 font-mono text-[8px] uppercase tracking-[0.2em] text-ink/40">
          Account
        </p>
        <SidebarLink
          module={{ to: "/profile", label: "My profile", icon: UserRound }}
          onNavigate={onNavigate}
        />
      </nav>

      <div className="border-t border-ink/15 p-4">
        {isRestoring ? (
          <div className="flex items-center gap-2 text-xs text-ink/50">
            <Loader2 className="h-4 w-4 animate-spin" />
            Restoring session...
          </div>
        ) : isAuthenticated ? (
          <>
            <Link
              to="/profile"
              onClick={onNavigate}
              className="flex items-center gap-3 transition-opacity hover:opacity-80"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-cobalt font-mono text-xs font-medium text-paper">
                {getInitials(displayName)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {displayName}
                </span>
                <span className="block truncate text-[11px] text-ink/50">
                  {roleLabel}
                  {walletAddress ? ` · ${shortenAddress(walletAddress)}` : ""}
                </span>
              </span>
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-cobalt"
                title="Signed in"
              />
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-4 flex w-full items-center gap-2 border border-ink/15 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-ink/55 transition-colors hover:border-cobalt hover:text-cobalt"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-ink/20 bg-paper-deep text-ink/50">
                <UserRound className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">Guest</p>
                <p className="truncate text-[11px] text-ink/50">
                  Sign in to manage credentials
                </p>
              </div>
            </div>
            <Link
              to="/login"
              onClick={onNavigate}
              className="mt-4 flex w-full items-center justify-center bg-cobalt px-3 py-2.5 font-mono text-[9px] uppercase tracking-[0.16em] text-paper transition-colors hover:bg-ink"
            >
              Sign in
            </Link>
            <Link
              to="/login?mode=signup"
              onClick={onNavigate}
              className="mt-2 flex w-full items-center justify-center border border-ink/20 px-3 py-2.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink/70 transition-colors hover:border-cobalt hover:text-cobalt"
            >
              Create account
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
