import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AccountCombobox } from "@/components/AccountCombobox";
import { CONTACT_ROLES, RELATIONSHIP_STRENGTHS, type Prospect, type Contact } from "@/data/prospects";

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospects: Prospect[];
  addContact: (prospectId: string, contact: Omit<Contact, "id">) => Promise<void>;
}

export function AddContactDialog({ open, onOpenChange, prospects, addContact }: AddContactDialogProps) {
  const [prospectId, setProspectId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setProspectId(null);
    setName("");
    setTitle("");
    setEmail("");
    setPhone("");
    setRole("");
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (!prospectId) { toast.error("Select an account first"); return; }
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      await addContact(prospectId, {
        name: name.trim(),
        title: title.trim(),
        email: email.trim(),
        phone: phone.trim(),
        notes: "",
        role: (role as Contact["role"]) || undefined,
        relationshipStrength: undefined,
        starred: false,
        linkedinUrl: "",
      });
      const acct = prospects.find(p => p.id === prospectId)?.name;
      toast.success(`Contact added to ${acct}`);
      handleClose();
    } catch {
      toast.error("Failed to add contact");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 placeholder:text-muted-foreground transition-all";
  const selectClass = "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 appearance-none cursor-pointer transition-all";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            Add Contact
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Account *</label>
            <AccountCombobox
              accounts={prospects.map(p => ({ id: p.id, name: p.name }))}
              value={prospectId}
              onChange={setProspectId}
              placeholder="Search accounts..."
              triggerClassName="w-full"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Name *</label>
            <input
              className={inputClass}
              placeholder="Full name"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Title</label>
            <input
              className={inputClass}
              placeholder="Job title"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <input
                className={inputClass}
                placeholder="email@company.com"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Phone</label>
              <input
                className={inputClass}
                placeholder="(555) 555-5555"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Role</label>
            <select
              className={selectClass}
              value={role}
              onChange={e => setRole(e.target.value)}
            >
              <option value="">— Unknown —</option>
              {CONTACT_ROLES.filter(r => r !== "Unknown").map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !prospectId || !name.trim()}>
            {saving ? "Saving..." : "Add Contact"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
