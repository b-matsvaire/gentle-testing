import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Monitor,
  Ticket,
  BookOpen,
  BarChart3,
  Settings,
  Users,
  LogOut,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth, ROLE_LABELS, type AppRole } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type NavItem = { to: string; icon: typeof LayoutDashboard; label: string; roles: AppRole[] };

const allNavItems: NavItem[] = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ["end_user", "technician", "ict_admin", "viewer"] },
  { to: "/assets", icon: Monitor, label: "Assets", roles: ["end_user", "technician", "ict_admin", "viewer"] },
  { to: "/tickets", icon: Ticket, label: "Help Desk", roles: ["end_user", "technician", "ict_admin"] },
  { to: "/knowledge", icon: BookOpen, label: "Knowledge Base", roles: ["end_user", "technician", "ict_admin"] },
  { to: "/reports", icon: BarChart3, label: "Reports", roles: ["ict_admin", "viewer"] },
  { to: "/users", icon: Users, label: "Users", roles: ["ict_admin"] },
  { to: "/settings", icon: Settings, label: "Settings", roles: ["ict_admin"] },
];

const AppSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { role, profile, signOut } = useAuth();

  const navItems = allNavItems.filter((item) => item.roles.includes(role));

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <>
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col z-50 transition-all duration-300",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
          <img src={logo} alt="Verify Engineering" className="h-8 w-8 rounded object-contain shrink-0" />
          {!collapsed && (
            <span className="text-sm font-semibold text-sidebar-primary-foreground whitespace-nowrap">
              Verify Engineering
            </span>
          )}
        </div>

        {/* User Info */}
        {!collapsed && (
          <div className="px-3 py-3 border-b border-sidebar-border">
            <div className="flex items-center gap-3 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-sidebar-accent text-sidebar-accent-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-primary-foreground truncate">{profile?.full_name || "User"}</p>
                <p className="text-[10px] text-sidebar-muted truncate">{ROLE_LABELS[role]}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4.5 w-4.5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-2 space-y-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent w-full transition-colors"
          >
            {collapsed ? <Menu className="h-4 w-4 shrink-0" /> : <ChevronLeft className="h-4 w-4 shrink-0" />}
            {!collapsed && <span>Collapse</span>}
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent w-full transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>
      {/* Spacer */}
      <div className={cn("shrink-0 transition-all duration-300", collapsed ? "w-16" : "w-60")} />
    </>
  );
};

export default AppSidebar;
