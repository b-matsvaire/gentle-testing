import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAssets, useTickets } from "@/hooks/useSupabaseQuery";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const Reports = () => {
  const { toast } = useToast();
  const { data: assets = [] } = useAssets();
  const { data: tickets = [] } = useTickets();

  // Compute ticket stats
  const ticketsByCategory = ["Hardware", "Software", "Network", "Access Request", "Other"].map(cat => ({
    name: cat, count: tickets.filter((t: any) => t.category === cat).length,
  })).filter(c => c.count > 0);

  const ticketsByStatus = ["Open", "In Progress", "Waiting for User", "Resolved", "Closed"].map(s => ({
    name: s, count: tickets.filter((t: any) => t.status === s).length,
  })).filter(c => c.count > 0);

  // Compute asset stats
  const assetsByType = ["Laptop", "Desktop", "Printer", "Router", "Monitor", "Other"].map(t => ({
    name: t, value: assets.filter((a: any) => a.type === t).length,
    color: { Laptop: "hsl(173, 58%, 39%)", Desktop: "hsl(217, 91%, 60%)", Printer: "hsl(38, 92%, 50%)", Router: "hsl(142, 71%, 45%)", Monitor: "hsl(280, 60%, 55%)", Other: "hsl(215, 13%, 50%)" }[t] || "hsl(215, 13%, 50%)",
  })).filter(c => c.value > 0);

  const assetsByStatus = ["Deployed", "In Stock", "Under Repair", "Retired"].map(s => ({
    name: s, count: assets.filter((a: any) => a.status === s).length,
  })).filter(c => c.count > 0);

  // Warranty expiring in 90 days
  const now = new Date();
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const warrantyExpiring = assets.filter((a: any) => {
    if (!a.warranty_expiry) return false;
    const exp = new Date(a.warranty_expiry);
    return exp >= now && exp <= in90Days;
  });

  const handleExport = (reportName: string) => {
    let csv = "";
    if (reportName === "Help Desk") {
      csv = "Ticket,Title,Category,Priority,Status,Created\n" +
        tickets.map((t: any) => `"${t.ticket_number}","${t.title}","${t.category}","${t.priority}","${t.status}","${t.created_at}"`).join("\n");
    } else if (reportName === "Assets") {
      csv = "Tag,Name,Type,Status,Department,Warranty\n" +
        assets.map((a: any) => `"${a.asset_tag}","${a.name}","${a.type}","${a.status}","${a.department || ""}","${a.warranty_expiry || ""}"`).join("\n");
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${reportName.toLowerCase().replace(" ", "_")}_report.csv`; a.click();
    toast({ title: "Export started", description: `${reportName} report downloaded.` });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Reports</h1>
        <p className="page-description">Analytics and insights for ICT operations</p>
      </div>

      <Tabs defaultValue="helpdesk">
        <TabsList>
          <TabsTrigger value="helpdesk">Help Desk</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
        </TabsList>

        <TabsContent value="helpdesk" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => handleExport("Help Desk")}>
              <Download className="h-4 w-4" /> Export
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="stat-card"><p className="text-sm text-muted-foreground">Total Tickets</p><p className="text-2xl font-bold mt-1">{tickets.length}</p></div>
            <div className="stat-card"><p className="text-sm text-muted-foreground">Open</p><p className="text-2xl font-bold mt-1 text-info">{tickets.filter((t: any) => t.status === "Open").length}</p></div>
            <div className="stat-card"><p className="text-sm text-muted-foreground">In Progress</p><p className="text-2xl font-bold mt-1 text-warning">{tickets.filter((t: any) => t.status === "In Progress").length}</p></div>
            <div className="stat-card"><p className="text-sm text-muted-foreground">Resolved</p><p className="text-2xl font-bold mt-1 text-success">{tickets.filter((t: any) => ["Resolved", "Closed"].includes(t.status)).length}</p></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Tickets by Category</CardTitle></CardHeader>
              <CardContent>
                {ticketsByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={ticketsByCategory}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(214, 20%, 89%)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                      <YAxis axisLine={false} tickLine={false} fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(173, 58%, 39%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">No ticket data yet</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Tickets by Status</CardTitle></CardHeader>
              <CardContent>
                {ticketsByStatus.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={ticketsByStatus}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(214, 20%, 89%)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                      <YAxis axisLine={false} tickLine={false} fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">No ticket data yet</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assets" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => handleExport("Assets")}>
              <Download className="h-4 w-4" /> Export
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="stat-card"><p className="text-sm text-muted-foreground">Total Assets</p><p className="text-2xl font-bold mt-1">{assets.length}</p></div>
            <div className="stat-card"><p className="text-sm text-muted-foreground">Deployed</p><p className="text-2xl font-bold mt-1 text-success">{assets.filter((a: any) => a.status === "Deployed").length}</p></div>
            <div className="stat-card"><p className="text-sm text-muted-foreground">In Stock</p><p className="text-2xl font-bold mt-1 text-info">{assets.filter((a: any) => a.status === "In Stock").length}</p></div>
            <div className="stat-card"><p className="text-sm text-muted-foreground">Warranty Expiring</p><p className="text-2xl font-bold mt-1 text-warning">{warrantyExpiring.length}</p></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Assets by Type</CardTitle></CardHeader>
              <CardContent>
                {assetsByType.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={assetsByType} dataKey="value" cx="50%" cy="50%" outerRadius={100} innerRadius={60} paddingAngle={2}>
                          {assetsByType.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-3 mt-2 justify-center">
                      {assetsByType.map((item) => (
                        <div key={item.name} className="flex items-center gap-1.5 text-xs">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-muted-foreground">{item.name} ({item.value})</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <p className="text-center text-muted-foreground py-8">No asset data yet</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Assets by Status</CardTitle></CardHeader>
              <CardContent>
                {assetsByStatus.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={assetsByStatus}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(214, 20%, 89%)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                      <YAxis axisLine={false} tickLine={false} fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">No asset data yet</p>}
              </CardContent>
            </Card>
          </div>

          {warrantyExpiring.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Warranty Expiring in 90 Days</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {warrantyExpiring.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-warning/5">
                      <div>
                        <p className="text-sm font-medium">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.asset_tag} · {a.type}</p>
                      </div>
                      <p className="text-sm text-warning font-medium">{a.warranty_expiry}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
