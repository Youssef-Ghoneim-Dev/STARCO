import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { NotificationProvider } from "./context/NotificationContext";
import { ThemeProvider } from "./context/ThemeContext";

localStorage.removeItem("starco_account_sessions");
localStorage.removeItem("starco-theme");
Object.keys(localStorage)
  .filter((key) => key.startsWith("starco-theme:"))
  .forEach((key) => localStorage.removeItem(key));

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}

const content = <AuthProvider><ThemeProvider><BrowserRouter><NotificationProvider><App /></NotificationProvider></BrowserRouter></ThemeProvider></AuthProvider>;

ReactDOM.createRoot(document.getElementById("root")).render(
  import.meta.env.VITE_GOOGLE_CLIENT_ID ? <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>{content}</GoogleOAuthProvider> : content,
);
