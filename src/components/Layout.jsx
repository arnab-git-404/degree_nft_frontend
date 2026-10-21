import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Navbar } from "./Navbar";
import { AuthBanner } from "./AuthBanner";
import { AppSidebar } from "./AppSidebar";

export function Layout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { pathname } = useLocation();

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
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <Toaster position="top-center" />
      <Navbar onMenuClick={() => setIsSidebarOpen(true)} />

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-72 shrink-0 border-r border-gray-700/60 lg:block">
          <AppSidebar />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <AuthBanner />
          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>

      <div
        className={`fixed inset-0 top-16 z-30 bg-black/60 transition-opacity lg:hidden ${
          isSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={`fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-72 max-w-[85vw] border-r border-gray-700 bg-gray-900 shadow-2xl transition-transform duration-300 lg:hidden ${
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
