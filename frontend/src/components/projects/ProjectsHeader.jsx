import { FiFilter, FiPlus, FiRefreshCw, FiSearch } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
function ProjectsHeader({ query, onQueryChange, status, onStatusChange, onRefresh, refreshing }) {
  const { user } = useAuth();
  return (
    <div className="projects-header">
      <div>
        <h1>Projects</h1>

        <p>Manage all your projects in one place.</p>
      </div>
      <div className="projects-header-actions">
        <button type="button" className="projects-refresh-btn" onClick={onRefresh} disabled={refreshing} title="تحديث المشاريع" aria-label="تحديث المشاريع"><FiRefreshCw className={refreshing ? "is-spinning" : ""} /><span>تحديث</span></button>
        <label className="projects-search">
          <FiSearch />
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search by project name..." />
        </label>
        <label className="projects-filter">
          <FiFilter />
          <select value={status} onChange={(event) => onStatusChange(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="created">Created</option>
            <option value="inProgress">In progress</option>
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
