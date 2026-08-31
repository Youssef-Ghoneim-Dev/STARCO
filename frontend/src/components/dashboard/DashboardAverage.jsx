import { formatAverage } from "../../utils/dashboardData";

function DashboardAverage({ result }) {
  if (result?.ready) return <strong>{formatAverage(result)}</strong>;
  const remaining = Math.max(0, 5 - (result?.samples || 0));
  return <div className="dashboard-average-pending"><strong>—</strong><small>سيتم التحديد بعد {remaining} {remaining === 1 ? "عينة" : "عينات"}</small></div>;
}

export default DashboardAverage;
