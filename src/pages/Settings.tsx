import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSystemSettings } from "@/hooks/useSupabaseQuery";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const SettingsPage = () => {
  const { toast } = useToast();
  const { data: settings, isLoading } = useSystemSettings();
  const queryClient = useQueryClient();

  const [general, setGeneral] = useState<any>(null);
  const [notifications, setNotifications] = useState<any>(null);
  const [sla, setSla] = useState<any>(null);

  // Initialize form state from fetched settings
  if (settings && !general) {
    setGeneral({ org_name: settings.org_name, support_email: settings.support_email, timezone: settings.timezone });
    setNotifications({ notify_email: settings.notify_email, notify_sla: settings.notify_sla, notify_warranty: settings.notify_warranty, notify_new_ticket: settings.notify_new_ticket });
    setSla({ sla_critical_hours: settings.sla_critical_hours, sla_high_hours: settings.sla_high_hours, sla_medium_hours: settings.sla_medium_hours, sla_low_hours: settings.sla_low_hours });
  }

  const saveSettings = async (updates: any, label: string) => {
    const { error } = await supabase.from("system_settings").update(updates).eq("id", 1);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["system_settings"] });
    toast({ title: `${label} saved` });
  };

  if (isLoading || !general) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Settings</h1>
        <p className="page-description">Configure system preferences</p>
      </div>

      <Tabs defaultValue="general" className="max-w-2xl">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="sla">SLA Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Organization</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Organization Name</Label>
                <Input value={general.org_name} onChange={(e) => setGeneral((g: any) => ({ ...g, org_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Support Email</Label>
                <Input value={general.support_email} onChange={(e) => setGeneral((g: any) => ({ ...g, support_email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={general.timezone} onValueChange={(v) => setGeneral((g: any) => ({ ...g, timezone: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Africa/Nairobi">Africa/Nairobi (EAT)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">America/New York (EST)</SelectItem>
                    <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                    <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => saveSettings(general, "General settings")}>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Notification Preferences</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium">Email notifications</p><p className="text-xs text-muted-foreground">Receive email updates for ticket changes</p></div>
                <Switch checked={notifications.notify_email} onCheckedChange={(v) => setNotifications((n: any) => ({ ...n, notify_email: v }))} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium">SLA breach alerts</p><p className="text-xs text-muted-foreground">Get alerted when tickets approach SLA deadlines</p></div>
                <Switch checked={notifications.notify_sla} onCheckedChange={(v) => setNotifications((n: any) => ({ ...n, notify_sla: v }))} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium">Warranty expiry reminders</p><p className="text-xs text-muted-foreground">Notify 30 days before asset warranties expire</p></div>
                <Switch checked={notifications.notify_warranty} onCheckedChange={(v) => setNotifications((n: any) => ({ ...n, notify_warranty: v }))} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium">New ticket notifications</p><p className="text-xs text-muted-foreground">Alert when new tickets are submitted</p></div>
                <Switch checked={notifications.notify_new_ticket} onCheckedChange={(v) => setNotifications((n: any) => ({ ...n, notify_new_ticket: v }))} />
              </div>
              <Button onClick={() => saveSettings(notifications, "Notification preferences")}>Save Preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sla" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">SLA Response Times</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Set maximum response time (in hours) for each priority level.</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Critical (hours)</Label>
                  <Input type="number" value={sla.sla_critical_hours} onChange={(e) => setSla((s: any) => ({ ...s, sla_critical_hours: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>High (hours)</Label>
                  <Input type="number" value={sla.sla_high_hours} onChange={(e) => setSla((s: any) => ({ ...s, sla_high_hours: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Medium (hours)</Label>
                  <Input type="number" value={sla.sla_medium_hours} onChange={(e) => setSla((s: any) => ({ ...s, sla_medium_hours: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Low (hours)</Label>
                  <Input type="number" value={sla.sla_low_hours} onChange={(e) => setSla((s: any) => ({ ...s, sla_low_hours: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
              <Button onClick={() => saveSettings(sla, "SLA settings")}>Save SLA Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
