export const ROLE_LABELS = {
  OwnerManager: "Owner Manager",
  Engineer: "Drawing Engineer",
  Marketer: "Marketer",
  MarketingManager: "Marketing Manager",
  ProductionManager: "Production Manager",
  ProductionEngineer: "Production Engineer",
  FullEngineer: "Full Engineer",
  LaserSupervisor: "Laser Supervisor",
  ManufacturingSupervisor: "Manufacturing Supervisor",
  PaintingSupervisor: "Painting Supervisor",
  AssemblySupervisor: "Assembly Supervisor",
};

export const DRAWING_ENGINEER_ROLES = ["Engineer", "FullEngineer"];
export const PRODUCTION_CONTROL_ROLES = ["ProductionManager", "ProductionEngineer", "FullEngineer"];
export const PRODUCTION_VIEW_ROLES = [
  ...PRODUCTION_CONTROL_ROLES,
  "LaserSupervisor",
  "ManufacturingSupervisor",
  "PaintingSupervisor",
  "AssemblySupervisor",
];

export const SUPERVISOR_STAGE_BY_ROLE = {
  LaserSupervisor: ["manufacturingFilesReady", "pendingLaserDownload", "laser"],
  ManufacturingSupervisor: ["manufacturing"],
  PaintingSupervisor: ["painting"],
  AssemblySupervisor: ["assembly"],
};

export const roleLabel = (role) => ROLE_LABELS[role] || role || "غير محدد";
export const isDrawingEngineerRole = (role) => DRAWING_ENGINEER_ROLES.includes(role);
export const isProductionControlRole = (role) => PRODUCTION_CONTROL_ROLES.includes(role);
export const isProductionViewRole = (role) => PRODUCTION_VIEW_ROLES.includes(role);
export const isProductionSupervisorRole = (role) => Boolean(SUPERVISOR_STAGE_BY_ROLE[role]);
export const supervisorCanAccessStatus = (role, status) => (SUPERVISOR_STAGE_BY_ROLE[role] || []).includes(status);

