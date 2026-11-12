import { Link, NavLink, useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  BadgeCheck,
  Building2,
  Droplets,
  FileWarning,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  Link2,
  Loader2,
  LogOut,
  School,
  Upload,
  UserRound,
  Users,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { shortenAddress } from "../lib/utils";

// Single source for the sidebar and the top-bar breadcrumb. A section hides when none of its modules are visible.
export const SECTIONS = [
  {
    label: "Operations",
    modules: [{ to: "/verify", label: "Verify credentials", icon: BadgeCheck }],
  },
  {
    label: "Student",
    modules: [
      {
        to: "/student",
        label: "Student desk",
        icon: GraduationCap,
        permissions: ["nft:read", "nft:confirm", "report:create"],
      },
      { to: "/faucet", label: "Devnet faucet", icon: Droplets },
    ],
  },
  {
    label: "University",
    modules: [
      // No permissions on the desk: it is where an applicant registers, before any role exists.
      { to: "/university", label: "Registration & desk", icon: School },
      {
        to: "/batch-upload",
        label: "Batch upload",
        icon: Upload,
        permissions: ["batch:upload"],
      },
      { to: "/admin/universities", label: "Universities", icon: Building2, adminOnly: true },
      { to: "/admin/registration-links", label: "Registration links", icon: Link2, adminOnly: true },
    ],
  },
  {
    label: "Administration",
    modules: [
      { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true, adminOnly: true },
      { to: "/admin/users", label: "Users", icon: Users, adminOnly: true },
      { to: "/admin/roles", label: "Roles & permissions", icon: KeyRound, adminOnly: true },
      { to: "/admin/credentials", label: "Credentials", icon: BadgeCheck, adminOnly: true },
      { to: "/admin/reports", label: "Reports", icon: FileWarning, adminOnly: true },
    ],
  },
  {
    label: "Account",
    modules: [{ to: "/profile", label: "My profile", icon: UserRound }],
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
        `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
          isActive
            ? "bg-white/10 font-medium text-white"
            : "text-slate-400 hover:bg-white/5 hover:text-white"
        }`
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{module.label}</span>
    </NavLink>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="px-3 pb-1 pt-5 text-[11px] font-semibold text-slate-500">
      {children}
    </p>
  );
}

export const getInitials = (name) => {
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
  const canSee = (module) =>
    (!module.adminOnly || hasRole("admin")) &&
    (!module.permissions || hasAnyPermission(...module.permissions));
  const visibleSections = SECTIONS.map((section) => ({
    ...section,
    modules: section.modules.filter(canSee),
  })).filter((section) => section.modules.length > 0);

  const handleSignOut = () => {
    signOut();
    toast.success("Signed out");
    onNavigate?.();
    navigate("/login");
  };

  return (
    <div className="flex h-full flex-col bg-ink text-slate-300">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
        <Link to="/" onClick={onNavigate} className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-cobalt text-white">
            <GraduationCap className="h-4 w-4" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold text-white">
              DegreeNFT
            </span>
            <span className="block text-[11px] text-slate-500">
              Registry ERP
            </span>
          </span>
        </Link>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {visibleSections.map((section) => (
          <div key={section.label}>
            <SectionLabel>{section.label}</SectionLabel>
            {section.modules.map((module) => (
              <SidebarLink key={module.to} module={module} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        {isRestoring ? (
          <div className="flex items-center gap-2 px-2 py-1 text-xs text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Restoring session...
          </div>
        ) : isAuthenticated ? (
          <div className="flex items-center gap-3 rounded-md px-2 py-1.5">
            <Link
              to="/profile"
              onClick={onNavigate}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cobalt text-xs font-semibold text-white">
                {getInitials(displayName)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-white">
                  {displayName}
                </span>
                <span className="block truncate text-[11px] text-slate-500">
                  {roleLabel}
                  {walletAddress ? ` · ${shortenAddress(walletAddress)}` : ""}
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            onClick={onNavigate}
            className="flex h-9 w-full items-center justify-center rounded-md bg-cobalt text-sm font-medium text-white hover:bg-blue-700"
          >
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}
