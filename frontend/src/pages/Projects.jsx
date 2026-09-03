import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import DashboardLayout from "../components/layout/DashboardLayout";

import ProjectsHeader from "../components/projects/ProjectsHeader";
import ProjectsGrid from "../components/projects/ProjectsGrid";

import { getProjects } from "../services/projectsAPI";
import { matchesSearchText } from "../utils/textSearch";

import "../styles/projects.css";

function Projects() {
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(() => (searchParams.get("statuses") || "").split(",").filter(Boolean));
  const [deletingProjectId, setDeletingProjectId] = useState("");

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getProjects();
      setProjects(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => { setStatus((searchParams.get("statuses") || "").split(",").filter(Boolean)); }, [searchParams]);

  const filteredProjects = useMemo(() => {
    const statusPriority = {
      draft: 0,
      created: 1,
      editing: 0,
      inProgress: 1,
      pending: 2,
      quoteCompleted: 3,
      executionPdfRequested: 1,
      executionPdfReady: 1,
      executionOrdered: 1,
      manufacturingFilesPending: 1,
      manufacturingFilesReady: 1,
      laserFilesDownloaded: 1,
      completed: 4,
    };

    return projects.filter((project) => {
      const clientName = project.client?.name || "";
      const panelNames = (project.panels || [])
        .map((panel) => panel.panelName || "")
        .join(" ");
      return (
        (!query.trim() ||
          matchesSearchText(clientName, query) ||
          matchesSearchText(panelNames, query)) &&
        (!status.length || status.includes(project.status))
      );
    }).sort((firstProject, secondProject) => {
      const statusDifference =
        (statusPriority[firstProject.status] ?? 3) -
        (statusPriority[secondProject.status] ?? 3);

      if (statusDifference !== 0) return statusDifference;

      return new Date(secondProject.updatedAt || 0) - new Date(firstProject.updatedAt || 0);
    });
  }, [projects, query, status]);

  return (
    <DashboardLayout notAllowed={true}>
      <ProjectsHeader
        query={query}
        onQueryChange={setQuery}
        status={status}
        onStatusChange={setStatus}
        onRefresh={fetchProjects}
        refreshing={loading}
      />

      <ProjectsGrid
        projects={filteredProjects}
        setProjects={setProjects}
        loading={loading}
        deletingProjectId={deletingProjectId}
        setDeletingProjectId={setDeletingProjectId}
      />
    </DashboardLayout>
  );
}

export default Projects;
