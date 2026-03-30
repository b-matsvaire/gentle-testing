import {
  Monitor, Ticket, CheckCircle2, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useAssets, useTickets } from "@/hooks/useSupabaseQuery";

const priorityClass: Record<string, string> = {
  Critical: "status-critical",
  High: "status-in-progress",
  Medium: "status-open",
  Low: "status-closed",
};

const statusClass: Record<string, string> = {
  Open: "status-open",
  "In Progress": "status-in-progress",
  Resolved: "status-resolved",
  Closed: "status-closed",
};

const Dashboard = () => {
  const { data: assets = [] } = useAssets();
  const { data: tickets = [] } = useTickets();

  const openTickets = tickets.filter((t: any) => !["Resolved", "Closed"].includes(t.status));
  const resolvedToday = tickets.filter((t: any) => {
    if (!t.resolved_at) return false;
    return new Date(t.resolved_at).toDateString() === new Date().toDateString();
  });

  const stats = [
    { label: "Total Assets", value: assets.length.toString(), icon: Monitor, change: `${assets.filter((a: any) => a.status === "Deployed").length} deployed` },
    { label: "Open Tickets", value: openTickets.length.toString(), icon: Ticket, change: `${tickets.filter((t: any) => t.priority === "Critical" && t.status !== "Resolved").length} critical` },
    { label: "Resolved Today", value: resolvedToday.length.toString(), icon: CheckCircle2, change: "today" },
    { label: "Total Tickets", value: tickets.length.toString(), icon: Clock, change: "all time" },
  ];

  const assetDistribution = ["Laptop", "Desktop", "Printer", "Router", "Monitor", "Other"].map(t => ({
    name: t + "s",
    value: assets.filter((a: any) => a.type === t).length,
    color: { Laptop: "hsl(173, 58%, 39%)", Desktop: "hsl(217, 91%, 60%)", Printer: "hsl(38, 92%, 50%)", Router: "hsl(142, 71%, 45%)", Monitor: "hsl(280, 60%, 55%)", Other: "hsl(215, 13%, 50%)" }[t]!,
  })).filter(d => d.value > 0);

  const ticketsByCategory = ["Hardware", "Software", "Network", "Access Request", "Other"].map(c => ({
    name: c, tickets: tickets.filter((t: any) => t.category === c).length,
  })).filter(d => d.tickets > 0);

  const recentTickets = tickets.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Dashboard</h1>
        <p className="page-description">Overview of your ICT operations</p>
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
              <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                <stat.icon className="h-5 w-5 text-accent-foreground" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Tickets by Category</CardTitle></CardHeader>
          <CardContent>
            {ticketsByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={ticketsByCategory}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(214, 20%, 89%)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                  <YAxis axisLine={false} tickLine={false} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="tickets" fill="hsl(173, 58%, 39%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-12">No tickets yet</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Asset Distribution</CardTitle></CardHeader>
          <CardContent>
            {assetDistribution.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={assetDistribution} dataKey="value" cx="50%" cy="50%" outerRadius={80} innerRadius={50}>
                      {assetDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-2">
                  {assetDistribution.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <p className="text-center text-muted-foreground py-12">No assets yet</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Tickets</CardTitle></CardHeader>
        <CardContent>
          {recentTickets.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">ID</th>
                    <th className="pb-3 font-medium text-muted-foreground">Subject</th>
                    <th className="pb-3 font-medium text-muted-foreground">Requester</th>
                    <th className="pb-3 font-medium text-muted-foreground">Priority</th>
                    <th className="pb-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTickets.map((ticket: any) => (
                    <tr key={ticket.id} className="border-b last:border-0">
                      <td className="py-3 font-mono text-xs">{ticket.ticket_number}</td>
                      <td className="py-3">{ticket.title}</td>
                      <td className="py-3 text-muted-foreground">{ticket.submitter?.full_name || "Unknown"}</td>
                      <td className="py-3"><span className={`status-badge ${priorityClass[ticket.priority]}`}>{ticket.priority}</span></td>
                      <td className="py-3"><span className={`status-badge ${statusClass[ticket.status]}`}>{ticket.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-center text-muted-foreground py-8">No tickets yet. Create one from the Help Desk page.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
