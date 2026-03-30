import { useState } from "react";
import { Search, MoreHorizontal, Pencil, UserCheck, UserX, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useProfiles } from "@/hooks/useSupabaseQuery";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const roleClass: Record<string, string> = {
  end_user: "status-open",
  technician: "status-in-progress",
  ict_admin: "status-resolved",
  viewer: "status-closed",
};

const roleLabels: Record<string, string> = {
  end_user: "End User",
  technician: "Technician",
  ict_admin: "ICT Administrator",
  viewer: "Viewer",
};

const UsersPage = () => {
  const { data: users = [], isLoading } = useProfiles();
  const [search, setSearch] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({ full_name: "", department: "", role: "end_user" });
  const [addForm, setAddForm] = useState({ email: "", password: "", full_name: "", department: "", role: "end_user" });
  const [addLoading, setAddLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const filtered = users.filter((u: any) =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) || (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (user: any) => {
    setEditingUser(user);
    const userRole = user.user_roles?.[0]?.role || "end_user";
    setEditForm({ full_name: user.full_name, department: user.department || "", role: userRole });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingUser) return;
    const { error: profileError } = await supabase.from("profiles").update({
      full_name: editForm.full_name,
      department: editForm.department || null,
    }).eq("id", editingUser.id);
    if (profileError) { toast({ title: "Error", description: profileError.message, variant: "destructive" }); return; }

    const currentRole = editingUser.user_roles?.[0]?.role;
    if (currentRole !== editForm.role) {
      await supabase.from("user_roles").delete().eq("user_id", editingUser.id);
      await supabase.from("user_roles").insert({ user_id: editingUser.id, role: editForm.role as any });
    }

    queryClient.invalidateQueries({ queryKey: ["profiles"] });
    setEditDialogOpen(false);
    toast({ title: "User updated", description: `${editForm.full_name} has been updated.` });
  };

  const handleAddUser = async () => {
    if (!addForm.email || !addForm.password || !addForm.full_name) {
      toast({ title: "Missing fields", description: "Email, password, and full name are required.", variant: "destructive" });
      return;
    }
    setAddLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: addForm.email,
          password: addForm.password,
          full_name: addForm.full_name,
          department: addForm.department || null,
          role: addForm.role,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      setAddDialogOpen(false);
      setAddForm({ email: "", password: "", full_name: "", department: "", role: "end_user" });
      toast({ title: "User created", description: `${addForm.full_name} has been added.` });
    } catch (err: any) {
      toast({ title: "Error creating user", description: err.message, variant: "destructive" });
    } finally {
      setAddLoading(false);
    }
  };

  const toggleStatus = async (user: any) => {
    const newStatus = !user.is_active;
    const { error } = await supabase.from("profiles").update({ is_active: newStatus }).eq("id", user.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["profiles"] });
    toast({ title: newStatus ? "User activated" : "User deactivated" });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-header">User Management</h1>
          <p className="page-description">Manage system users and roles</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" /> Add User
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search users..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="text-sm text-muted-foreground">{filtered.length} user{filtered.length !== 1 ? "s" : ""}</div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium text-muted-foreground">User</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Role</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Department</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user: any) => {
                  const userRole = user.user_roles?.[0]?.role || "end_user";
                  return (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-accent text-accent-foreground">
                              {user.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.full_name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`status-badge ${roleClass[userRole] || "status-open"}`}>{roleLabels[userRole] || userRole}</span>
                      </td>
                      <td className="p-4 text-muted-foreground">{user.department || "—"}</td>
                      <td className="p-4">
                        <span className={`status-badge ${user.is_active ? "status-resolved" : "status-closed"}`}>
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(user)}>
                              <Pencil className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleStatus(user)}>
                              {user.is_active ? (
                                <><UserX className="h-4 w-4 mr-2" /> Deactivate</>
                              ) : (
                                <><UserCheck className="h-4 w-4 mr-2" /> Activate</>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={addForm.full_name} onChange={(e) => setAddForm(f => ({ ...f, full_name: e.target.value }))} placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={addForm.email} onChange={(e) => setAddForm(f => ({ ...f, email: e.target.value }))} placeholder="john@company.com" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={addForm.password} onChange={(e) => setAddForm(f => ({ ...f, password: e.target.value }))} placeholder="Minimum 6 characters" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={addForm.role} onValueChange={(v) => setAddForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="end_user">End User</SelectItem>
                    <SelectItem value="technician">Technician</SelectItem>
                    <SelectItem value="ict_admin">ICT Administrator</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input value={addForm.department} onChange={(e) => setAddForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Finance" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleAddUser} disabled={addLoading}>
              {addLoading ? <div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" /> : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={editForm.full_name} onChange={(e) => setEditForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editForm.role} onValueChange={(v) => setEditForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="end_user">End User</SelectItem>
                    <SelectItem value="technician">Technician</SelectItem>
                    <SelectItem value="ict_admin">ICT Administrator</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input value={editForm.department} onChange={(e) => setEditForm(f => ({ ...f, department: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSave}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;
