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
        setSessionWallet(
          getStoredWallet() || data.user?.primaryWallet?.address || null
        );
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
    if (walletAddress && sessionWallet && walletAddress !== sessionWallet) {
      clearSession();
    }
  }, [walletAddress, sessionWallet, clearSession]);

  useEffect(() => {
    if (wasConnected.current && !wallet.connected) {
      clearSession();
    }

    wasConnected.current = wallet.connected;
  }, [wallet.connected, clearSession]);

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

      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      localStorage.setItem(AUTH_WALLET_KEY, address);
      setToken(data.token);
      setUser(data.user);
      setSessionWallet(address);

      return data.user;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to sign in with wallet";
      setAuthError(message);
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  }, [wallet]);

  const signOut = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    const { data } = await api.get("/auth/me");
    setUser(data.user);
    return data.user;
  }, []);

  const roleName = user?.roleId?.name || null;
  const isAuthenticated = Boolean(
    token && user && walletAddress && sessionWallet === walletAddress
  );

  const hasRole = useCallback(
    (...roles) => Boolean(roleName && roles.includes(roleName)),
    [roleName]
  );

  const value = useMemo(
    () => ({
      user,
      token,
      roleName,
      isAuthenticated,
      isRestoring,
      isAuthenticating,
      authError,
      signIn,
      signOut,
      refreshUser,
      hasRole,
    }),
    [
      user,
      token,
      roleName,
      isAuthenticated,
      isRestoring,
      isAuthenticating,
      authError,
      signIn,
      signOut,
      refreshUser,
      hasRole,
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
