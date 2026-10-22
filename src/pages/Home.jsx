import { Link } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Droplets,
  GraduationCap,
  School,
  ShieldCheck,
  Upload,
  UserRound,
  Wallet,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { shortenAddress } from "../lib/utils";

const tickerItems = [
  "Issued on Solana",
  "Student owned",
  "Tamper evident",
  "Verified in seconds",
  "Profile managed",
  "Permanent record",
];

const MODULES = [
  {
    to: "/university",
    title: "University desk",
    description:
      "Build the institution profile, allocate credentials, and track the records you issue.",
    icon: School,
    label: "Issuer workspace",
  },
  {
    to: "/student",
    title: "Student desk",
    description:
      "Review allocations, confirm your credentials, and mint the final record to your wallet.",
    icon: GraduationCap,
    label: "Graduate workspace",
  },
  {
    to: "/batch-upload",
    title: "Batch upload",
    description:
      "Upload a CSV of graduates and prepare a complete cohort in a single pass.",
    icon: Upload,
    label: "Cohort intake",
  },
  {
    to: "/verify",
    title: "Verification",
    description:
      "Inspect an issuer, a degree, and its on-chain record without an account.",
    icon: ShieldCheck,
    label: "Public registry",
  },
  {
    to: "/faucet",
    title: "Devnet faucet",
    description:
      "Request test SOL when you need fees for issuing or claiming credentials.",
    icon: Droplets,
    label: "Developer tools",
  },
  {
    to: "/profile",
    title: "My profile",
    description:
      "Manage identity details, linked wallets, and the password that protects the account.",
    icon: UserRound,
    label: "Account",
  },
];

