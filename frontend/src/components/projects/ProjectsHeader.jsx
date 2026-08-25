import { FiFilter, FiPlus, FiSearch } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
function ProjectsHeader({ query, onQueryChange, status, onStatusChange }) {
  const { user } = useAuth();
  return (
    <div className="projects-header">
      <div>
        <h1>Projects</h1>

        <p>Manage all your projects in one place.</p>
      </div>
      <div className="projects-header-actions">
        <label className="projects-search">
          <FiSearch />
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search by project name..." />
        </label>
        <label className="projects-filter">
          <FiFilter />
          <select value={status} onChange={(event) => onStatusChange(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="editing">Editing</option>
            <option value="inProgress">In progress</option>
            <option value="quoteCompleted">Quote completed</option>
            <option value="executionPdfRequested">Execution PDF requested</option>
            <option value="executionPdfReady">Execution PDF ready</option>
            <option value="manufacturingFilesPending">Manufacturing files pending</option>
            <option value="manufacturingFilesReady">Manufacturing files ready</option>
            <option value="laserFilesDownloaded">Downloaded to laser</option>
            <option value="executionOrdered">Execution ordered</option>
            <option value="completed">Fully completed</option>
          </select>
        </label>
        {user?.role !== "ProductionManager" && <NavLink to="/new-project" className="new-project-link">
          <button className="new-project-btn"><FiPlus />New Project</button>
        </NavLink>}
      </div>
    </div>
  );
}

export default ProjectsHeader;
