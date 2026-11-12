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
import api, { AUTH_TOKEN_KEY, AUTH_WALLET_KEY } from "../lib/api";

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

  const clearSession = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_WALLET_KEY);
    setToken(null);
    setUser(null);
    setSessionWallet(null);
    setAuthError("");
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
      } catch {
        if (!cancelled) {
          clearSession();
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

  const registerWithEmail = useCallback(
    async ({ name, email, password, role }) => {
      setIsAuthenticating(true);
      setAuthError("");

      try {
        const { data } = await api.post("/auth/register", {
          name,
          email,
          password,
          role,
        });

        return data;
      } catch (error) {
        const message = getErrorMessage(error, "Failed to create account");
        setAuthError(message);
        throw error;
      } finally {
        setIsAuthenticating(false);
      }
    },
    []
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

    return data.user;
  }, []);

  const roleName = user?.roleId?.name || null;
  const permissions = useMemo(
    () => user?.roleId?.permissions || [],
    [user]
  );
  const isAuthenticated = Boolean(token && user);

  const hasRole = useCallback(
    (...roles) => Boolean(roleName && roles.includes(roleName)),
    [roleName]
  );

  const hasPermission = useCallback(
    (permission) =>
      permissions.includes("*") || permissions.includes(permission),
    [permissions]
  );

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
      isRestoring,
      isAuthenticating,
      authError,
      signIn,
      signOut,
      loginWithEmail,
      registerWithEmail,
      activateAccount,
      resendActivation,
      updateProfile,
      changePassword,
      linkWallet,
      unlinkWallet,
      setPrimaryWallet,
      refreshUser,
      hasRole,
      hasPermission,
      hasAnyPermission,
    }),
    [
      user,
      token,
      roleName,
      permissions,
      walletAddress,
      sessionWallet,
      isAuthenticated,
      isRestoring,
      isAuthenticating,
      authError,
      signIn,
      signOut,
      loginWithEmail,
      registerWithEmail,
      activateAccount,
      resendActivation,
      updateProfile,
      changePassword,
      linkWallet,
      unlinkWallet,
      setPrimaryWallet,
      refreshUser,
      hasRole,
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
