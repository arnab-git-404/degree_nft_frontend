import { Link } from "react-router-dom";
import { GraduationCap, Menu } from "lucide-react";
import { WalletButton } from "./WalletButton";

export function Navbar({ onMenuClick }) {
  return (
    <nav className="z-50 shrink-0 border-b border-gray-700 bg-gray-900/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="rounded-md p-2 text-gray-300 transition-colors hover:bg-gray-800 hover:text-white lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" className="flex items-center space-x-2">
            <GraduationCap className="h-8 w-8 text-indigo-500" />
            <span className="text-xl font-bold">DegreeNFT</span>
          </Link>
        </div>

        <WalletButton />
      </div>
    </nav>
  );
}
