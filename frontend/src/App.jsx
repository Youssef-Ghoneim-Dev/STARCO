import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ToastBar, Toaster } from "react-hot-toast";
import ErrorDetailsModal from "./components/common/errors/ErrorDetailsModal";
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

function App() {
  useEffect(() => {
    const isNumberInput = (target) =>
      target?.tagName === "INPUT" && target.type === "number";
    const blockScientificNotation = (event) => {
      if (
        isNumberInput(event.target) &&
        ["e", "E", "+", "-"].includes(event.key)
      )
        event.preventDefault();
    };
    const blockScientificPaste = (event) => {
      if (!isNumberInput(event.target)) return;
      const pasted = event.clipboardData?.getData("text") || "";
      if (/[eE+-]/.test(pasted)) event.preventDefault();
    };
    const blockScientificBeforeInput = (event) => {
      if (isNumberInput(event.target) && /[eE+-]/.test(event.data || ""))
        event.preventDefault();
    };
    document.addEventListener("keydown", blockScientificNotation, true);
    document.addEventListener("paste", blockScientificPaste, true);
    document.addEventListener("beforeinput", blockScientificBeforeInput, true);
    return () => {
      document.removeEventListener("keydown", blockScientificNotation, true);
      document.removeEventListener("paste", blockScientificPaste, true);
      document.removeEventListener(
        "beforeinput",
        blockScientificBeforeInput,
        true,
      );
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
            width: "min(420px, calc(100vw - 32px))",
            maxWidth: "calc(100vw - 32px)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "12px 16px",
            fontSize: "15px",
            lineHeight: 1.55,
            fontFamily: "Tajawal, sans-serif",
            fontWeight: 700,
            textAlign: "left",
            direction: "ltr",
            justifyContent: "flex-start",
            overflowWrap: "anywhere",
            color: "var(--text)",
            background: "var(--surface)",
            boxShadow: "var(--shadow)",
          },
          success: {
            style: {
              border: "1px solid var(--success)",
            },
          },
          error: {
            style: {
              border: "1px solid var(--danger)",
            },
          },
        }}
      >
        {(toastItem) => (
          <ToastBar toast={toastItem}>
            {({ icon, message }) => (
              <div className="starco-toast-content">
                <span className="starco-toast-icon">{icon}</span>
                <span className="starco-toast-message" dir="auto">
                  {message}
                </span>
              </div>
            )}
          </ToastBar>
        )}
      </Toaster>
      <ErrorDetailsModal />
      <Routes>
        <Route path="/client-project/:id" element={<ClientProjectPreview />} />
        <Route path="/p/:previewKey" element={<ClientProjectPreview />} />

        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />

          <Route path="/register" element={<Register />} />
          <Route
            path="/register/google"
            element={<GoogleRegisterCompletion />}
          />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/projects" element={<Projects />} />
          <Route
            path="/new-project"
            element={
              <RoleRoute allowedRoles={["Marketer"]}>
                <NewProject />
              </RoleRoute>
            }
          />
          <Route path="/projects/:id" element={<ProjectFolder />} />
          <Route
            path="/projects/:id/panels/:panelId"
            element={<EditProject />}
          />
          <Route path="/panels" element={<Panels />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route
            path="/users"
            element={
              <RoleRoute
                allowedRoles={[
                  "OwnerManager",
                  "MarketingManager",
                  "ProductionManager",
                ]}
              >
                <Users />
              </RoleRoute>
            }
          />
          <Route
            path="/pending-users"
            element={
              <RoleRoute
                allowedRoles={[
                  "OwnerManager",
                  "MarketingManager",
                  "ProductionManager",
                ]}
              >
                <PendingUsers />
              </RoleRoute>
            }
          />
          <Route
            path="/configuration"
            element={
              <RoleRoute
                allowedRoles={[
                  "OwnerManager",
                  "Engineer",
                  "FullEngineer",
                  "MarketingManager",
                ]}
              >
                <Configuration />
              </RoleRoute>
            }
          />
          <Route path="/profile" element={<Profile />} />
          <Route
            path="/clients"
            element={
              <RoleRoute
                allowedRoles={[
                  "OwnerManager",
                  "Engineer",
                  "FullEngineer",
                  "MarketingManager",
                ]}
              >
                <Clients />
              </RoleRoute>
            }
          />
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
