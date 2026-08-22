import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";

const content = <AuthProvider><BrowserRouter><App /></BrowserRouter></AuthProvider>;

ReactDOM.createRoot(document.getElementById("root")).render(
  import.meta.env.VITE_GOOGLE_CLIENT_ID ? <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>{content}</GoogleOAuthProvider> : content,
);
