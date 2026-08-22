import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import DashboardLayout from "../components/layout/DashboardLayout";
import { createProject } from "../services/projectsAPI";

// The project is created before the editor opens, so it is itself the
// autosave record for every edit.
function NewProject() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    createProject({})
      .then(({ data }) => {
        if (mounted) navigate(`/projects/${data.project._id}`, { replace: true });
      })
      .catch((requestError) => {
        if (!mounted) return;
        const message = requestError.response?.data?.message || "تعذر بدء مشروع جديد.";
        setError(message);
        toast.error(message);
      });

    return () => { mounted = false; };
  }, [navigate]);

  return (
    <DashboardLayout notAllowed={false}>
      <div className="route-loading" dir="rtl">
        {error || "جاري بدء مشروع جديد..."}
      </div>
    </DashboardLayout>
  );
}

export default NewProject;
