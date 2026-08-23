import { FiFilter, FiPlus, FiSearch } from "react-icons/fi";
import { NavLink } from "react-router-dom";
function ProjectsHeader({ query, onQueryChange, status, onStatusChange }) {
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
            <option value="completed">Completed</option>
          </select>
        </label>
        <NavLink to="/new-project" className="new-project-link">
          <button className="new-project-btn"><FiPlus />New Project</button>
        </NavLink>
      </div>
    </div>
  );
}

export default ProjectsHeader;
