import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Buffer } from "buffer";
import api, {
  ACCESS_REVOKED_EVENT,
  ACTIVE_INSTITUTION_KEY,
  AUTH_TOKEN_KEY,
  AUTH_WALLET_KEY,
} from "../lib/api";
import { getActiveMemberships, getRevokedMemberships } from "../lib/roles";

const AuthContext = createContext(null);

const getStoredToken = () => localStorage.getItem(AUTH_TOKEN_KEY);
const getStoredWallet = () => localStorage.getItem(AUTH_WALLET_KEY);

const getErrorMessage = (error, fallback) =>
  error.response?.data?.message || error.message || fallback;

export function AuthProvider({ children }) {
  const wallet = useWallet();
  const walletAddress = wallet.publicKey?.toBase58() || null;
  const wasConnected = useRef(false);

  const [token, setToken] = useState(getStoredToken);
  const [user, setUser] = useState(null);
  const [sessionWallet, setSessionWallet] = useState(getStoredWallet);
  const [isRestoring, setIsRestoring] = useState(Boolean(getStoredToken()));
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState("");
  // True when the server said the user's role is inactive (code ACCESS_REVOKED): the app shows the "access revoked" page.
  const [accessRevoked, setAccessRevoked] = useState(false);
  const [activeInstitutionId, setActiveInstitutionIdState] = useState(() =>
    localStorage.getItem(ACTIVE_INSTITUTION_KEY)
  );

  // Stored first so the api interceptor sends the new X-Institution-Id on the very next request.
  const selectInstitution = useCallback((institutionId) => {
    if (institutionId) {
      localStorage.setItem(ACTIVE_INSTITUTION_KEY, institutionId);
    } else {
      localStorage.removeItem(ACTIVE_INSTITUTION_KEY);
    }
    setActiveInstitutionIdState(institutionId || null);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_WALLET_KEY);
    localStorage.removeItem(ACTIVE_INSTITUTION_KEY);
    setActiveInstitutionIdState(null);
    setToken(null);
    setUser(null);
    setSessionWallet(null);
    setAuthError("");
    setAccessRevoked(false);
  }, []);

  const persistSession = useCallback((nextToken, nextUser, walletKey = null) => {
    localStorage.setItem(AUTH_TOKEN_KEY, nextToken);

    if (walletKey) {
      localStorage.setItem(AUTH_WALLET_KEY, walletKey);
    } else {
      localStorage.removeItem(AUTH_WALLET_KEY);
    }

    setToken(nextToken);
    setUser(nextUser);
    setSessionWallet(walletKey);
    setAuthError("");
    setAccessRevoked(false);
  }, []);

  useEffect(() => {
    const onRevoked = () => setAccessRevoked(true);
    window.addEventListener(ACCESS_REVOKED_EVENT, onRevoked);
    return () => window.removeEventListener(ACCESS_REVOKED_EVENT, onRevoked);
  }, []);

  useEffect(() => {
    if (!token) {
      setIsRestoring(false);
      return;
    }

    let cancelled = false;
    const restoreSession = async () => {
      try {
        const { data } = await api.get("/auth/me");

        if (cancelled) return;

        setUser(data.user);
        setSessionWallet(getStoredWallet());
      } catch (error) {
        if (!cancelled) {
          // A revoked role keeps the session so "Check again" works; anything else signs the user out.
          if (error.response?.data?.code === "ACCESS_REVOKED") setAccessRevoked(true);
          else clearSession();
        }
      } finally {
        if (!cancelled) {
          setIsRestoring(false);
        }
      }
    };

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, [token, clearSession]);

  useEffect(() => {
    if (!sessionWallet || !walletAddress) return;

    if (walletAddress !== sessionWallet) {
      clearSession();
    }
  }, [walletAddress, sessionWallet, clearSession]);

  useEffect(() => {
    if (sessionWallet && wasConnected.current && !wallet.connected) {
      clearSession();
    }

    wasConnected.current = wallet.connected;
  }, [wallet.connected, sessionWallet, clearSession]);

  const signIn = useCallback(async () => {
    if (!wallet.connected || !wallet.publicKey) {
      throw new Error("Connect a wallet before signing in");
    }

    if (typeof wallet.signMessage !== "function") {
      throw new Error("This wallet does not support message signing");
    }

    setIsAuthenticating(true);
    setAuthError("");

    try {
      const address = wallet.publicKey.toBase58();
      const { data: nonceData } = await api.post("/auth/nonce", {
        walletAddress: address,
      });

      const signatureBytes = await wallet.signMessage(
        new TextEncoder().encode(nonceData.message),
        "utf8"
      );
      const signature = Buffer.from(signatureBytes).toString("base64");

      const { data } = await api.post("/auth/login/wallet", {
        walletAddress: address,
        signature,
      });

      persistSession(data.token, data.user, address);

      return data.user;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to sign in with wallet");
      setAuthError(message);
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  }, [wallet, persistSession]);

  const loginWithEmail = useCallback(
    async (email, password) => {
      setIsAuthenticating(true);
      setAuthError("");

      try {
        const { data } = await api.post("/auth/login", { email, password });
        persistSession(data.token, data.user);

        return data.user;
      } catch (error) {
        const message = getErrorMessage(error, "Failed to sign in");
        setAuthError(message);
        throw error;
      } finally {
        setIsAuthenticating(false);
      }
    },
    [persistSession]
  );

  const activateAccount = useCallback(
    async (activationToken) => {
      setIsAuthenticating(true);
      setAuthError("");

      try {
        const { data } = await api.post(`/auth/activate/${activationToken}`);
        persistSession(data.token, data.user);

        return data.user;
      } catch (error) {
        const message = getErrorMessage(error, "Failed to activate account");
        setAuthError(message);
        throw error;
      } finally {
        setIsAuthenticating(false);
      }
    },
    [persistSession]
  );

  const resendActivation = useCallback(async (email) => {
    const { data } = await api.post("/auth/activate/resend", { email });

    return data;
  }, []);

  const updateProfile = useCallback(async (updates) => {
    const { data } = await api.patch("/auth/profile", updates);
    setUser(data.user);

    return data.user;
  }, []);

  const changePassword = useCallback(
    async (currentPassword, newPassword) => {
      const { data } = await api.patch("/auth/password", {
        currentPassword,
        newPassword,
      });

      return data;
    },
    []
  );

  const linkWallet = useCallback(
    async ({ walletAddress: address, signature, isPrimary = false }) => {
      const { data } = await api.post("/auth/wallet/link", {
        walletAddress: address,
        signature,
        isPrimary,
      });

      setUser(data.user);

      return data.wallet;
    },
    []
  );

  const unlinkWallet = useCallback(async (walletId) => {
    const { data } = await api.delete(`/auth/wallet/${walletId}`);
    setUser(data.user);

    return data.user;
  }, []);

  const setPrimaryWallet = useCallback(async (walletId) => {
    const { data } = await api.patch(`/auth/wallet/${walletId}/primary`);
    setUser(data.user);

    return data.user;
  }, []);

  const signOut = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    const { data } = await api.get("/auth/me");
    setUser(data.user);
    // The account works again; a revoked college role is worked out from the fresh memberships below.
    setAccessRevoked(false);

    return data.user;
  }, []);

  const roleName = user?.roleId?.name || null;
  const memberships = useMemo(() => getActiveMemberships(user), [user]);
  const revokedMemberships = useMemo(() => getRevokedMemberships(user), [user]);
  // Member of a college, but every role there is inactive: no college access left.
  const hasRevokedCollegeAccess = revokedMemberships.length > 0 && memberships.length === 0;
  const activeMembership =
    memberships.find((membership) => membership.institutionId._id === activeInstitutionId) || null;

  // Keep the selection valid: default to the first college, clear it when the user has none.
  useEffect(() => {
    if (!user) return;
    if (!activeMembership) selectInstitution(memberships[0]?.institutionId._id || null);
  }, [user, memberships, activeMembership, selectInstitution]);

  // Account role permissions plus the selected college's membership role (UI only; the API re-checks).
  const permissions = useMemo(
    () => [
      ...(user?.roleId?.permissions || []),
      ...(activeMembership?.roleId?.permissions || []),
    ],
    [user, activeMembership]
  );
  const isAuthenticated = Boolean(token && user);

  const hasPermission = useCallback(
    (permission) =>
      permissions.includes("*") || permissions.includes(permission),
    [permissions]
  );

  // Admin panel access comes from the role's permissions, same rule as the backend.
  const canManagePlatform = hasPermission("platform:manage");

  const hasAnyPermission = useCallback(
    (...required) =>
      permissions.includes("*") ||
      required.some((permission) => permissions.includes(permission)),
    [permissions]
  );

  const value = useMemo(
    () => ({
      user,
      token,
      roleName,
      permissions,
      walletAddress,
      sessionWallet,
      isAuthenticated,
      canManagePlatform,
      isRestoring,
      isAuthenticating,
      authError,
      signIn,
      signOut,
      loginWithEmail,

      activateAccount,
      resendActivation,
      updateProfile,
      changePassword,
      linkWallet,
      unlinkWallet,
      setPrimaryWallet,
      refreshUser,
      hasPermission,
      hasAnyPermission,
      memberships,
      activeMembership,
      activeInstitutionId,
      selectInstitution,
      accessRevoked,
      revokedMemberships,
      hasRevokedCollegeAccess,
    }),
    [
      accessRevoked,
      revokedMemberships,
      hasRevokedCollegeAccess,
      memberships,
      activeMembership,
      activeInstitutionId,
      selectInstitution,
      user,
      token,
      roleName,
      permissions,
      walletAddress,
      sessionWallet,
      isAuthenticated,
      canManagePlatform,
      isRestoring,
      isAuthenticating,
      authError,
      signIn,
      signOut,
      loginWithEmail,

      activateAccount,
      resendActivation,
      updateProfile,
      changePassword,
      linkWallet,
      unlinkWallet,
      setPrimaryWallet,
      refreshUser,
      hasPermission,
      hasAnyPermission,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
