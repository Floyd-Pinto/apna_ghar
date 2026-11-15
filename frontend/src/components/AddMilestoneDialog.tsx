import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/services/api";

interface AddMilestoneDialogProps {
  projectId: string;
  /** Suggested phase number (e.g. existing milestones + 1) */
  nextPhase: number;
  onCreated: () => void;
}

/** Lets a builder add a construction milestone (each one gets its own QR code for site uploads). */
export default function AddMilestoneDialog({ projectId, nextPhase, onCreated }: AddMilestoneDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", phase_number: "", target_date: "" });

  const reset = () => setForm({ title: "", description: "", phase_number: String(nextPhase), target_date: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiRequest("/api/projects/milestones/", {
        method: "POST",
        body: JSON.stringify({
          project: projectId,
          title: form.title.trim(),
          description: form.description.trim(),
          phase_number: Number(form.phase_number || nextPhase),
          target_date: form.target_date,
          status: "pending",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          data.detail ||
          Object.entries(data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : String(v)}`)
            .join(" • ");
        throw new Error(message || "Could not create milestone");
      }
      toast({ title: "Milestone added", description: "Its QR code is ready for site uploads." });
      setOpen(false);
      onCreated();
    } catch (err) {
      toast({ title: "Could not add milestone", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className="w-full sm:w-auto"
      >
        <Plus /> Add milestone
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add construction milestone</DialogTitle>
            <DialogDescription>
              Each milestone gets its own QR code. Print it on site and scan it from your phone to upload progress
              photos.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ms-title">Title</Label>
              <Input
                id="ms-title"
                required
                placeholder="e.g. Foundation, Structure, Finishing"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ms-phase">Phase</Label>
                <Input
                  id="ms-phase"
                  type="number"
                  min={1}
                  required
                  value={form.phase_number}
                  onChange={(e) => setForm({ ...form, phase_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ms-date">Target date</Label>
                <Input
                  id="ms-date"
                  type="date"
                  required
                  value={form.target_date}
                  onChange={(e) => setForm({ ...form, target_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ms-desc">Description</Label>
              <Textarea
                id="ms-desc"
                placeholder="What will be completed in this phase?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />} Add milestone
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
