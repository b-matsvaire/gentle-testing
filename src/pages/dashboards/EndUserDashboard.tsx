import { Monitor, Ticket, Clock, Plus, ExternalLink, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAssets, useTickets, useKnowledgeArticles } from "@/hooks/useSupabaseQuery";

const statusClass: Record<string, string> = {
  Open: "status-open",
  "In Progress": "status-in-progress",
  Resolved: "status-resolved",
};

const EndUserDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: assets = [] } = useAssets();
  const { data: tickets = [] } = useTickets();
  const { data: articles = [] } = useKnowledgeArticles();

  const myAssets = assets.filter((a: any) => a.assigned_to === user?.id);
  const myTickets = tickets.filter((t: any) => t.submitted_by === user?.id);
  const openTickets = myTickets.filter((t: any) => !["Resolved", "Closed"].includes(t.status));
  const topArticles = articles.filter((a: any) => a.is_published).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">My Dashboard</h1>
          <p className="page-description">Welcome back! Here's your IT overview.</p>
        </div>
        <Button onClick={() => navigate("/tickets")} className="gap-2">
          <Plus className="h-4 w-4" /> New Ticket
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
              <Monitor className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{myAssets.length}</p>
              <p className="text-sm text-muted-foreground">Assigned Assets</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/15 flex items-center justify-center">
              <Ticket className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{openTickets.length}</p>
              <p className="text-sm text-muted-foreground">Open Tickets</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/15 flex items-center justify-center">
              <Clock className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{myTickets.length}</p>
              <p className="text-sm text-muted-foreground">Total Tickets</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">My Assets</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/assets")} className="text-xs gap-1">
              View All <ExternalLink className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {myAssets.length > 0 ? (
              <div className="space-y-3">
                {myAssets.slice(0, 5).map((asset: any) => (
                  <div key={asset.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-accent flex items-center justify-center">
                        <Monitor className="h-4 w-4 text-accent-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{asset.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{asset.asset_tag}</p>
                      </div>
                    </div>
                    <span className="status-badge status-deployed">{asset.status}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground text-center py-6">No assets assigned to you</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">My Tickets</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/tickets")} className="text-xs gap-1">
              View All <ExternalLink className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {myTickets.length > 0 ? (
              <div className="space-y-3">
                {myTickets.slice(0, 5).map((ticket: any) => (
                  <div key={ticket.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{ticket.title}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-mono">{ticket.ticket_number}</span> · {new Date(ticket.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`status-badge ${statusClass[ticket.status] || "status-open"}`}>{ticket.status}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground text-center py-6">No tickets submitted yet</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Popular Help Articles</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/knowledge")} className="text-xs gap-1">
            <Search className="h-3 w-3" /> Browse All
          </Button>
        </CardHeader>
        <CardContent>
          {topArticles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {topArticles.map((article: any) => (
                <div key={article.id} className="p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow cursor-pointer" onClick={() => navigate("/knowledge")}>
                  <p className="text-sm font-medium">{article.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{article.views_count} views</p>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground text-center py-6">No articles published yet</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default EndUserDashboard;
