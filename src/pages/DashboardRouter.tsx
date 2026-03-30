import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "./Dashboard";
import EndUserDashboard from "./dashboards/EndUserDashboard";
import TechnicianDashboard from "./dashboards/TechnicianDashboard";
import ViewerDashboard from "./dashboards/ViewerDashboard";

const DashboardRouter = () => {
  const { role } = useAuth();

  switch (role) {
    case "end_user":
      return <EndUserDashboard />;
    case "technician":
      return <TechnicianDashboard />;
    case "viewer":
      return <ViewerDashboard />;
    case "ict_admin":
    default:
      return <Dashboard />;
  }
};

export default DashboardRouter;
