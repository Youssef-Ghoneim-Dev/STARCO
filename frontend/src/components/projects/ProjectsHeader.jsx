import { FiFilter, FiPlus, FiRefreshCw, FiSearch } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import StyledSelect from "../common/StyledSelect";

const defaultStatuses = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "created", label: "Created" },
  { value: "inProgress", label: "In progress" },
  { value: "completed", label: "Fully completed" },
];

function ProjectsHeader({ query, onQueryChange, status, onStatusChange, onRefresh, refreshing, title = "Projects", subtitle = "Manage all your projects in one place.", searchPlaceholder = "Search by project name...", statusOptions = defaultStatuses, showCreate = true }) {
  const { user } = useAuth();
  return (
    <div className="projects-header">
      <div>
        <h1>{title}</h1>

        <p>{subtitle}</p>
      </div>
      <div className="projects-header-actions">
        <button type="button" className="projects-refresh-btn" onClick={onRefresh} disabled={refreshing} title="تحديث المشاريع" aria-label="تحديث المشاريع"><FiRefreshCw className={refreshing ? "is-spinning" : ""} /><span>تحديث</span></button>
        <label className="projects-search">
          <FiSearch />
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={searchPlaceholder} />
        </label>
        <div className="projects-filter">
          <FiFilter />
          <StyledSelect value={status} onChange={onStatusChange} options={statusOptions} direction="ltr" />
        </div>
        {showCreate && user?.role === "Marketer" && <NavLink to="/new-project" className="new-project-link">
          <button className="new-project-btn"><FiPlus />New Project</button>
        </NavLink>}
      </div>
    </div>
  );
}

export default ProjectsHeader;
