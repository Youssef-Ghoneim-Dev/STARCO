import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getProfile } from "../services/profileAPI";
import { registerAuthStatusUpdater, unregisterAuthStatusUpdater } from "../services/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, setPending] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [accountStatus, setAccountStatus] = useState("idle");
  const [statusMessage, setStatusMessage] = useState("");

  const checkPendingStatus = useCallback((profile) => {
    if (!profile) {
      setPending(false);
      setDeleted(false);
      setAccountStatus("idle");
      setStatusMessage("");
      return;
    }

    const isDeleted =
      profile?.isDeleted === true ||
      profile?.status === "deleted" ||
      profile?.deleted === true;

    if (isDeleted) {
      setDeleted(true);
      setPending(false);
      setAccountStatus("deleted");
      setStatusMessage("Your account has been deleted.");
      return;
    }

    const isPending =
      profile?.status === "pending" ||
      profile?.approved === false ||
      profile?.approved === "false";

    if (isPending) {
      setPending(true);
      setDeleted(false);
      setAccountStatus("pending");
      setStatusMessage("Your account is waiting for manager approval.");
      return;
    }

    setPending(false);
    setDeleted(false);
    setAccountStatus("active");
    setStatusMessage("");
  }, []);

  const loadProfile = useCallback(async ({ background = false } = {}) => {
    const token = localStorage.getItem("token");

    if (!token) {
      if (background) {
        return;
      }
      setLoading(false);
      setUser(null);
      setPending(false);
      setDeleted(false);
      setAccountStatus("idle");
      setStatusMessage("");
      return;
    }

    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    // const start = Date.now();

    try {
      const { data } = await getProfile();

      setUser(data);
      checkPendingStatus(data);
    } catch (error) {
      if (error?.response?.status === 404) {
        setUser(null);
        setPending(false);
        setDeleted(true);
        setAccountStatus("deleted");
        setStatusMessage("Your account is no longer available.");
      } else if ([401, 403].includes(error?.response?.status)) {
        // Only an actual authentication refusal ends the local session.
        // A backend redeploy can briefly produce 5xx/network responses and
        // must never log every active user out.
        localStorage.removeItem("token");
        setUser(null);
        setPending(false);
        setDeleted(false);
        setAccountStatus("idle");
        setStatusMessage("");
      }
    } finally {
      if (background) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [checkPendingStatus]);

  useEffect(() => {
    registerAuthStatusUpdater((status) => {
      if (status === "pending") {
        setPending(true);
        setDeleted(false);
        setAccountStatus("pending");
        setStatusMessage("Your account is waiting for manager approval.");
      } else if (status === "deleted") {
        setDeleted(true);
        setPending(false);
        setAccountStatus("deleted");
        setStatusMessage("Your account has been deleted.");
      }
    });

    return () => unregisterAuthStatusUpdater();
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    const interval = setInterval(() => {
      const token = localStorage.getItem("token");
      if (token) {
        loadProfile({ background: true });
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [loadProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        accountStatus,
        statusMessage,
        pending,
        deleted,
        refreshing,
        reloadProfile: loadProfile,
        checkPendingStatus,
        setPending,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
