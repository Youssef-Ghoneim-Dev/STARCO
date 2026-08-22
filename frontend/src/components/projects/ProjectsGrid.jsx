import ProjectCard from "./ProjectCard";

function ProjectsGrid({ projects, setProjects, loading }) {
  if (loading) {
    return <div className="empty-projects">Loading...</div>;
  }

  if (!projects.length) {
    return <div className="empty-projects">No Projects Found</div>;
  }

  return (
    <div className="projects-grid">
      {projects.map((project) => (
        <ProjectCard
          key={project._id}
          project={project}
          setProjects={setProjects}
        />
      ))}
    </div>
  );
}

export default ProjectsGrid;
