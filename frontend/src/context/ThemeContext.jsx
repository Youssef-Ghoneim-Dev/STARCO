import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { updateThemePreference } from "../services/profileAPI";

const ThemeContext = createContext(null);
const normalizeTheme = (value) => value === "dark" ? "dark" : "light";

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    setTheme(normalizeTheme(user?.theme));
  }, [user?.id, user?.theme]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const chooseTheme = useCallback(async (nextTheme) => {
    const normalized = normalizeTheme(nextTheme);
    const previous = theme;
    setTheme(normalized);
    if (!user) return;
    try {
      await updateThemePreference(normalized);
    } catch {
      setTheme(previous);
    }
  }, [theme, user]);

  const value = useMemo(() => ({
    theme,
    isDark: theme === "dark",
    setTheme: chooseTheme,
    toggleTheme: () => chooseTheme(theme === "dark" ? "light" : "dark"),
  }), [chooseTheme, theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
};
