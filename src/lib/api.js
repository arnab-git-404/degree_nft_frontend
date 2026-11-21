import axios from "axios";

export const AUTH_TOKEN_KEY = "degreenft.authToken";
export const AUTH_WALLET_KEY = "degreenft.authWallet";
// The college the user is working in; the backend re-checks the membership on every request.
export const ACTIVE_INSTITUTION_KEY = "degreenft.activeInstitution";

const api = axios.create({
  baseURL: import.meta.env.VITE_APP_SERVER_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const institutionId = localStorage.getItem(ACTIVE_INSTITUTION_KEY);

  if (institutionId) {
    config.headers["X-Institution-Id"] = institutionId;
  }

  return config;
});

// A role made inactive revokes its members' access. Any request that hits that wall tells the app, which
// shows the "access revoked" page. /auth/me is skipped: its caller handles it, and it would loop.
export const ACCESS_REVOKED_EVENT = "degreenft:access-revoked";

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.code === "ACCESS_REVOKED" && !error.config?.url?.includes("/auth/me")) {
      window.dispatchEvent(new Event(ACCESS_REVOKED_EVENT));
    }

    return Promise.reject(error);
  }
);

export const getErrorMessage =(error, fallback = "Something went wrong") =>
  error.response?.data?.message || error.message || fallback;

export default api;