function Ticker() {
  return (
    <div className="overflow-hidden border-y border-ink/20 bg-cobalt py-3 text-paper">
      <div className="marquee-track flex w-max whitespace-nowrap">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex" aria-hidden={copy === 1}>
            {tickerItems.map((item) => (
              <span
                key={item}
                className="mx-6 font-mono text-[9px] uppercase tracking-[0.2em]"
              >
                {item}
                <span className="ml-6 text-acid">+</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Home() {
  const { connected, publicKey } = useWallet();
  const { isAuthenticated, user, roleName } = useAuth();

  const walletLabel = connected && publicKey
    ? shortenAddress(publicKey.toBase58(), 4)
    : "Not connected";
  const roleLabel = roleName
    ? `${roleName.charAt(0).toUpperCase()}${roleName.slice(1)}`
    : "Guest";
  const deskPath = roleName === "university" ? "/university" : "/student";

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden border border-ink/20">
        <div
          className="pointer-events-none absolute inset-0 hero-grid"
          aria-hidden="true"
        />

        <div className="relative grid lg:grid-cols-[1.35fr_0.65fr]">
          <div className="border-b border-ink/20 px-5 pb-10 pt-8 sm:px-8 sm:pb-12 sm:pt-10 lg:border-b-0 lg:border-r lg:px-10 lg:pb-12 lg:pt-12">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/20 pb-4 font-mono text-[9px] uppercase tracking-[0.18em] text-ink/55">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 bg-cobalt" />
                On-chain credential registry
              </span>
              <span>Solana / Devnet</span>
            </div>

            <h1 className="mt-9 max-w-[13ch] font-serif text-[clamp(3.6rem,7vw,7rem)] leading-[0.86] tracking-[-0.04em]">
              Degrees that{" "}
              <em className="italic text-cobalt">prove</em> themselves.
            </h1>

            <p className="mt-7 max-w-2xl text-sm leading-7 text-ink/65 sm:text-base sm:leading-8">
              This is the working registry for universities, graduates, and
              verification teams. Issue, claim, verify, and manage everything
              from one place.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to={isAuthenticated ? deskPath : "/login"} className="btn-primary">
                {isAuthenticated ? "Open workspace" : "Sign in to the registry"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/verify" className="btn-outline">
                Verify a credential
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            <dl className="mt-10 grid max-w-2xl grid-cols-3 border-t border-ink/20 pt-5">
              <div className="pr-4">
                <dt className="stat-value">100%</dt>
                <dd className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em] text-ink/45 sm:text-[9px]">
                  Student owned
                </dd>
              </div>
              <div className="border-l border-ink/20 px-4">
                <dt className="stat-value">0</dt>
                <dd className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em] text-ink/45 sm:text-[9px]">
                  Middlemen
                </dd>
              </div>
              <div className="border-l border-ink/20 pl-4">
                <dt className="stat-value">&lt;1 min</dt>
                <dd className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em] text-ink/45 sm:text-[9px]">
                  To verify
                </dd>
              </div>
            </dl>
          </div>

          <aside className="flex flex-col justify-between bg-paper-deep px-5 py-7 sm:px-7 lg:px-8">
            <div className="flex items-center justify-between border-b border-ink/20 pb-4 font-mono text-[8px] uppercase tracking-[0.18em] text-ink/50">
              <span>Registry status</span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cobalt" />
                Live
              </span>
            </div>

            <div className="my-7 border border-ink/25 bg-paper-soft p-5 shadow-[12px_12px_0_0_rgba(17,16,14,0.08)]">
              <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-ink/45">
                Current session
              </p>
              <p className="mt-3 font-serif text-4xl leading-none tracking-tight">
                {isAuthenticated ? user?.name : "Guest access"}
              </p>

              <dl className="mt-6 space-y-3 border-t border-ink/15 pt-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-ink/50">Role</dt>
                  <dd className="font-medium">{roleLabel}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-ink/50">Wallet</dt>
                  <dd className="font-mono text-[10px] uppercase tracking-[0.1em]">
                    {walletLabel}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-ink/50">Profile</dt>
                  <dd className="flex items-center gap-1.5 text-xs">
                    {isAuthenticated ? (
                      <>
                        <BadgeCheck className="h-3.5 w-3.5 text-cobalt" />
                        Active
                      </>
                    ) : (
                      "Not signed in"
                    )}
                  </dd>
                </div>
              </dl>

              <Link
                to={isAuthenticated ? "/profile" : "/login"}
                className="mt-6 flex items-center justify-between border-t border-ink/15 pt-4 font-mono text-[9px] uppercase tracking-[0.16em] text-cobalt"
              >
                {isAuthenticated ? "Manage profile" : "Sign in or create account"}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="flex items-center justify-between border-t border-ink/20 pt-4 font-mono text-[8px] uppercase tracking-[0.16em] text-ink/40">
              <span>{isAuthenticated ? "Registry connected" : "Public view"}</span>
              <Wallet className="h-3.5 w-3.5" />
            </div>
          </aside>
        </div>
      </section>

      <Ticker />

      <section className="grid border border-ink/20 bg-paper-soft lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="border-b border-ink/20 px-5 py-8 sm:px-7 lg:border-b-0 lg:border-r">
          <p className="eyebrow">01 / Workspaces</p>
          <p className="mt-5 max-w-[18ch] font-serif text-2xl leading-tight tracking-tight">
            One credential. Every point of view.
          </p>
          <p className="mt-4 text-sm leading-6 text-ink/55">
            Move between issuing, claiming, and verifying without leaving the
            registry.
          </p>
        </div>

        <div>
          {MODULES.map((module, index) => {
            const Icon = module.icon;

            return (
              <Link
                key={module.to}
                to={module.to}
                className="group grid gap-3 border-b border-ink/15 px-5 py-6 transition-colors last:border-b-0 hover:bg-cobalt hover:text-paper sm:px-7 lg:grid-cols-[3rem_1fr_auto] lg:items-center lg:gap-6"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[9px] tracking-[0.16em] text-ink/35 transition-colors group-hover:text-paper/50">
                    0{index + 1}
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center border border-ink/20 transition-colors group-hover:border-paper/40 group-hover:bg-paper group-hover:text-ink">
                    <Icon className="h-4 w-4" />
                  </span>
                </div>

                <div className="grid gap-1 sm:grid-cols-[0.9fr_1.1fr] sm:items-center sm:gap-6">
                  <div>
                    <p className="font-serif text-2xl leading-none tracking-tight sm:text-3xl">
                      {module.title}
                    </p>
                    <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.14em] text-ink/40 transition-colors group-hover:text-paper/50">
                      {module.label}
                    </p>
                  </div>
                  <p className="text-sm leading-6 text-ink/60 transition-colors group-hover:text-paper/70">
                    {module.description}
                  </p>
                </div>

                <span className="hidden h-9 w-9 items-center justify-center border border-ink/25 transition-colors group-hover:border-paper/40 group-hover:bg-paper group-hover:text-ink lg:flex">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid overflow-hidden border border-ink/20 bg-acid lg:grid-cols-[1.2fr_0.8fr]">
        <div className="px-5 py-9 sm:px-8 sm:py-10">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em]">
            02 / Account
          </p>
          <h2 className="mt-5 max-w-[16ch] font-serif text-4xl leading-[0.92] tracking-[-0.03em] sm:text-5xl">
            {isAuthenticated ? (
              <>
                Keep your registry{" "}
                <em className="italic text-cobalt">current.</em>
              </>
            ) : (
              <>
                Two ways in. One{" "}
                <em className="italic text-cobalt">profile.</em>
              </>
            )}
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-ink/65">
            {isAuthenticated
              ? "Update your name, contact details, avatar, linked wallets, and password whenever things change."
              : "Activate an email account or connect a Solana wallet. Once you are in, profile details and wallets live in one place."}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            {isAuthenticated ? (
              <Link to="/profile" className="btn-primary">
                Manage profile
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link to="/login?mode=signup" className="btn-primary">
                  Create account
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex h-11 items-center gap-2 border border-ink bg-transparent px-5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors hover:bg-ink hover:text-acid"
                >
                  Sign in with wallet
                  <Wallet className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="border-t border-ink/30 bg-ink px-5 py-9 text-paper sm:px-8 lg:border-l lg:border-t-0">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-paper/45">
            Registry notes
          </p>
          <ul className="mt-5 space-y-3 text-sm leading-6 text-paper/65">
            <li className="flex gap-3 border-b border-paper/15 pb-3">
              <span className="font-mono text-[9px] text-acid">01</span>
              Email accounts must be activated before the first sign in.
            </li>
            <li className="flex gap-3 border-b border-paper/15 pb-3">
              <span className="font-mono text-[9px] text-acid">02</span>
              Wallet sign-in is free and never moves funds.
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-[9px] text-acid">03</span>
              Credentials stay yours. The registry only proves them.
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
