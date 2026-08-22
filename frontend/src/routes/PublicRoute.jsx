import { Navigate, Outlet } from "react-router-dom";

function PublicRoute() {

    const token = localStorage.getItem("token");

    return token
        ? <Navigate to="/projects" replace />
        : <Outlet />;

}

export default PublicRoute;