import { useEffect, useId, useState } from "react";
import { Link, NavLink, matchPath, useLocation, useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  BadgeCheck,
  BookOpen,
  Building2,
  ChevronLeft,
  ChevronRight,
  LogIn,
  CircleUserRound,
  ScanSearch,
  ShieldCheck,
  Droplets,
  FileWarning,
  GraduationCap,
  KeyRound,
  Landmark,
  Layers,
  LayoutDashboard,
  Link2,
  Loader2,
  LogOut,
  School,
  Settings,
  Upload,
  UserRound,
  Users,
  UsersRound,
  X,
  History,
  ClipboardCheck,
  ClipboardList,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { shortenAddress } from "../lib/utils";

// Single source for the sidebar and the top-bar breadcrumb. A section hides when none of its modules are visible.
export const SECTIONS = [
  {
    label: "Operations",
    icon: ScanSearch,
    modules: [{ to: "/verify", label: "Verify credentials", icon: BadgeCheck }],
  },
  {
    label: "Student",
    icon: GraduationCap,
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
  // collegeOnly: shown only while working in a college ("Working in"); these pages need that membership.
  {
    label: "Institution",
    icon: School,
    modules: [
      // No permissions on the desk: it is where an applicant registers, before any role exists.
      { to: "/institution", label: "Registration & desk", icon: School, end: true },
      { to: "/institution/programs", label: "Programs", icon: BookOpen, permissions: ["program:read"], collegeOnly: true },
      { to: "/institution/batches", label: "Batches", icon: Layers, permissions: ["programSession:read"], collegeOnly: true },
      { to: "/institution/students", label: "Students", icon: Users, permissions: ["student:read"], collegeOnly: true },
      { to: "/institution/enrollments", label: "Enrollments", icon: ClipboardList, permissions: ["enrollment:read"], collegeOnly: true },
      { to: "/batch-upload", label: "Batch upload", icon: Upload, permissions: ["batch:upload"], collegeOnly: true },
    ],
  },
  {
    // Each college's own settings, for the college picked in "Working in".
    label: "Administration",
    icon: Landmark,
    modules: [
      { to: "/administration/staff", label: "Staff", icon: UsersRound, permissions: ["staff:read"], collegeOnly: true },
      { to: "/administration/roles", label: "Roles", icon: KeyRound, permissions: ["role:manage"], collegeOnly: true },
      { to: "/administration/activity", label: "Activity log", icon: History, permissions: ["audit:read"], collegeOnly: true },
      { to: "/administration/settings", label: "Settings", icon: Settings, permissions: ["academicSession:read"], collegeOnly: true },
    ],
  },
  {
    // The Super Admin panel: every college and the platform itself.
    label: "Platform Admin",
    icon: ShieldCheck,
    modules: [
      { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true, adminOnly: true },
      { to: "/admin/institutions", label: "Institutions", icon: Building2, adminOnly: true },
      { to: "/admin/applications", label: "Applications", icon: ClipboardCheck, adminOnly: true },
      { to: "/admin/registration-links", label: "Registration links", icon: Link2, adminOnly: true },
      { to: "/admin/users", label: "Users", icon: Users, adminOnly: true },
      { to: "/admin/roles", label: "Roles & permissions", icon: KeyRound, adminOnly: true },
      { to: "/admin/credentials", label: "Credentials", icon: BadgeCheck, adminOnly: true },
      { to: "/admin/reports", label: "Reports", icon: FileWarning, adminOnly: true },
      { to: "/admin/activity", label: "Activity log", icon: History, adminOnly: true },
      { to: "/admin/settings", label: "Settings", icon: Settings, adminOnly: true },
    ],
  },
  {
    label: "Account",
    icon: CircleUserRound,
    modules: [{ to: "/profile", label: "My profile", icon: UserRound }],
  },
];

const isModuleActive = (module, pathname) =>
  Boolean(matchPath({ path: module.to, end: Boolean(module.end) }, pathname));

// Child link: a dot on the group's vertical guide line, then icon + label. Collapsed: icon only, name in tooltip.
function SidebarLink({ module, onNavigate, collapsed = false }) {
  const Icon = module.icon;

  return (
    <NavLink
      to={module.to}
      end={module.end}
      onClick={onNavigate}
      title={collapsed ? module.label : undefined}
      className={({ isActive }) => {
        const tone = isActive
          ? "bg-cobalt text-white shadow-[0_4px_14px_rgb(79_70_229/0.35)]"
          : "text-slate-400 hover:bg-white/5 hover:text-white";
        const dot = isActive ? "before:bg-white/75" : "before:bg-slate-600 hover:before:bg-acid";
        // No ::before when collapsed: an empty pseudo-element would become a flex item and shift the icon.
        const shape = collapsed
          ? "justify-center py-2.5"
          : `py-2 pr-3 pl-8 before:absolute before:top-1/2 before:left-[17px] before:h-[5px] before:w-[5px] before:-translate-y-1/2 before:rounded-full before:transition-colors ${dot}`;
        return `group relative flex items-center gap-2.5 rounded-lg text-[14px] font-medium transition-colors ${tone} ${shape}`;
      }}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-70 group-hover:opacity-100 group-aria-[current=page]:opacity-100" />
      <span className={collapsed ? "sr-only" : "truncate"}>{module.label}</span>
    </NavLink>
  );
}

// Main module: header button that opens its child modules.
function SidebarGroup({ section, id, isOpen, hasActive, onToggle, onNavigate }) {
  const Icon = section.icon;

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={id}
        className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[14px] font-semibold transition-colors hover:bg-white/5 hover:text-white ${
          isOpen || hasActive ? "text-white" : "text-slate-400"
        }`}
      >
        <Icon
          className={`h-4 w-4 shrink-0 transition-opacity group-hover:opacity-100 ${
            isOpen || hasActive ? "opacity-100" : "opacity-70"
          }`}
        />
        <span className="flex-1 truncate">{section.label}</span>
        <ChevronRight
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-90 text-acid" : "text-slate-600"
          }`}
          aria-hidden="true"
        />
      </button>

      {/* grid-rows 0fr -> 1fr animates to the content's real height; inert keeps closed links out of tab order */}
      <div
        id={id}
        inert={!isOpen}
        className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(.4,0,.2,1)] ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="relative space-y-0.5 pt-0.5 pb-1.5 before:absolute before:top-1 before:bottom-2.5 before:left-[19px] before:w-px before:bg-white/10">
            {section.modules.map((module) => (
              <SidebarLink key={module.to} module={module} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      </div>
    </div>
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

export function AppSidebar({ onNavigate, onClose, collapsed = false, onToggleCollapse }) {
  const { publicKey } = useWallet();
  const {
    user,
    isAuthenticated,
    isRestoring,
    signOut,
    canManagePlatform,
    hasAnyPermission,
    memberships,
    activeMembership,
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
    (!module.collegeOnly || activeMembership) &&
    (!module.permissions || hasAnyPermission(...module.permissions));
  const visibleSections = SECTIONS.map((section) => ({
    ...section,
    modules: section.modules.filter(canSee),
  })).filter((section) => section.modules.length > 0);

  const { pathname } = useLocation();
  const groupIdPrefix = useId();
  const activeSection = visibleSections.find((section) =>
    section.modules.some((module) => isModuleActive(module, pathname))
  )?.label;
  // One group open at a time, like the College ERP sidebar.
  const [openSection, setOpenSection] = useState(activeSection);

  // On navigation, open the group that holds the current page (keep the current one if no group matches).
  useEffect(() => {
    if (activeSection) setOpenSection(activeSection);
  }, [activeSection, pathname]);

  const handleSignOut = () => {
    signOut();
    toast.success("Signed out");
    onNavigate?.();
    navigate("/login");
  };

  return (
    <div className="relative flex h-full flex-col bg-rail text-slate-300">
      {onToggleCollapse ? (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute top-5 -right-3 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-acid bg-paper-soft text-cobalt shadow-[0_2px_8px_rgb(79_70_229/0.25)] transition-colors hover:bg-cobalt hover:text-white"
        >
          <ChevronLeft
            className={`h-3.5 w-3.5 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
          />
        </button>
      ) : null}

      <div
        className={`flex min-h-16 shrink-0 items-center gap-2 border-b border-white/10 py-3.5 ${
          collapsed ? "justify-center px-2" : "justify-between px-3.5"
        }`}
      >
        <Link
          to="/"
          onClick={onNavigate}
          title={collapsed ? "DegreeNFT" : undefined}
          className="flex min-w-0 items-center gap-2.5"
        >
          <span
            className={`flex shrink-0 items-center justify-center bg-gradient-to-br from-cobalt to-cobalt-strong text-white shadow-[0_3px_10px_rgb(79_70_229/0.35)] transition-all duration-300 ${
              collapsed ? "h-9 w-9 rounded-[9px]" : "h-10 w-10 rounded-[11px]"
            }`}
          >
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className={collapsed ? "sr-only" : "min-w-0 leading-tight"}>
            <span className="block truncate text-[15px] font-bold text-white">
              DegreeNFT
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-slate-500">
              Registry ERP
            </span>
          </span>
        </Link>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-cobalt hover:text-white"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {memberships.length > 0 && !collapsed && (
        <div className="border-b border-white/10 px-3.5 py-3">
          <label
            htmlFor="active-institution"
            className="mb-1.5 block text-[12px] font-semibold text-slate-500"
          >
            Working in
          </label>
          <select
            id="active-institution"
            value={activeInstitutionId || ""}
            onChange={(event) => selectInstitution(event.target.value)}
            disabled={memberships.length === 1}
            className="h-9 w-full rounded-md border border-white/10 bg-white/5 px-2.5 text-[13px] font-medium text-white transition-colors hover:border-cobalt/60 focus:border-cobalt focus:outline-none disabled:opacity-100 disabled:hover:border-white/10"
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

      <nav className="flex-1 space-y-0.5 overflow-x-hidden overflow-y-auto px-2 py-3">
        {visibleSections.map((section, index) =>
          collapsed ? (
            // Rail: every module as an icon, groups split by a thin line.
            <div
              key={section.label}
              className="space-y-0.5 border-t border-white/10 pt-1.5 pb-1 first:border-t-0 first:pt-0"
            >
              {section.modules.map((module) => (
                <SidebarLink key={module.to} module={module} onNavigate={onNavigate} collapsed />
              ))}
            </div>
          ) : (
          <SidebarGroup
            key={section.label}
            section={section}
            id={`${groupIdPrefix}-group-${index}`}
            isOpen={openSection === section.label}
            hasActive={activeSection === section.label}
            onToggle={() =>
              setOpenSection((current) => (current === section.label ? null : section.label))
            }
            onNavigate={onNavigate}
          />
          )
        )}
      </nav>

      <div className="border-t border-white/10 p-2">
        {isRestoring ? (
          <div
            className={`flex items-center gap-2 py-2 text-xs text-slate-400 ${
              collapsed ? "justify-center" : "px-2.5"
            }`}
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className={collapsed ? "sr-only" : undefined}>Restoring session...</span>
          </div>
        ) : isAuthenticated ? (
          <>
            <Link
              to="/profile"
              onClick={onNavigate}
              title={collapsed ? displayName : undefined}
              className={`flex items-center gap-2.5 rounded-[9px] py-2 transition-colors hover:bg-white/5 ${
                collapsed ? "justify-center" : "px-2.5"
              }`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cobalt to-cobalt-strong text-[12px] font-extrabold text-white">
                {getInitials(displayName)}
              </span>
              <span className={collapsed ? "sr-only" : "min-w-0 flex-1 leading-tight"}>
                <span className="block truncate text-[13px] font-semibold text-white">
                  {displayName}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                  {roleLabel}
                  {walletAddress ? ` · ${shortenAddress(walletAddress)}` : ""}
                </span>
              </span>
              {!collapsed && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_5px_rgb(16_185_129/0.5)]" aria-hidden="true" />
              )}
            </Link>
            <div className="mx-2 my-1.5 h-px bg-white/10" />
            <button
              type="button"
              onClick={handleSignOut}
              title={collapsed ? "Log out" : undefined}
              className={`flex w-full items-center gap-2.5 rounded-lg py-2 text-[13px] font-medium text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400 ${
                collapsed ? "justify-center" : "px-2.5"
              }`}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className={collapsed ? "sr-only" : undefined}>Log out</span>
            </button>
          </>
        ) : (
          <Link
            to="/login"
            onClick={onNavigate}
            title={collapsed ? "Sign in" : undefined}
            className={`btn-primary w-full ${collapsed ? "px-0" : ""}`}
          >
            {collapsed ? <LogIn className="h-4 w-4" /> : null}
            <span className={collapsed ? "sr-only" : undefined}>Sign in</span>
          </Link>
        )}
      </div>
    </div>
  );
}
