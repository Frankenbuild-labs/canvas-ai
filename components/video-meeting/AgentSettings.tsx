"use client";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { AgentSettings } from "@/types/agent";
import { z } from "zod";

type Props = {
  room: string;
};

export default function AgentSettingsCard({ room }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AgentSettings>({
    enabled: false,
    provider: "beyond",
    displayName: "Agent",
    joinOnStart: true,
    avatarId: "",
    voice: "",
    language: "",
    llmProvider: "openai",
    llmModel: "gpt-4o-mini",
    prompt: "You are a helpful meeting assistant.",
  });

  const onSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/livekit/room/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, agent: settings }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Save failed");
      toast({ title: "Agent settings saved", description: "Stored in room metadata. Your worker can act on it." });
    } catch (e: any) {
      toast({ title: "Unable to save agent", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="font-medium">Meeting Agent</div>
          <div className="text-xs text-muted-foreground">Configure an optional AI participant for this meeting.</div>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="agent-enabled" className="text-sm">Enabled</Label>
          <Switch id="agent-enabled" checked={settings.enabled} onCheckedChange={(v) => setSettings({ ...settings, enabled: v })} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Provider</Label>
          <Select value={settings.provider} onValueChange={(v: any) => setSettings({ ...settings, provider: v })}>
            <SelectTrigger><SelectValue placeholder="Choose provider" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="beyond">Beyond Presence (video avatar)</SelectItem>
              <SelectItem value="livekit">LiveKit Video Agent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Display name</Label>
          <Input value={settings.displayName} onChange={(e) => setSettings({ ...settings, displayName: e.target.value })} />
        </div>
      </div>

      {settings.provider === "beyond" && (
        <div className="space-y-1">
          <Label>Beyond avatar ID (optional)</Label>
          <Input placeholder="e.g. default-ava-1" value={settings.avatarId ?? ""} onChange={(e) => setSettings({ ...settings, avatarId: e.target.value })} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>LLM provider</Label>
          <Input placeholder="openai" value={settings.llmProvider ?? ""} onChange={(e) => setSettings({ ...settings, llmProvider: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>LLM model</Label>
          <Input placeholder="gpt-4o-mini" value={settings.llmModel ?? ""} onChange={(e) => setSettings({ ...settings, llmModel: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Voice</Label>
          <Input placeholder="e.g. en-US voice name" value={settings.voice ?? ""} onChange={(e) => setSettings({ ...settings, voice: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Language</Label>
          <Input placeholder="en-US" value={settings.language ?? ""} onChange={(e) => setSettings({ ...settings, language: e.target.value })} />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Behavior prompt</Label>
        <Textarea rows={4} value={settings.prompt ?? ""} onChange={(e) => setSettings({ ...settings, prompt: e.target.value })} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch id="join-on-start" checked={settings.joinOnStart} onCheckedChange={(v) => setSettings({ ...settings, joinOnStart: v })} />
          <Label htmlFor="join-on-start" className="text-sm">Join automatically when meeting starts</Label>
        </div>
        <Button onClick={onSave} disabled={saving || !settings.enabled}>
          {saving ? "Saving…" : "Save to meeting"}
        </Button>
      </div>
    </div>
  );
}
