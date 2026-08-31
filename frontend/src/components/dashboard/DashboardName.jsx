import { getPanelNameDirection } from "../../utils/panelNameDirection";

function DashboardName({ children, className }) {
  const value = String(children || "—");
  return <bdi className={className} dir={getPanelNameDirection(value)}>{value}</bdi>;
}

export default DashboardName;
