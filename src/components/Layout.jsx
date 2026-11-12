import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Navbar } from "./Navbar";
import { AuthBanner } from "./AuthBanner";
import { AppSidebar } from "./AppSidebar";

const FULL_WIDTH_PATHS = ["/login", "/activate"];

export function Layout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const isFullWidth =
    pathname === "/" ||
    FULL_WIDTH_PATHS.some((path) => pathname.startsWith(path));

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? "hidden" : "unset";

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isSidebarOpen]);

  const toaster = (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: "#ffffff",
          color: "#0f172a",
          border: "1px solid rgba(15, 23, 42, 0.1)",
          borderRadius: 8,
          fontSize: "13px",
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
        },
      }}
    />
  );

  if (isFullWidth) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        {toaster}
        <main>{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-paper text-ink">
      {toaster}

      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 lg:block">
        <AppSidebar />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar onMenuClick={() => setIsSidebarOpen(true)} />
        <AuthBanner />
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6">
          {children}
        </main>
        <footer className="flex justify-between border-t border-ink/10 px-4 py-3 text-xs text-ink/45 sm:px-6">
          <span>DegreeNFT Registry</span>
          <span>Solana devnet</span>
        </footer>
      </div>

      <div
        className={`fixed inset-0 z-40 bg-ink/50 transition-opacity lg:hidden ${
          isSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] shadow-xl transition-transform duration-200 lg:hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <AppSidebar
          onClose={() => setIsSidebarOpen(false)}
          onNavigate={() => setIsSidebarOpen(false)}
        />
      </aside>
    </div>
  );
}
