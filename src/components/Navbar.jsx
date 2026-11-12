import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { WalletButton } from "./WalletButton";
import { useAuth } from "../context/AuthContext";
import { ADMIN_MODULES, MAIN_MODULES, getInitials } from "./AppSidebar";

const TITLES = Object.fromEntries(
  [...MAIN_MODULES, ...ADMIN_MODULES, { to: "/profile", label: "My profile" }].map(
    (module) => [module.to, module.label]
  )
);

export function Navbar({ onMenuClick }) {
  const { isAuthenticated, user, roleName } = useAuth();
  const { pathname } = useLocation();
  const section = pathname.startsWith("/admin") ? "Administration" : "Operations";
  const title = TITLES[pathname.replace(/\/+$/, "") || "/"] || "Workspace";

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-ink/10 bg-paper-soft px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-8 w-8 items-center justify-center rounded-md text-ink/70 hover:bg-paper lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
          <span className="hidden text-ink/45 sm:inline">{section}</span>
          <span className="hidden text-ink/25 sm:inline">/</span>
          <span className="truncate font-semibold">{title}</span>
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 md:inline">
          Devnet
        </span>
        <div className="hidden sm:block">
          <WalletButton />
        </div>

        {isAuthenticated ? (
          <Link
            to="/profile"
            className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-paper"
            title="Manage profile"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cobalt text-[11px] font-semibold text-white">
              {getInitials(user?.name)}
            </span>
            <span className="hidden text-left leading-tight md:block">
              <span className="block max-w-32 truncate text-xs font-medium">
                {user?.name || "Profile"}
              </span>
              <span className="block text-[11px] capitalize text-ink/50">
                {roleName}
              </span>
            </span>
          </Link>
        ) : (
          <Link to="/login" className="btn-primary h-8 px-3">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
