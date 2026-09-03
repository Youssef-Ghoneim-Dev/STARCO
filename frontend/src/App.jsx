import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login";
import Register from "./pages/Register";
import GoogleRegisterCompletion from "./pages/GoogleRegisterCompletion";
import Projects from "./pages/Projects";
import "./index.css";
import ProtectedRoute from "./routes/ProtectedRoute";
import PublicRoute from "./routes/PublicRoute";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import PendingUsers from "./pages/PendingUsers";
import NewProject from "./pages/NewProject";
import EditProject from "./pages/EditProject";
import ProjectFolder from "./pages/ProjectFolder";
import Panels from "./pages/Panels";
import Configuration from "./pages/Configuration";
import Profile from "./pages/Profile";
import Clients from "./pages/Clients";
import DeletedProjects from "./pages/DeletedProjects";
import ClientProjectPreview from "./pages/ClientProjectPreview";
import RoleRoute from "./routes/RoleRoute";
import { useTheme } from "./context/ThemeContext";

function App() {
  const { isDark } = useTheme();

  useEffect(() => {
    const isNumberInput = (target) => target?.tagName === "INPUT" && target.type === "number";
    const blockScientificNotation = (event) => {
      if (isNumberInput(event.target) && ["e", "E", "+", "-"].includes(event.key)) event.preventDefault();
    };
    const blockScientificPaste = (event) => {
      if (!isNumberInput(event.target)) return;
      const pasted = event.clipboardData?.getData("text") || "";
      if (/[eE+-]/.test(pasted)) event.preventDefault();
    };
    const blockScientificBeforeInput = (event) => {
      if (isNumberInput(event.target) && /[eE+-]/.test(event.data || "")) event.preventDefault();
    };
    document.addEventListener("keydown", blockScientificNotation, true);
    document.addEventListener("paste", blockScientificPaste, true);
    document.addEventListener("beforeinput", blockScientificBeforeInput, true);
    return () => {
      document.removeEventListener("keydown", blockScientificNotation, true);
      document.removeEventListener("paste", blockScientificPaste, true);
      document.removeEventListener("beforeinput", blockScientificBeforeInput, true);
    };
  }, []);

  return (
    <>
      <Toaster
        position="top-center"
        containerClassName="starco-toast-container"
        toastOptions={{
          duration: 3000,
          className: "starco-toast",
          style: {
            width: "min(560px, calc(100vw - 24px))",
            maxWidth: "calc(100vw - 24px)",
            borderRadius: "14px",
            padding: "15px 18px",
            fontSize: "15px",
            lineHeight: 1.7,
            fontFamily: "Tajawal, sans-serif",
            fontWeight: 700,
            textAlign: "right",
            direction: "rtl",
            justifyContent: "flex-start",
            overflowWrap: "anywhere",
            color: "var(--text)",
            background: "var(--surface)",
            boxShadow: isDark ? "0 16px 40px rgba(0, 0, 0, .38)" : "0 12px 30px rgba(31, 41, 55, .14)",
          },
          success: {
            style: {
              border: "1px solid #22c55e",
              textAlign: "right",
              direction: "rtl",
            },
          },
          error: {
            style: {
              border: "1px solid #ef4444",
              textAlign: "right",
              direction: "rtl",
            },
          },
        }}
      />
      <Routes>
        <Route path="/client-project/:id" element={<ClientProjectPreview />} />
        <Route path="/p/:previewKey" element={<ClientProjectPreview />} />

        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />

          <Route path="/register" element={<Register />} />
          <Route path="/register/google" element={<GoogleRegisterCompletion />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/projects" element={<Projects />} />
          <Route path="/new-project" element={<RoleRoute allowedRoles={["Marketer"]}><NewProject /></RoleRoute>} />
          <Route path="/projects/:id" element={<ProjectFolder />} />
          <Route path="/projects/:id/panels/:panelId" element={<EditProject />} />
          <Route path="/panels" element={<Panels />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/pending-users" element={<PendingUsers />} />
          <Route path="/configuration" element={<RoleRoute allowedRoles={["OwnerManager", "Engineer", "MarketingManager"]}><Configuration /></RoleRoute>} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/clients" element={<RoleRoute allowedRoles={["OwnerManager", "Engineer", "MarketingManager"]}><Clients /></RoleRoute>} />
          <Route path="/deleted-projects" element={<DeletedProjects />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />

        {/* 
        <Route path="/clients" element={<Clients />} />

        <Route path="/deleted-projects" element={<DeletedProjects />} />

        */}
      </Routes>
    </>
  );
}

export default App;
