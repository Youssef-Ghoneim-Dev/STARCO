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

function App() {
  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,

          style: {
            minWidth: "30%",
            borderRadius: "12px",
            padding: "14px 18px",
            fontSize: "15px",
            textAlign: "left",
            direction: "ltr",
            justifyContent: "left",
          },

          success: {
            style: {
              border: "1px solid #22c55e",
              textAlign: "left",
              justifyContent: "left",
            },
          },

          error: {
            style: {
              border: "1px solid #ef4444",
              textAlign: "left",
              justifyContent: "left",
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
          <Route path="/new-project" element={<NewProject />} />
          <Route path="/projects/:id" element={<ProjectFolder />} />
          <Route path="/projects/:id/panels/:panelId" element={<EditProject />} />
          <Route path="/panels" element={<Panels />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/pending-users" element={<PendingUsers />} />
          <Route path="/configuration" element={<Configuration />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/clients" element={<Clients />} />
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
