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

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#11100e",
            color: "#f3efe6",
            borderRadius: 0,
            fontSize: "12px",
            letterSpacing: "0.02em",
          },
          success: { iconTheme: { primary: "#d9ff43", secondary: "#11100e" } },
        }}
      />

      {isFullWidth ? null : (
        <Navbar onMenuClick={() => setIsSidebarOpen(true)} />
      )}

      {isFullWidth ? (
        <main className="flex-1">{children}</main>
      ) : (
        <div className="mx-auto flex w-full max-w-[1680px] flex-1">
          <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-72 shrink-0 border-r border-ink/15 lg:block">
            <AppSidebar />
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <AuthBanner />
            <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
              {children}
            </main>

            <footer className="flex flex-col gap-1 border-t border-ink/15 px-4 py-4 font-mono text-[8px] uppercase tracking-[0.16em] text-ink/40 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
              <span>DegreeNFT / Registry console</span>
              <span>Solana devnet · Credentials, not PDFs</span>
            </footer>
          </div>
        </div>
      )}

      {!isFullWidth ? (
        <>
          <div
            className={`fixed inset-0 top-16 z-30 bg-ink/50 transition-opacity lg:hidden ${
              isSidebarOpen
                ? "opacity-100"
                : "pointer-events-none opacity-0"
            }`}
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />

          <aside
            className={`fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-72 max-w-[85vw] border-r border-ink/20 bg-paper shadow-[12px_0_0_0_rgba(17,16,14,0.08)] transition-transform duration-300 lg:hidden ${
              isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <AppSidebar
              onClose={() => setIsSidebarOpen(false)}
              onNavigate={() => setIsSidebarOpen(false)}
            />
          </aside>
        </>
      ) : null}
    </div>
  );
}
