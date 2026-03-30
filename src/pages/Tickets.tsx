import { useState } from "react";
import { Plus, Search, MessageSquare, ArrowLeft, Send, User, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTickets, useTicketComments, useTechnicians } from "@/hooks/useSupabaseQuery";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const priorityClass: Record<string, string> = {
  Critical: "status-critical",
  High: "status-in-progress",
  Medium: "status-open",
  Low: "status-closed",
};

const statusClass: Record<string, string> = {
  Open: "status-open",
  "In Progress": "status-in-progress",
  "Waiting for User": "status-in-progress",
  Resolved: "status-resolved",
  Closed: "status-closed",
};

const Tickets = () => {
  const { data: tickets = [], isLoading } = useTickets();
  const { data: techData = [] } = useTechnicians();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [newTicket, setNewTicket] = useState({ title: "", description: "", category: "", priority: "Medium", type: "Issue" });
  const { toast } = useToast();
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const { data: comments = [] } = useTicketComments(selectedTicketId);

  const canManage = role === "ict_admin" || role === "technician";
  const selectedTicket = tickets.find((t: any) => t.id === selectedTicketId);

  const filtered = tickets.filter((t: any) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.ticket_number.toLowerCase().includes(search.toLowerCase());
    if (tab === "all") return matchSearch;
    if (tab === "open") return matchSearch && !["Resolved", "Closed"].includes(t.status);
    if (tab === "resolved") return matchSearch && ["Resolved", "Closed"].includes(t.status);
    return matchSearch;
  });

  const handleCreate = async () => {
    if (!newTicket.title || !newTicket.category) {
      toast({ title: "Missing fields", description: "Subject and category are required.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("tickets").insert({
      title: newTicket.title,
      description: newTicket.description,
      category: newTicket.category,
      priority: newTicket.priority,
      type: newTicket.type,
      ticket_number: "",
      submitted_by: user!.id,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["tickets"] });
    setCreateOpen(false);
    setNewTicket({ title: "", description: "", category: "", priority: "Medium", type: "Issue" });
    toast({ title: "Ticket created", description: "Your ticket has been submitted." });
  };

  const updateTicketStatus = async (id: string, status: string) => {
    const update: any = { status };
    if (status === "Resolved") update.resolved_at = new Date().toISOString();
    const { error } = await supabase.from("tickets").update(update).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["tickets"] });
    toast({ title: "Status updated" });
  };

  const assignTicket = async (id: string, assigneeId: string) => {
    const { error } = await supabase.from("tickets").update({ assigned_to: assigneeId === "unassigned" ? null : assigneeId }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["tickets"] });
    toast({ title: "Ticket assigned" });
  };

  const addComment = async () => {
    if (!newComment.trim() || !selectedTicketId) return;
    const { error } = await supabase.from("ticket_comments").insert({
      ticket_id: selectedTicketId,
      author_id: user!.id,
      content: newComment,
      is_internal: isInternal,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["ticket_comments", selectedTicketId] });
    setNewComment("");
    setIsInternal(false);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  // Detail view
  if (selectedTicket) {
    const slaResponseDue = selectedTicket.sla_response_due ? new Date(selectedTicket.sla_response_due) : null;
    const slaResolutionDue = selectedTicket.sla_resolution_due ? new Date(selectedTicket.sla_resolution_due) : null;
    const now = new Date();

    return (
      <div className="space-y-6">
        <Button variant="ghost" className="gap-2" onClick={() => setSelectedTicketId(null)}>
          <ArrowLeft className="h-4 w-4" /> Back to tickets
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm text-muted-foreground">{selectedTicket.ticket_number}</span>
                <span className={`status-badge ${priorityClass[selectedTicket.priority]}`}>{selectedTicket.priority}</span>
                <span className={`status-badge ${statusClass[selectedTicket.status]}`}>{selectedTicket.status}</span>
              </div>
              <h1 className="text-xl font-semibold">{selectedTicket.title}</h1>
            </div>

            <Card>
              <CardContent className="p-4">
                <p className="text-sm">{selectedTicket.description || "No description provided."}</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><User className="h-3 w-3" /> {selectedTicket.submitter?.full_name || "Unknown"}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(selectedTicket.created_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* SLA Info */}
            {slaResponseDue && (
              <div className="flex gap-4 text-xs">
                <div className={`px-3 py-2 rounded-lg ${slaResponseDue < now ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
                  Response due: {slaResponseDue.toLocaleString()}
                </div>
                {slaResolutionDue && (
                  <div className={`px-3 py-2 rounded-lg ${slaResolutionDue < now ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
                    Resolution due: {slaResolutionDue.toLocaleString()}
                  </div>
                )}
              </div>
            )}

            {/* Comments */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Comments ({comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {comments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>
                )}
                {comments.map((c: any) => (
                  <div key={c.id} className={`flex gap-3 ${c.is_internal ? "bg-warning/5 rounded-lg p-3" : ""}`}>
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs bg-accent text-accent-foreground">
                        {(c.author?.full_name || "U").split(" ").map((n: string) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{c.author?.full_name || "Unknown"}</span>
                        {c.is_internal && <span className="text-xs bg-warning/15 text-warning px-1.5 py-0.5 rounded">Internal</span>}
                        <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm mt-1">{c.content}</p>
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input placeholder="Add a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && addComment()} className="flex-1" />
                    <Button size="icon" onClick={addComment} disabled={!newComment.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  {canManage && (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} className="rounded" />
                      Internal note (hidden from end user)
                    </label>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {canManage && (
              <>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Update Status</CardTitle></CardHeader>
                  <CardContent>
                    <Select value={selectedTicket.status} onValueChange={(v) => updateTicketStatus(selectedTicket.id, v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Waiting for User">Waiting for User</SelectItem>
                        <SelectItem value="Resolved">Resolved</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Assign Technician</CardTitle></CardHeader>
                  <CardContent>
                    <Select value={selectedTicket.assigned_to || "unassigned"} onValueChange={(v) => assignTicket(selectedTicket.id, v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {techData.map((t: any) => (
                          <SelectItem key={t.user_id} value={t.user_id}>{t.profile?.full_name || t.user_id}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              </>
            )}
            <Card>
              <CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div><p className="text-muted-foreground">Requester</p><p className="font-medium">{selectedTicket.submitter?.full_name || "Unknown"}</p></div>
                <div><p className="text-muted-foreground">Category</p><p className="font-medium">{selectedTicket.category}</p></div>
                <div><p className="text-muted-foreground">Type</p><p className="font-medium">{selectedTicket.type}</p></div>
                <div><p className="text-muted-foreground">Created</p><p className="font-medium">{new Date(selectedTicket.created_at).toLocaleDateString()}</p></div>
                <div><p className="text-muted-foreground">Assigned To</p><p className="font-medium">{selectedTicket.assignee?.full_name || "Unassigned"}</p></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-header">Help Desk</h1>
          <p className="page-description">Manage support tickets and service requests</p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Ticket
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All ({tickets.length})</TabsTrigger>
            <TabsTrigger value="open">Active ({tickets.filter((t: any) => !["Resolved", "Closed"].includes(t.status)).length})</TabsTrigger>
            <TabsTrigger value="resolved">Resolved ({tickets.filter((t: any) => ["Resolved", "Closed"].includes(t.status)).length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tickets..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium text-muted-foreground">Ticket</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Category</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Priority</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Requester</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Assigned</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ticket: any) => (
                  <tr key={ticket.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedTicketId(ticket.id)}>
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{ticket.title}</p>
                        <p className="text-xs text-muted-foreground font-mono">{ticket.ticket_number}</p>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{ticket.category}</td>
                    <td className="p-4"><span className={`status-badge ${priorityClass[ticket.priority]}`}>{ticket.priority}</span></td>
                    <td className="p-4"><span className={`status-badge ${statusClass[ticket.status]}`}>{ticket.status}</span></td>
                    <td className="p-4 text-muted-foreground">{ticket.submitter?.full_name || "Unknown"}</td>
                    <td className="p-4 text-muted-foreground">{ticket.assignee?.full_name || "Unassigned"}</td>
                    <td className="p-4 text-muted-foreground">{new Date(ticket.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No tickets found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Ticket Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Input placeholder="Brief description of the issue" value={newTicket.title} onChange={(e) => setNewTicket(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={newTicket.category} onValueChange={(v) => setNewTicket(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hardware">Hardware</SelectItem>
                    <SelectItem value="Software">Software</SelectItem>
                    <SelectItem value="Network">Network</SelectItem>
                    <SelectItem value="Access Request">Access Request</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={newTicket.type} onValueChange={(v) => setNewTicket(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Issue">Issue</SelectItem>
                    <SelectItem value="Inquiry">Inquiry</SelectItem>
                    <SelectItem value="Suggestion">Suggestion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={newTicket.priority} onValueChange={(v) => setNewTicket(p => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={4} placeholder="Describe the issue in detail..." value={newTicket.description} onChange={(e) => setNewTicket(p => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleCreate}>Submit Ticket</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tickets;
