import { DollarSign, TrendingUp, Package, Ticket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useAssets, useTickets } from "@/hooks/useSupabaseQuery";

const ViewerDashboard = () => {
  const { data: assets = [] } = useAssets();
  const { data: tickets = [] } = useTickets();

  const totalValue = assets.reduce((sum: number, a: any) => sum + (parseFloat(a.purchase_cost) || 0), 0);

  const stats = [
    { label: "Total Asset Value", value: `$${(totalValue / 1000).toFixed(1)}K`, icon: DollarSign, change: `${assets.length} assets` },
    { label: "Total Assets", value: assets.length.toString(), icon: Package, change: `${assets.filter((a: any) => a.status === "Deployed").length} deployed` },
    { label: "Tickets This Month", value: tickets.filter((t: any) => new Date(t.created_at).getMonth() === new Date().getMonth()).length.toString(), icon: Ticket, change: "this month" },
    { label: "Open Tickets", value: tickets.filter((t: any) => !["Resolved", "Closed"].includes(t.status)).length.toString(), icon: TrendingUp, change: "active" },
  ];

  const costByDept = Object.entries(
    assets.reduce((acc: any, a: any) => {
      const dept = a.department || "Unknown";
      acc[dept] = (acc[dept] || 0) + (parseFloat(a.purchase_cost) || 0);
      return acc;
    }, {} as Record<string, number>)
  ).map(([dept, cost]) => ({ dept, cost })).sort((a: any, b: any) => b.cost - a.cost).slice(0, 6);

  const assetValueByType = ["Laptop", "Desktop", "Printer", "Router", "Monitor", "Other"].map(t => ({
    name: t + "s",
    value: assets.filter((a: any) => a.type === t).reduce((sum: number, a: any) => sum + (parseFloat(a.purchase_cost) || 0), 0),
    color: { Laptop: "hsl(173, 58%, 39%)", Desktop: "hsl(217, 91%, 60%)", Printer: "hsl(38, 92%, 50%)", Router: "hsl(142, 71%, 45%)", Monitor: "hsl(280, 60%, 55%)", Other: "hsl(215, 13%, 50%)" }[t]!,
  })).filter(d => d.value > 0);

  const now = new Date();
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const warrantyExpiring = assets.filter((a: any) => {
    if (!a.warranty_expiry) return false;
    const exp = new Date(a.warranty_expiry);
    return exp >= now && exp <= in90Days;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Finance Overview</h1>
        <p className="page-description">Read-only view of asset costs and ticket volume</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Cost by Department</CardTitle></CardHeader>
          <CardContent>
            {costByDept.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={costByDept} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(214, 20%, 89%)" />
                  <XAxis type="number" axisLine={false} tickLine={false} fontSize={12} tickFormatter={(v) => `$${v / 1000}K`} />
                  <YAxis type="category" dataKey="dept" axisLine={false} tickLine={false} fontSize={12} width={80} />
                  <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Cost"]} />
                  <Bar dataKey="cost" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-12">No cost data available</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Asset Value by Type</CardTitle></CardHeader>
          <CardContent>
            {assetValueByType.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={assetValueByType} dataKey="value" cx="50%" cy="50%" outerRadius={80} innerRadius={50}>
                      {assetValueByType.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Value"]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-2">
                  {assetValueByType.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <p className="text-center text-muted-foreground py-12">No asset data available</p>}
          </CardContent>
        </Card>
      </div>

      {warrantyExpiring.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Warranty Expiring in 90 Days ({warrantyExpiring.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {warrantyExpiring.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-warning/5">
                  <div>
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.asset_tag} · {a.department || "N/A"}</p>
                  </div>
                  <p className="text-sm text-warning font-medium">{a.warranty_expiry}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ViewerDashboard;
