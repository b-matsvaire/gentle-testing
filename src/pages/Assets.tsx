import { useState } from "react";
import { Plus, Search, Monitor, Laptop, Printer, Wifi, MoreHorizontal, Pencil, Trash2, Eye, Download, Upload, Server, Smartphone, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useAssets, useAssetHistory, useActiveProfiles } from "@/hooks/useSupabaseQuery";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const statusClass: Record<string, string> = {
  Deployed: "status-deployed",
  "In Stock": "status-in-stock",
  Retired: "status-retired",
  "Under Repair": "status-in-progress",
};

const typeIcon: Record<string, typeof Monitor> = {
  Laptop: Laptop,
  Desktop: Monitor,
  Printer: Printer,
  Router: Wifi,
  Monitor: Monitor,
  Server: Server,
  Phone: Smartphone,
  Other: HardDrive,
};

const emptyForm = {
  name: "", type: "", serial_number: "", status: "In Stock", department: "", location: "",
  vendor: "", purchase_date: "", warranty_expiry: "", purchase_cost: "", notes: "", assigned_to: "",
};

const Assets = () => {
  const { data: assets = [], isLoading } = useAssets();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [viewAsset, setViewAsset] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const { toast } = useToast();
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const { data: history = [] } = useAssetHistory(viewAsset?.id);
  const { data: allUsers = [] } = useActiveProfiles();

  const canEdit = role === "ict_admin" || role === "technician";

  const filtered = assets.filter((a: any) => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.asset_tag.toLowerCase().includes(search.toLowerCase()) ||
      (a.serial_number || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    const matchType = typeFilter === "all" || a.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const openCreate = () => {
    setEditingAsset(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (asset: any) => {
    setEditingAsset(asset);
    setForm({
      name: asset.name, type: asset.type, serial_number: asset.serial_number || "",
      status: asset.status, department: asset.department || "", location: asset.location || "",
      vendor: asset.vendor || "", purchase_date: asset.purchase_date || "",
      warranty_expiry: asset.warranty_expiry || "", purchase_cost: asset.purchase_cost?.toString() || "",
      notes: asset.notes || "", assigned_to: asset.assigned_to || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.type) {
      toast({ title: "Missing fields", description: "Name and type are required.", variant: "destructive" });
      return;
    }

    const payload = {
      name: form.name,
      type: form.type,
      serial_number: form.serial_number || null,
      status: form.status,
      department: form.department || null,
      location: form.location || null,
      vendor: form.vendor || null,
      purchase_date: form.purchase_date || null,
      warranty_expiry: form.warranty_expiry || null,
      purchase_cost: form.purchase_cost ? parseFloat(form.purchase_cost) : null,
      notes: form.notes || null,
      assigned_to: form.assigned_to && form.assigned_to !== "unassigned" ? form.assigned_to : null,
    };

    if (editingAsset) {
      const { error } = await supabase.from("assets").update(payload).eq("id", editingAsset.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      // Log history
      await supabase.from("asset_history").insert({
        asset_id: editingAsset.id, action: "Updated", details: `Asset details updated`, performed_by: user?.id,
      });
      toast({ title: "Asset updated", description: `${form.name} has been updated.` });
    } else {
      const { error } = await supabase.from("assets").insert({
        ...payload, asset_tag: "", created_by: user?.id,
      });
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Asset registered", description: `${form.name} has been added to inventory.` });
    }
    queryClient.invalidateQueries({ queryKey: ["assets"] });
    setDialogOpen(false);
  };

  const handleDelete = async (asset: any) => {
    const { error } = await supabase.from("assets").delete().eq("id", asset.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["assets"] });
    setDeleteConfirm(null);
    toast({ title: "Asset deleted", description: `${asset.name} has been removed.` });
  };

  const handleExportCSV = () => {
    const headers = ["Asset Tag", "Name", "Type", "Serial", "Status", "Department", "Vendor", "Purchase Date", "Warranty"];
    const rows = assets.map((a: any) => [a.asset_tag, a.name, a.type, a.serial_number, a.status, a.department, a.vendor, a.purchase_date, a.warranty_expiry]);
    const csv = [headers.join(","), ...rows.map((r: any) => r.map((c: any) => `"${c || ""}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "assets.csv"; a.click();
    toast({ title: "Exported", description: "Assets exported to CSV." });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-header">Asset Management</h1>
          <p className="page-description">Track and manage all ICT equipment</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          {canEdit && (
            <Button className="gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Register Asset
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search assets..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Deployed">Deployed</SelectItem>
            <SelectItem value="In Stock">In Stock</SelectItem>
            <SelectItem value="Retired">Retired</SelectItem>
            <SelectItem value="Under Repair">Under Repair</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Laptop">Laptop</SelectItem>
            <SelectItem value="Desktop">Desktop</SelectItem>
            <SelectItem value="Printer">Printer</SelectItem>
            <SelectItem value="Router">Router</SelectItem>
            <SelectItem value="Monitor">Monitor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="text-sm text-muted-foreground">{filtered.length} asset{filtered.length !== 1 ? "s" : ""} found</div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium text-muted-foreground">Asset</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Serial</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Assigned To</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Department</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Warranty</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((asset: any) => {
                  const Icon = typeIcon[asset.type] || Monitor;
                  return (
                    <tr key={asset.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center">
                            <Icon className="h-4 w-4 text-accent-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{asset.name}</p>
                            <p className="text-xs text-muted-foreground">{asset.asset_tag}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs">{asset.serial_number || "—"}</td>
                      <td className="p-4">
                        <span className={`status-badge ${statusClass[asset.status] || "status-open"}`}>{asset.status}</span>
                      </td>
                      <td className="p-4 text-muted-foreground">{asset.assigned_profile?.full_name || "—"}</td>
                      <td className="p-4 text-muted-foreground">{asset.department || "—"}</td>
                      <td className="p-4 text-muted-foreground">{asset.warranty_expiry || "—"}</td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewAsset(asset)}>
                              <Eye className="h-4 w-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            {canEdit && (
                              <>
                                <DropdownMenuItem onClick={() => openEdit(asset)}>
                                  <Pencil className="h-4 w-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDeleteConfirm(asset)} className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No assets found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAsset ? "Edit Asset" : "Register New Asset"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Asset Name *</Label>
                <Input placeholder="e.g. Dell Latitude 5540" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Asset Type *</Label>
                <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Laptop">Laptop</SelectItem>
                    <SelectItem value="Desktop">Desktop</SelectItem>
                    <SelectItem value="Printer">Printer</SelectItem>
                    <SelectItem value="Router">Router</SelectItem>
                    <SelectItem value="Monitor">Monitor</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Serial Number</Label>
                <Input placeholder="Serial number" value={form.serial_number} onChange={(e) => setForm(f => ({ ...f, serial_number: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="In Stock">In Stock</SelectItem>
                    <SelectItem value="Deployed">Deployed</SelectItem>
                    <SelectItem value="Under Repair">Under Repair</SelectItem>
                    <SelectItem value="Retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select value={form.assigned_to} onValueChange={(v) => setForm(f => ({ ...f, assigned_to: v }))}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {allUsers.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name}{u.department ? ` (${u.department})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input placeholder="Department" value={form.department} onChange={(e) => setForm(f => ({ ...f, department: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input placeholder="Location" value={form.location} onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Purchase Date</Label>
                <Input type="date" value={form.purchase_date} onChange={(e) => setForm(f => ({ ...f, purchase_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Warranty Expiry</Label>
                <Input type="date" value={form.warranty_expiry} onChange={(e) => setForm(f => ({ ...f, warranty_expiry: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Input placeholder="Vendor name" value={form.vendor} onChange={(e) => setForm(f => ({ ...f, vendor: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Purchase Cost</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={form.purchase_cost} onChange={(e) => setForm(f => ({ ...f, purchase_cost: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input placeholder="Additional notes" value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSave}>{editingAsset ? "Update Asset" : "Register Asset"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={!!viewAsset} onOpenChange={() => setViewAsset(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asset Details</DialogTitle>
          </DialogHeader>
          {viewAsset && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-accent flex items-center justify-center">
                  {(() => { const Icon = typeIcon[viewAsset.type] || Monitor; return <Icon className="h-6 w-6 text-accent-foreground" />; })()}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{viewAsset.name}</h3>
                  <p className="text-sm text-muted-foreground">{viewAsset.asset_tag}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground">Type</p><p className="font-medium">{viewAsset.type}</p></div>
                <div><p className="text-muted-foreground">Serial</p><p className="font-medium font-mono">{viewAsset.serial_number || "—"}</p></div>
                <div><p className="text-muted-foreground">Status</p><span className={`status-badge ${statusClass[viewAsset.status] || "status-open"}`}>{viewAsset.status}</span></div>
                <div><p className="text-muted-foreground">Department</p><p className="font-medium">{viewAsset.department || "—"}</p></div>
                <div><p className="text-muted-foreground">Assigned To</p><p className="font-medium">{viewAsset.assigned_profile?.full_name || "—"}</p></div>
                <div><p className="text-muted-foreground">Vendor</p><p className="font-medium">{viewAsset.vendor || "—"}</p></div>
                <div><p className="text-muted-foreground">Purchase Date</p><p className="font-medium">{viewAsset.purchase_date || "—"}</p></div>
                <div><p className="text-muted-foreground">Warranty Expiry</p><p className="font-medium">{viewAsset.warranty_expiry || "—"}</p></div>
                <div><p className="text-muted-foreground">Cost</p><p className="font-medium">{viewAsset.purchase_cost ? `$${viewAsset.purchase_cost}` : "—"}</p></div>
                <div><p className="text-muted-foreground">Location</p><p className="font-medium">{viewAsset.location || "—"}</p></div>
              </div>

              {history.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">History</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {history.map((h: any) => (
                      <div key={h.id} className="text-xs p-2 bg-muted/50 rounded">
                        <span className="font-medium">{h.action}</span> — {h.details}
                        <span className="text-muted-foreground ml-2">{new Date(h.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Asset</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Assets;
