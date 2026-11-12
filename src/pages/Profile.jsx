import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Buffer } from "buffer";
import {
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Wallet,
} from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../lib/api";
import { Input } from "../components/Input";
import { useAuth } from "../context/AuthContext";
import { shortenAddress } from "../lib/utils";

const ROLE_LABELS = {
  student: "Student",
  university: "University",
  admin: "Administrator",
};

const formatDate = (value) => {
  if (!value) return "—";

  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getInitials = (name) => {
  const initials = String(name || "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return initials || "?";
};

export function Profile() {
  const navigate = useNavigate();
  const { setVisible } = useWalletModal();
  const { connected, publicKey, signMessage } = useWallet();
  const {
    user,
    roleName,
    updateProfile,
    changePassword,
    linkWallet,
    unlinkWallet,
    setPrimaryWallet,
    signOut,
  } = useAuth();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    bio: "",
    avatarUrl: "",
  });
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLinkingWallet, setIsLinkingWallet] = useState(false);
  const [walletBusyId, setWalletBusyId] = useState("");
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    if (!user) return;

    setForm({
      name: user.name || "",
      phone: user.phone || "",
      bio: user.bio || "",
      avatarUrl: user.avatarUrl || "",
    });
    setAvatarFailed(false);
  }, [user]);

  const wallets = useMemo(() => {
    const list = [...(user?.wallets || [])];

    return list.sort(
      (first, second) => Number(second.isPrimary) - Number(first.isPrimary)
    );
  }, [user]);

  const roleLabel = ROLE_LABELS[roleName] || roleName || "Member";
  const connectedAddress = publicKey?.toBase58() || "";
  const connectedWalletLinked = wallets.some(
    (wallet) => wallet.address === connectedAddress
  );

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setIsSavingProfile(true);

    try {
      await updateProfile(form);
      toast.success("Profile updated");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save profile"));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setIsChangingPassword(true);

    try {
      await changePassword(passwords.currentPassword, passwords.newPassword);
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast.success("Password updated");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update password"));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLinkWallet = async () => {
    if (!connected || !publicKey) {
      setVisible(true);
      return;
    }

    if (typeof signMessage !== "function") {
      toast.error("This wallet does not support message signing");
      return;
    }

    setIsLinkingWallet(true);

    try {
      const address = publicKey.toBase58();
      const { data: nonceData } = await api.post("/auth/nonce", {
        walletAddress: address,
      });
      const signatureBytes = await signMessage(
        new TextEncoder().encode(nonceData.message),
        "utf8"
      );
      const signature = Buffer.from(signatureBytes).toString("base64");

      await linkWallet({
        walletAddress: address,
        signature,
        isPrimary: wallets.length === 0,
      });
      toast.success(
        connectedWalletLinked ? "Wallet refreshed" : "Wallet linked"
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not link wallet"));
    } finally {
      setIsLinkingWallet(false);
    }
  };

  const handleUnlinkWallet = async (walletId) => {
    if (
      !window.confirm(
        "Remove this wallet from your account? You can link it again later."
      )
    ) {
      return;
    }

    setWalletBusyId(walletId);

    try {
      await unlinkWallet(walletId);
      toast.success("Wallet removed");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not remove wallet"));
    } finally {
      setWalletBusyId("");
    }
  };

  const handlePrimaryWallet = async (walletId) => {
    setWalletBusyId(walletId);

    try {
      await setPrimaryWallet(walletId);
      toast.success("Primary wallet updated");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update primary wallet"));
    } finally {
      setWalletBusyId("");
    }
  };

  const handleSignOut = () => {
    signOut();
    toast.success("Signed out");
    navigate("/login");
  };

  if (!user) {
    return null;
  }

  const deskPath = roleName === "university" ? "/university" : "/student";

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-5 border-b border-ink/20 pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-1.5 w-1.5 bg-cobalt" />
            <p className="eyebrow">Account / Profile</p>
          </div>
          <h1 className="mt-5 font-serif text-[clamp(2.8rem,5vw,4.6rem)] leading-[0.9] tracking-[-0.03em]">
            Your registry{" "}
            <em className="italic text-cobalt">identity.</em>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-ink/60">
            Manage how you appear in the registry, which wallets are attached,
            and the credentials that keep the account secure.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link to={deskPath} className="btn-outline">
            Open {roleName === "university" ? "university" : "student"} desk
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          <button type="button" onClick={handleSignOut} className="btn-ghost">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
        <aside className="space-y-6">
          <div className="panel relative overflow-hidden p-6 shadow-[12px_12px_0_0_rgba(17,16,14,0.07)]">
            <div className="flex items-center justify-between border-b border-ink/15 pb-4 font-mono text-[8px] uppercase leading-4 tracking-[0.16em] text-ink/45">
              <span>
                DegreeNFT
                <br />
                Registry profile
              </span>
              <span className="text-right">
                ID / {user._id?.slice(-8).toUpperCase()}
                <br />
                {roleLabel}
              </span>
            </div>

            <div className="mt-6 flex items-start gap-4">
              {form.avatarUrl && !avatarFailed ? (
                <img
                  src={form.avatarUrl}
                  alt={user.name}
                  className="h-16 w-16 shrink-0 object-cover"
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <span className="flex h-16 w-16 shrink-0 items-center justify-center bg-cobalt font-mono text-lg font-medium text-paper">
                  {getInitials(user.name)}
                </span>
              )}

              <div className="min-w-0">
                <h2 className="font-serif text-3xl leading-none tracking-tight">
                  {user.name}
                </h2>
                <p className="mt-2 text-xs text-ink/55">
                  {user.email || "Wallet account"}
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 border border-cobalt/30 bg-cobalt/5 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-cobalt">
                  <BadgeCheck className="h-3 w-3" />
                  {roleLabel}
                </span>
              </div>
            </div>

            <p className="mt-6 border-t border-ink/15 pt-4 text-sm leading-6 text-ink/60">
              {user.bio || "No bio yet. Add a short note from the profile form."}
            </p>

            <dl className="mt-6 grid grid-cols-2 border-t border-ink/15 pt-4">
              <div>
                <dt className="font-mono text-[8px] uppercase tracking-[0.16em] text-ink/40">
                  Wallets
                </dt>
                <dd className="mt-1 font-serif text-2xl">{wallets.length}</dd>
              </div>
              <div className="border-l border-ink/15 pl-4">
                <dt className="font-mono text-[8px] uppercase tracking-[0.16em] text-ink/40">
                  Email
                </dt>
                <dd className="mt-1 text-sm font-medium">
                  {user.emailVerified ? "Verified" : "Unverified"}
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex items-center justify-between border-t border-ink/15 pt-4 font-mono text-[8px] uppercase tracking-[0.14em] text-ink/35">
              <span>Member since {formatDate(user.createdAt)}</span>
              <span>Registry copy</span>
            </div>
          </div>

          <div className="panel-deep p-5">
            <p className="eyebrow">Account summary</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-ink/50">Role</dt>
                <dd className="font-medium">{roleLabel}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-ink/50">Last sign-in</dt>
                <dd className="font-medium">{formatDate(user.lastLoginAt)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-ink/50">Network</dt>
                <dd className="font-mono text-[10px] uppercase tracking-[0.12em]">
                  Solana devnet
                </dd>
              </div>
            </dl>
          </div>
        </aside>

        <div className="space-y-6">
          <section className="panel p-5 sm:p-6">
            <div className="flex flex-col gap-2 border-b border-ink/15 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow-cobalt">01 / Identity</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">
                  Profile details
                </h2>
              </div>
              <p className="text-xs text-ink/40">
                Name, contact, and how the registry presents you.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Full name"
                  name="name"
                  value={form.name}
                  onChange={handleFieldChange}
                  required
                />
                <Input
                  label="Phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleFieldChange}
                  placeholder="Optional contact number"
                />
              </div>

              <Input
                label="Avatar image URL"
                name="avatarUrl"
                value={form.avatarUrl}
                onChange={handleFieldChange}
                placeholder="https://..."
              />

              <div className="space-y-2">
                <label className="field-label block">Short bio</label>
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={handleFieldChange}
                  maxLength={280}
                  rows={3}
                  placeholder="A short note about your work or studies."
                  className="textarea-field"
                />
                <p className="text-right font-mono text-[9px] uppercase tracking-[0.12em] text-ink/35">
                  {form.bio.length} / 280
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-ink/15 pt-4">
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      name: user.name || "",
                      phone: user.phone || "",
                      bio: user.bio || "",
                      avatarUrl: user.avatarUrl || "",
                    })
                  }
                  className="btn-ghost"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSavingProfile}
                >
                  {isSavingProfile ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  {isSavingProfile ? "Saving..." : "Save profile"}
                </button>
              </div>
            </form>
          </section>

          <section className="panel p-5 sm:p-6">
            <div className="border-b border-ink/15 pb-4">
              <p className="eyebrow-cobalt">02 / Wallets</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">
                Linked wallets
              </h2>
              <p className="mt-1 text-xs leading-5 text-ink/50">
                Wallets hold credentials and can be used as a sign-in method.
              </p>
            </div>

            <div className="mt-4 space-y-2">
              {wallets.length === 0 ? (
                <div className="border border-dashed border-ink/20 p-5 text-center text-sm text-ink/50">
                  No wallets linked yet.
                </div>
              ) : (
                wallets.map((wallet) => (
                  <div
                    key={wallet._id}
                    className="flex flex-col gap-3 border border-ink/15 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-paper-deep text-ink/50">
                        <Wallet className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-mono text-xs">
                          {shortenAddress(wallet.address, 6)}
                          {wallet.isPrimary ? (
                            <span className="bg-cobalt px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-[0.12em] text-paper">
                              Primary
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-ink/45">
                          {wallet.isVerified ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-cobalt" />
                              Verified signature
                            </>
                          ) : (
                            "Unverified wallet"
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <a
                        href={`https://explorer.solana.com/address/${wallet.address}?cluster=devnet`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-8 w-8 items-center justify-center border border-ink/15 text-ink/45 transition-colors hover:border-cobalt hover:text-cobalt"
                        aria-label="View wallet on Solana Explorer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      {!wallet.isPrimary ? (
                        <button
                          type="button"
                          onClick={() => handlePrimaryWallet(wallet._id)}
                          disabled={walletBusyId === wallet._id}
                          className="h-8 border border-ink/15 px-2.5 font-mono text-[8px] uppercase tracking-[0.12em] text-ink/55 transition-colors hover:border-cobalt hover:text-cobalt disabled:opacity-50"
                        >
                          Make primary
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleUnlinkWallet(wallet._id)}
                        disabled={walletBusyId === wallet._id}
                        className="flex h-8 w-8 items-center justify-center border border-ink/15 text-ink/45 transition-colors hover:border-red-600 hover:text-red-600 disabled:opacity-50"
                        aria-label="Remove wallet"
                      >
                        {walletBusyId === wallet._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t border-ink/15 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-ink/50">
                {connected
                  ? `Wallet connected: ${shortenAddress(connectedAddress, 5)}`
                  : "Connect a wallet to attach it to this profile."}
              </p>
              <button
                type="button"
                onClick={handleLinkWallet}
                disabled={isLinkingWallet}
                className="btn-primary shrink-0"
              >
                {isLinkingWallet ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wallet className="h-4 w-4" />
                )}
                {isLinkingWallet
                  ? "Linking..."
                  : connectedWalletLinked
                    ? "Refresh linked wallet"
                    : connected
                      ? "Link connected wallet"
                      : "Connect a wallet"}
              </button>
            </div>
          </section>

          <section className="panel p-5 sm:p-6">
            <div className="border-b border-ink/15 pb-4">
              <p className="eyebrow-cobalt">03 / Account</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">
                Sign-in details
              </h2>
            </div>

            <dl className="mt-2 divide-y divide-ink/10 text-sm">
              <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <dt className="flex items-center gap-2 text-ink/50">
                  <Mail className="h-4 w-4" />
                  Email
                </dt>
                <dd className="font-medium">
                  {user.email || "No email on this account"}
                </dd>
              </div>
              <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <dt className="flex items-center gap-2 text-ink/50">
                  <ShieldCheck className="h-4 w-4" />
                  Email status
                </dt>
                <dd>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] ${
                      user.emailVerified
                        ? "bg-cobalt/10 text-cobalt"
                        : "bg-paper-deep text-ink/50"
                    }`}
                  >
                    {user.emailVerified ? "Activated" : "Not activated"}
                  </span>
                </dd>
              </div>
              <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <dt className="flex items-center gap-2 text-ink/50">
                  <KeyRound className="h-4 w-4" />
                  Account ID
                </dt>
                <dd className="break-all font-mono text-xs text-ink/60">
                  {user._id}
                </dd>
              </div>
            </dl>
          </section>

          <section className="panel p-5 sm:p-6">
            <div className="border-b border-ink/15 pb-4">
              <p className="eyebrow-cobalt">04 / Security</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">
                Password
              </h2>
            </div>

            {user.email ? (
              <form
                onSubmit={handleChangePassword}
                className="mt-5 space-y-4"
              >
                <Input
                  label="Current password"
                  type="password"
                  value={passwords.currentPassword}
                  onChange={(event) =>
                    setPasswords((current) => ({
                      ...current,
                      currentPassword: event.target.value,
                    }))
                  }
                  autoComplete="current-password"
                  required
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="New password"
                    type="password"
                    value={passwords.newPassword}
                    onChange={(event) =>
                      setPasswords((current) => ({
                        ...current,
                        newPassword: event.target.value,
                      }))
                    }
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                  <Input
                    label="Confirm new password"
                    type="password"
                    value={passwords.confirmPassword}
                    onChange={(event) =>
                      setPasswords((current) => ({
                        ...current,
                        confirmPassword: event.target.value,
                      }))
                    }
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </div>
                <div className="flex justify-end border-t border-ink/15 pt-4">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <KeyRound className="h-4 w-4" />
                    )}
                    {isChangingPassword ? "Updating..." : "Update password"}
                  </button>
                </div>
              </form>
            ) : (
              <p className="mt-4 text-sm leading-6 text-ink/55">
                This account signs in with a wallet, so there is no password to
                manage. Link an email account separately if you need one.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
