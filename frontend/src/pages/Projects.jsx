import { useEffect, useMemo, useState } from "react";

import DashboardLayout from "../components/layout/DashboardLayout";

import ProjectsHeader from "../components/projects/ProjectsHeader";
import ProjectsGrid from "../components/projects/ProjectsGrid";

import { getProjects } from "../services/projectsAPI";

import "../styles/projects.css";

function Projects() {
  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    let mounted = true;

    async function fetchProjects() {
      try {
        const { data } = await getProjects();

        if (mounted) {
          setProjects(data);

          setLoading(false);
        }
      } catch (error) {
        console.log(error);
      }
    }

    fetchProjects();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ar-EG");
    const statusPriority = {
      inProgress: 0,
      pending: 1,
      completed: 2,
    };

    return projects.filter((project) => {
      const clientName = project.client?.name?.toLocaleLowerCase("ar-EG") || "";
      const panelNames = (project.panels || [])
        .map((panel) => panel.panelName?.toLocaleLowerCase("ar-EG") || "")
        .join(" ");
      return (
        (!normalizedQuery ||
          clientName.includes(normalizedQuery) ||
          panelNames.includes(normalizedQuery)) &&
        (status === "all" || project.status === status)
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
      />

      <ProjectsGrid
        projects={filteredProjects}
        setProjects={setProjects}
        loading={loading}
      />
    </DashboardLayout>
  );
}

export default Projects;
