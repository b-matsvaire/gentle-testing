import { Ticket, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useTickets } from "@/hooks/useSupabaseQuery";

const priorityClass: Record<string, string> = {
  Critical: "status-critical",
  High: "status-in-progress",
  Medium: "status-open",
  Low: "status-closed",
};

const statusClass: Record<string, string> = {
  Open: "status-open",
  "In Progress": "status-in-progress",
  "Waiting for User": "status-closed",
  Resolved: "status-resolved",
};

const TechnicianDashboard = () => {
  const { user } = useAuth();
  const { data: tickets = [] } = useTickets();

  const myTickets = tickets.filter((t: any) => t.assigned_to === user?.id);
  const openTickets = myTickets.filter((t: any) => !["Resolved", "Closed"].includes(t.status));
  const resolvedToday = myTickets.filter((t: any) => t.resolved_at && new Date(t.resolved_at).toDateString() === new Date().toDateString());

  const now = new Date();
  const breaching = openTickets.filter((t: any) => t.sla_response_due && new Date(t.sla_response_due) < now);
  const atRisk = openTickets.filter((t: any) => {
    if (!t.sla_response_due) return false;
    const due = new Date(t.sla_response_due);
    const hoursLeft = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursLeft > 0 && hoursLeft <= 4;
  });
  const onTrack = openTickets.filter((t: any) => {
    if (!t.sla_response_due) return true;
    const hoursLeft = (new Date(t.sla_response_due).getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursLeft > 4;
  });

  const stats = [
    { label: "My Open Tickets", value: openTickets.length.toString(), icon: Ticket, change: `${openTickets.filter((t: any) => t.priority === "High" || t.priority === "Critical").length} high priority`, accent: "bg-warning/15 text-warning" },
    { label: "Resolved Today", value: resolvedToday.length.toString(), icon: CheckCircle2, change: "today", accent: "bg-success/15 text-success" },
    { label: "Total Assigned", value: myTickets.length.toString(), icon: Clock, change: "all time", accent: "bg-accent text-accent-foreground" },
    { label: "SLA Breaching", value: breaching.length.toString(), icon: AlertTriangle, change: "needs attention", accent: "bg-destructive/15 text-destructive" },
  ];

  const ticketsByPriority = ["Critical", "High", "Medium", "Low"].map(p => ({
    name: p, count: openTickets.filter((t: any) => t.priority === p).length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Technician Dashboard</h1>
        <p className="page-description">Your assigned tickets and performance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
              </div>
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${stat.accent}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Open Tickets by Priority</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ticketsByPriority}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(214, 20%, 89%)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                <YAxis axisLine={false} tickLine={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" name="Tickets" fill="hsl(173, 58%, 39%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">SLA Status</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10">
              <div><p className="text-sm font-medium text-destructive">Breaching</p><p className="text-xs text-muted-foreground">Overdue</p></div>
              <p className="text-2xl font-bold text-destructive">{breaching.length}</p>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-warning/10">
              <div><p className="text-sm font-medium text-warning">At Risk</p><p className="text-xs text-muted-foreground">Due within 4h</p></div>
              <p className="text-2xl font-bold text-warning">{atRisk.length}</p>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-success/10">
              <div><p className="text-sm font-medium text-success">On Track</p><p className="text-xs text-muted-foreground">More than 4h</p></div>
              <p className="text-2xl font-bold text-success">{onTrack.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">My Assigned Tickets</CardTitle></CardHeader>
        <CardContent>
          {openTickets.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">ID</th>
                    <th className="pb-3 font-medium text-muted-foreground">Subject</th>
                    <th className="pb-3 font-medium text-muted-foreground">Requester</th>
                    <th className="pb-3 font-medium text-muted-foreground">Priority</th>
                    <th className="pb-3 font-medium text-muted-foreground">Status</th>
                    <th className="pb-3 font-medium text-muted-foreground">SLA</th>
                  </tr>
                </thead>
                <tbody>
                  {openTickets.map((ticket: any) => {
                    const slaDue = ticket.sla_response_due ? new Date(ticket.sla_response_due) : null;
                    const hoursLeft = slaDue ? Math.max(0, Math.round((slaDue.getTime() - now.getTime()) / (1000 * 60 * 60) * 10) / 10) : null;
                    return (
                      <tr key={ticket.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-3 font-mono text-xs">{ticket.ticket_number}</td>
                        <td className="py-3 font-medium">{ticket.title}</td>
                        <td className="py-3 text-muted-foreground">{ticket.submitter?.full_name || "Unknown"}</td>
                        <td className="py-3"><span className={`status-badge ${priorityClass[ticket.priority]}`}>{ticket.priority}</span></td>
                        <td className="py-3"><span className={`status-badge ${statusClass[ticket.status] || "status-open"}`}>{ticket.status}</span></td>
                        <td className="py-3 text-xs text-muted-foreground">{hoursLeft !== null ? `${hoursLeft}h left` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <p className="text-center text-muted-foreground py-8">No open tickets assigned to you</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default TechnicianDashboard;
