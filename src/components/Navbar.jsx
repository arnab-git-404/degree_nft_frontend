import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Menu } from "lucide-react";
import { WalletButton } from "./WalletButton";
import { useAuth } from "../context/AuthContext";
import { SECTIONS, getInitials } from "./AppSidebar";

// path -> { section, title }
const PAGES = Object.fromEntries(
  SECTIONS.flatMap((section) =>
    section.modules.map((module) => [
      module.to,
      { section: section.label, title: module.label },
    ])
  )
);

export function Navbar({ onMenuClick }) {
  const { isAuthenticated, user, roleName } = useAuth();
  const { pathname } = useLocation();
  const page = PAGES[pathname.replace(/\/+$/, "") || "/"];
  const section = page?.section || "Workspace";
  const title = page?.title || "Workspace";

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3.5 border-b border-ink/10 bg-paper-soft px-4 sm:px-7">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-ink/10 text-ink/60 transition-colors hover:bg-acid hover:text-cobalt lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[14px]">
          <span className="hidden text-ink/45 sm:inline">{section}</span>
          <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-ink/25 sm:inline" aria-hidden="true" />
          <span className="truncate font-semibold">{title}</span>
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden rounded-full bg-amber-100 px-2.5 py-1 text-[12px] font-semibold text-amber-800 md:inline">
          Devnet
        </span>
        <div className="hidden sm:block">
          <WalletButton />
        </div>

        {isAuthenticated ? (
          <Link
            to="/profile"
            className="group flex items-center gap-2.5 rounded-[9px] py-1 pr-2 pl-1 transition-colors hover:bg-paper"
            title="Manage profile"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-gradient-to-br from-cobalt to-cobalt-strong text-[12px] font-extrabold text-white transition-shadow group-hover:shadow-[0_0_0_3px_rgb(79_70_229/0.14)]">
              {getInitials(user?.name)}
            </span>
            <span className="hidden text-left leading-tight md:block">
              <span className="block max-w-32 truncate text-[13px] font-semibold">
                {user?.name || "Profile"}
              </span>
              <span className="mt-0.5 block text-[12px] capitalize text-ink/50">
                {user?.roleId?.displayName || roleName}
              </span>
            </span>
          </Link>
        ) : (
          <Link to="/login" className="btn-primary">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
