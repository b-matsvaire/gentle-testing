import { useState } from "react";
import { Search, BookOpen, ExternalLink, Plus, ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useKnowledgeArticles } from "@/hooks/useSupabaseQuery";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const categoryColors: Record<string, string> = {
  Network: "bg-info/15 text-info",
  Access: "bg-warning/15 text-warning",
  Software: "bg-primary/15 text-primary",
  Hardware: "bg-success/15 text-success",
  General: "bg-muted text-muted-foreground",
};

const KnowledgeBase = () => {
  const { data: articles = [], isLoading } = useKnowledgeArticles();
  const [search, setSearch] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", category: "", excerpt: "", content: "", is_published: false });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const { toast } = useToast();
  const { role, user } = useAuth();
  const queryClient = useQueryClient();

  const canEdit = role === "ict_admin" || role === "technician";

  const filtered = articles.filter((a: any) =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    (a.excerpt || "").toLowerCase().includes(search.toLowerCase()) ||
    a.category.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingId(null);
    setEditForm({ title: "", category: "", excerpt: "", content: "", is_published: false });
    setEditOpen(true);
  };

  const openEditArticle = (article: any) => {
    setEditingId(article.id);
    setEditForm({ title: article.title, category: article.category, excerpt: article.excerpt || "", content: article.content, is_published: article.is_published });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editForm.title || !editForm.category || !editForm.content) {
      toast({ title: "Missing fields", description: "Title, category, and content are required.", variant: "destructive" });
      return;
    }
    if (editingId) {
      const { error } = await supabase.from("knowledge_articles").update({
        title: editForm.title, category: editForm.category, excerpt: editForm.excerpt, content: editForm.content, is_published: editForm.is_published,
      }).eq("id", editingId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Article updated" });
    } else {
      const { error } = await supabase.from("knowledge_articles").insert({
        title: editForm.title, category: editForm.category, excerpt: editForm.excerpt, content: editForm.content,
        is_published: editForm.is_published, author_id: user!.id,
      });
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Article created" });
    }
    queryClient.invalidateQueries({ queryKey: ["knowledge_articles"] });
    setEditOpen(false);
  };

  const handleDelete = async (article: any) => {
    const { error } = await supabase.from("knowledge_articles").delete().eq("id", article.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["knowledge_articles"] });
    setDeleteConfirm(null);
    if (selectedArticle?.id === article.id) setSelectedArticle(null);
    toast({ title: "Article deleted" });
  };

  const incrementViews = async (article: any) => {
    await supabase.from("knowledge_articles").update({ views_count: (article.views_count || 0) + 1 }).eq("id", article.id);
    setSelectedArticle({ ...article, views_count: (article.views_count || 0) + 1 });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (selectedArticle) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Button variant="ghost" className="gap-2" onClick={() => setSelectedArticle(null)}>
          <ArrowLeft className="h-4 w-4" /> Back to articles
        </Button>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`status-badge ${categoryColors[selectedArticle.category] || "bg-muted text-muted-foreground"}`}>{selectedArticle.category}</span>
            <span className="text-xs text-muted-foreground">{selectedArticle.views_count} views · Updated {new Date(selectedArticle.updated_at).toLocaleDateString()}</span>
            {!selectedArticle.is_published && <span className="status-badge bg-warning/15 text-warning">Draft</span>}
          </div>
          <div className="flex items-start justify-between">
            <h1 className="text-2xl font-semibold">{selectedArticle.title}</h1>
            {canEdit && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEditArticle(selectedArticle)}>
                  <Pencil className="h-4 w-4 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeleteConfirm(selectedArticle)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">By {selectedArticle.author?.full_name || "Unknown"}</p>
        </div>
        <Card>
          <CardContent className="p-6 prose prose-sm max-w-none">
            {selectedArticle.content.split("\n").map((line: string, i: number) => {
              if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-semibold mt-4 mb-2">{line.replace("## ", "")}</h2>;
              if (line.startsWith("- [ ] ")) return <div key={i} className="flex items-center gap-2 text-sm py-0.5"><input type="checkbox" className="rounded" /><span>{line.replace("- [ ] ", "")}</span></div>;
              if (line.startsWith("- ")) return <li key={i} className="text-sm ml-4">{line.replace("- ", "")}</li>;
              if (line.match(/^\d+\./)) return <li key={i} className="text-sm ml-4 list-decimal">{line.replace(/^\d+\.\s/, "")}</li>;
              if (line.trim() === "") return <br key={i} />;
              return <p key={i} className="text-sm">{line}</p>;
            })}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-header">Knowledge Base</h1>
          <p className="page-description">Find solutions to common IT issues</p>
        </div>
        {canEdit && (
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Article
          </Button>
        )}
      </div>

      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search articles..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="text-sm text-muted-foreground">{filtered.length} article{filtered.length !== 1 ? "s" : ""} found</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((article: any) => (
          <Card key={article.id} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => { incrementViews(article); }}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`status-badge ${categoryColors[article.category] || "bg-muted text-muted-foreground"}`}>{article.category}</span>
                  {!article.is_published && <span className="status-badge bg-warning/15 text-warning text-[10px]">Draft</span>}
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="font-medium mb-2 group-hover:text-primary transition-colors">{article.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                <span>{article.views_count} views</span>
                <span>Updated {new Date(article.updated_at).toLocaleDateString()}</span>
                <span>By {article.author?.full_name || "Unknown"}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-muted-foreground col-span-2 text-center py-8">No articles found</p>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Article" : "New Article"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={editForm.title} onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={editForm.category} onValueChange={(v) => setEditForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Network">Network</SelectItem>
                    <SelectItem value="Software">Software</SelectItem>
                    <SelectItem value="Hardware">Hardware</SelectItem>
                    <SelectItem value="Access">Access</SelectItem>
                    <SelectItem value="General">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Published</Label>
                <div className="flex items-center gap-2 pt-2">
                  <Switch checked={editForm.is_published} onCheckedChange={(v) => setEditForm(f => ({ ...f, is_published: v }))} />
                  <span className="text-sm text-muted-foreground">{editForm.is_published ? "Published" : "Draft"}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Excerpt</Label>
              <Input value={editForm.excerpt} onChange={(e) => setEditForm(f => ({ ...f, excerpt: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Content *</Label>
              <Textarea rows={8} value={editForm.content} onChange={(e) => setEditForm(f => ({ ...f, content: e.target.value }))} placeholder="Use ## for headings, - for lists" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSave}>{editingId ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Article</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete "<strong>{deleteConfirm?.title}</strong>"?</p>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KnowledgeBase;
