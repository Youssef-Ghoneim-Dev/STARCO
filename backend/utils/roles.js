const DRAWING_ENGINEER_ROLES = ["Engineer", "FullEngineer"];
const PRODUCTION_CONTROL_ROLES = ["ProductionManager", "ProductionEngineer", "FullEngineer"];
const SUPERVISOR_STAGE_BY_ROLE = {
    LaserSupervisor: ["manufacturingFilesReady", "pendingLaserDownload", "laser"],
    ManufacturingSupervisor: ["manufacturing"],
    PaintingSupervisor: ["painting"],
    AssemblySupervisor: ["assembly"],
};
const PRODUCTION_VIEW_ROLES = [...PRODUCTION_CONTROL_ROLES, ...Object.keys(SUPERVISOR_STAGE_BY_ROLE)];
const OPERATIONAL_ROLE_ORDER = [
    "Engineer",
    "ProductionEngineer",
    "FullEngineer",
    "LaserSupervisor",
    "ManufacturingSupervisor",
    "PaintingSupervisor",
    "AssemblySupervisor",
    "Marketer",
];
const OWNER_CREATABLE_ROLE_ORDER = [...OPERATIONAL_ROLE_ORDER, "ProductionManager", "MarketingManager"];
const PUBLIC_REGISTRATION_ROLES = [...OPERATIONAL_ROLE_ORDER];

const hasRole = (user, roles) => roles.includes(user?.role);
const isDrawingEngineer = (user) => hasRole(user, DRAWING_ENGINEER_ROLES);
const isProductionController = (user) => hasRole(user, PRODUCTION_CONTROL_ROLES);
const isProductionViewer = (user) => hasRole(user, PRODUCTION_VIEW_ROLES);
const isProductionSupervisor = (user) => Boolean(SUPERVISOR_STAGE_BY_ROLE[user?.role]);
const supervisorCanAccessStatus = (user, status) => (SUPERVISOR_STAGE_BY_ROLE[user?.role] || []).includes(status);

module.exports = {
    DRAWING_ENGINEER_ROLES,
    PRODUCTION_CONTROL_ROLES,
    PRODUCTION_VIEW_ROLES,
    SUPERVISOR_STAGE_BY_ROLE,
    OPERATIONAL_ROLE_ORDER,
    OWNER_CREATABLE_ROLE_ORDER,
    PUBLIC_REGISTRATION_ROLES,
    isDrawingEngineer,
    isProductionController,
    isProductionViewer,
    isProductionSupervisor,
    supervisorCanAccessStatus,
};
