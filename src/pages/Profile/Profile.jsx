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
import api, { getErrorMessage } from "../../lib/api";
import { Input } from "../../components/Input";
import { useAuth } from "../../context/AuthContext";
import { getDeskPath } from "../../lib/roles";
import { shortenAddress } from "../../lib/utils";
import { Invitations } from "./Invitations";
import "./Profile.css";

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

  const roleLabel = user?.roleId?.displayName || roleName || "Member";
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

  const deskPath = getDeskPath(user);

  return (
    <div className="profile-page">
      <header className="page-head">
        <div>
          <h1 className="page-title">My profile</h1>
          <p className="page-sub">
            Manage how you appear in the registry, which wallets are attached,
            and the credentials that keep the account secure.
          </p>
        </div>

        <div className="head-actions">
          {deskPath && (
            <Link to={deskPath} className="btn-outline h-7 px-2.5 text-xs">
              Open {deskPath === "/institution" ? "institution" : "student"} desk
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          )}
          <button type="button" onClick={handleSignOut} className="btn-ghost text-xs">
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </header>

      <div className="layout">
        {/* ---- Identity card ---- */}
        <aside className="id-card">
          <div className="id-top">
            {form.avatarUrl && !avatarFailed ? (
              <img
                src={form.avatarUrl}
                alt={user.name}
                className="avatar"
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              <span className="avatar avatar-initials">
                {getInitials(user.name)}
              </span>
            )}

            <div className="min-w-0">
              <h2 className="id-name">{user.name}</h2>
              <p className="cell-sub truncate">{user.email || "Wallet account"}</p>
              <span className="role-pill">
                <BadgeCheck className="h-3 w-3" />
                {roleLabel}
              </span>
            </div>
          </div>

          <p className="bio">
            {user.bio || "No bio yet. Add a short note from the profile form."}
          </p>

          <div className="id-stats">
            <div>
              <p className="stat-label">Wallets</p>
              <p className="stat-number">{wallets.length}</p>
            </div>
            <div>
              <p className="stat-label">Email</p>
              <p className="stat-text">
                {user.emailVerified ? "Verified" : "Unverified"}
              </p>
            </div>
          </div>

          <dl className="summary">
            <div>
              <dt>Account ID</dt>
              <dd className="font-mono">{user._id?.slice(-8).toUpperCase()}</dd>
            </div>
            <div>
              <dt>Last sign-in</dt>
              <dd>{formatDate(user.lastLoginAt)}</dd>
            </div>
            <div>
              <dt>Member since</dt>
              <dd>{formatDate(user.createdAt)}</dd>
            </div>
            <div>
              <dt>Network</dt>
              <dd>Solana devnet</dd>
            </div>
          </dl>
        </aside>

        <div className="sections">
          <Invitations />
          {/* ---- Profile details ---- */}
          <section className="card">
            <div className="card-head">
              <h2 className="card-title">Profile details</h2>
              <p className="card-sub">Name, contact, and how the registry presents you.</p>
            </div>

            <form onSubmit={handleSaveProfile} className="card-body">
              <div className="field-grid">
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
                <div className="span-2">
                  <Input
                    label="Avatar image URL"
                    name="avatarUrl"
                    value={form.avatarUrl}
                    onChange={handleFieldChange}
                    placeholder="https://..."
                  />
                </div>
                <div className="span-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor="profile-bio" className="field-label">
                      Short bio
                    </label>
                    <span className="text-[12px] text-ink/40">
                      {form.bio.length} / 280
                    </span>
                  </div>
                  <textarea
                    id="profile-bio"
                    name="bio"
                    value={form.bio}
                    onChange={handleFieldChange}
                    maxLength={280}
                    rows={2}
                    placeholder="A short note about your work or studies."
                    className="textarea-field min-h-14"
                  />
                </div>
              </div>

              <div className="card-foot">
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
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reset
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSavingProfile}
                >
                  {isSavingProfile ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  {isSavingProfile ? "Saving..." : "Save profile"}
                </button>
              </div>
            </form>
          </section>

          {/* ---- Password ---- */}
          <section className="card">
            <div className="card-head">
              <h2 className="card-title">Password</h2>
              <p className="card-sub">Change the password used for email sign-in.</p>
            </div>

            {user.email ? (
              <form onSubmit={handleChangePassword} className="card-body">
                <div className="field-grid">
                  <div className="span-2">
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
                  </div>
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
                <div className="card-foot">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <KeyRound className="h-3.5 w-3.5" />
                    )}
                    {isChangingPassword ? "Updating..." : "Update password"}
                  </button>
                </div>
              </form>
            ) : (
              <p className="card-body text-xs leading-5 text-ink/55">
                This account signs in with a wallet, so there is no password to
                manage. Link an email account separately if you need one.
              </p>
            )}
          </section>

          {/* ---- Linked wallets ---- */}
          <section className="card">
            <div className="card-head">
              <h2 className="card-title">Linked wallets</h2>
              <p className="card-sub">
                Wallets hold credentials and can be used as a sign-in method.
              </p>
            </div>

            <div className="card-body">
              {wallets.length === 0 ? (
                <div className="empty">No wallets linked yet.</div>
              ) : (
                <div className="wallet-list">
                  {wallets.map((wallet) => (
                    <div key={wallet._id} className="wallet">
                      <span className="wallet-icon">
                        <Wallet className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="wallet-address">
                          {shortenAddress(wallet.address, 6)}
                          {wallet.isPrimary ? (
                            <span className="primary-tag">Primary</span>
                          ) : null}
                        </p>
                        <p className="wallet-status">
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

                      <div className="wallet-actions">
                        <a
                          href={`https://explorer.solana.com/address/${wallet.address}?cluster=devnet`}
                          target="_blank"
                          rel="noreferrer"
                          className="icon-btn"
                          aria-label="View wallet on Solana Explorer"
                          title="View on Solana Explorer"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        {!wallet.isPrimary ? (
                          <button
                            type="button"
                            onClick={() => handlePrimaryWallet(wallet._id)}
                            disabled={walletBusyId === wallet._id}
                            className="text-btn"
                          >
                            Make primary
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleUnlinkWallet(wallet._id)}
                          disabled={walletBusyId === wallet._id}
                          className="icon-btn icon-btn-danger"
                          aria-label="Remove wallet"
                          title="Remove wallet"
                        >
                          {walletBusyId === wallet._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="card-foot justify-between">
                <p className="cell-sub">
                  {connected
                    ? `Connected: ${shortenAddress(connectedAddress, 5)}`
                    : "Connect a wallet to attach it to this profile."}
                </p>
                <button
                  type="button"
                  onClick={handleLinkWallet}
                  disabled={isLinkingWallet}
                  className="btn-primary shrink-0"
                >
                  {isLinkingWallet ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wallet className="h-3.5 w-3.5" />
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
            </div>
          </section>

          {/* ---- Sign-in details ---- */}
          <section className="card">
            <div className="card-head">
              <h2 className="card-title">Sign-in details</h2>
              <p className="card-sub">Email and account identifiers.</p>
            </div>

            <dl className="details">
              <div>
                <dt>
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </dt>
                <dd className="font-medium">
                  {user.email || "No email on this account"}
                </dd>
              </div>
              <div>
                <dt>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Email status
                </dt>
                <dd>
                  <span
                    className={`status-pill ${
                      user.emailVerified ? "is-on" : "is-off"
                    }`}
                  >
                    {user.emailVerified ? "Activated" : "Not activated"}
                  </span>
                </dd>
              </div>
              <div>
                <dt>
                  <KeyRound className="h-3.5 w-3.5" />
                  Account ID
                </dt>
                <dd className="font-mono text-xs break-all text-ink/60">
                  {user._id}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
