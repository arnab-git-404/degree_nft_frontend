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
  History,
  ClipboardCheck,
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
    label: "Institution",
    modules: [
      // No permissions on the desk: it is where an applicant registers, before any role exists.
      { to: "/institution", label: "Registration & desk", icon: School },
      {
        to: "/batch-upload",
        label: "Batch upload",
        icon: Upload,
        permissions: ["batch:upload"],
      },
      { to: "/admin/institutions", label: "Institutions", icon: Building2, adminOnly: true },
      { to: "/admin/applications", label: "Applications", icon: ClipboardCheck, adminOnly: true },
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
      { to: "/admin/activity", label: "Activity log", icon: History, adminOnly: true },
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
        `flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
          isActive
            ? "bg-cobalt font-medium text-white shadow-sm"
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
    <p className="px-2.5 pb-1 pt-3 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
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
    isAuthenticated,
    isRestoring,
    signOut,
    canManagePlatform,
    hasAnyPermission,
    memberships,
    activeInstitutionId,
    selectInstitution,
  } = useAuth();
  const navigate = useNavigate();

  const walletAddress =
    user?.primaryWallet?.address || publicKey?.toBase58() || "";
  const displayName = user?.name || "Guest";
  // userType is the display category (e.g. SUPER_ADMIN -> "Super Admin").
  const roleLabel = user?.userType
    ? user.userType.toLowerCase().replace(/(^|_)(\w)/g, (_, sep, c) => `${sep ? " " : ""}${c.toUpperCase()}`)
    : "Not signed in";
  const canSee = (module) =>
    (!module.adminOnly || canManagePlatform) &&
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
    <div className="flex h-full flex-col bg-rail text-slate-300">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-3">
        <Link to="/" onClick={onNavigate} className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-cobalt text-white">
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

      {memberships.length > 0 && (
        <div className="border-b border-white/10 px-3 py-2">
          <label
            htmlFor="active-institution"
            className="mb-1 block text-[11px] uppercase tracking-wide text-slate-500"
          >
            Working in
          </label>
          <select
            id="active-institution"
            value={activeInstitutionId || ""}
            onChange={(event) => selectInstitution(event.target.value)}
            disabled={memberships.length === 1}
            className="h-8 w-full rounded-md border border-white/10 bg-white/5 px-2 text-xs text-white disabled:opacity-100"
          >
            {memberships.map((membership) => (
              <option
                key={membership.institutionId._id}
                value={membership.institutionId._id}
                className="text-ink"
              >
                {membership.institutionId.name} · {membership.roleId.displayName}
              </option>
            ))}
          </select>
        </div>
      )}

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
        {visibleSections.map((section) => (
          <div key={section.label}>
            <SectionLabel>{section.label}</SectionLabel>
            {section.modules.map((module) => (
              <SidebarLink key={module.to} module={module} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-2">
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
            className="flex h-8 w-full items-center justify-center rounded-md bg-cobalt text-[13px] font-medium text-white hover:bg-cobalt-strong"
          >
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}
