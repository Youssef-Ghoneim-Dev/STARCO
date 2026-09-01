const STORAGE_KEY = "starco_account_sessions";
const SWITCHER_ROLES = new Set(["OwnerManager", "ProductionManager", "MarketingManager"]);

const accountId = (user) => String(user?.id || user?._id || user?.email || "");

export const getAccountSessions = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((account) => account?.id && account?.token && account?.email)
      : [];
  } catch {
    return [];
  }
};

export const saveAccountSession = (user, token = localStorage.getItem("token")) => {
  const id = accountId(user);
  if (!id || !token || !user?.email) return getAccountSessions();
  const account = {
    id,
    name: String(user.name || user.email),
    email: String(user.email),
    role: String(user.role || ""),
    token,
  };
  const sessions = getAccountSessions();
  const next = [account, ...sessions.filter((item) => item.id !== id)].slice(0, 8);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
};

export const canUseAccountSwitcher = (user, sessions = getAccountSessions()) => (
  SWITCHER_ROLES.has(user?.role) || sessions.some((account) => SWITCHER_ROLES.has(account.role))
);

export const canAddAccounts = (user) => SWITCHER_ROLES.has(user?.role);

export const activateAccountSession = (account) => {
  if (!account?.token) return false;
  localStorage.setItem("token", account.token);
  return true;
};
