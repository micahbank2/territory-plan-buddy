import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Trash2, Crown, Pencil, Eye, Link, Check, Globe, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Territory, TerritoryMember } from "@/hooks/useTerritories";

interface ShareTerritoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  territory: Territory | null;
  members: TerritoryMember[];
  myRole: "owner" | "editor" | "viewer";
  currentUserId: string;
  onInvite: (email: string, role: "editor" | "viewer") => Promise<boolean>;
  onRemove: (memberId: string) => void;
  onUpdateRole: (memberId: string, role: "editor" | "viewer") => void;
  onRename: (name: string) => void;
}

const ROLE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  owner: { label: "Owner", icon: <Crown className="w-3 h-3" />, color: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  editor: { label: "Editor", icon: <Pencil className="w-3 h-3" />, color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  viewer: { label: "Viewer", icon: <Eye className="w-3 h-3" />, color: "bg-muted text-muted-foreground border-border" },
};

export function ShareTerritoryDialog({
  open,
  onOpenChange,
  territory,
  members,
  myRole,
  currentUserId,
  onInvite,
  onRemove,
  onUpdateRole,
  onRename,
}: ShareTerritoryDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [inviting, setInviting] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(territory?.name || "");
  const [linkCopied, setLinkCopied] = useState(false);
  const [publicAccess, setPublicAccess] = useState<"none" | "viewer" | "editor">("none");
  const [linkRole, setLinkRole] = useState<"editor" | "viewer">("viewer");

  const isOwner = myRole === "owner";

  // Load current public_access when dialog opens
  useEffect(() => {
    if (open && territory) {
      (async () => {
        const { data } = await supabase
          .from("territories")
          .select("public_access")
          .eq("id", territory.id)
          .single();
        if (data) {
          const access = (data as any).public_access as string;
          if (access === "viewer" || access === "editor") {
            setPublicAccess(access);
            setLinkRole(access);
          } else {
            setPublicAccess("none");
          }
        }
      })();
    }
  }, [open, territory]);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setInviting(true);
    const success = await onInvite(email.trim(), role);
    if (success) setEmail("");
    setInviting(false);
  };

  const handleRename = () => {
    if (nameInput.trim() && nameInput.trim() !== territory?.name) {
      onRename(nameInput.trim());
    }
    setEditingName(false);
  };

  const handleTogglePublicAccess = async (newAccess: "none" | "viewer" | "editor") => {
    if (!territory) return;
    setPublicAccess(newAccess);
    if (newAccess !== "none") setLinkRole(newAccess as "editor" | "viewer");
    await supabase
      .from("territories")
      .update({ public_access: newAccess } as any)
      .eq("id", territory.id);
    if (newAccess === "none") {
      toast.success("Link sharing disabled");
    } else {
      toast.success(`Anyone with the link can now ${newAccess === "editor" ? "edit" : "view"}`);
    }
  };

  const handleLinkRoleChange = async (newRole: "editor" | "viewer") => {
    setLinkRole(newRole);
    if (publicAccess !== "none") {
      setPublicAccess(newRole);
      await supabase
        .from("territories")
        .update({ public_access: newRole } as any)
        .eq("id", territory!.id);
    }
  };

  const handleCopyLink = () => {
    if (!territory) return;
    const url = `${window.location.origin}/share/${territory.id}?role=${linkRole}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 placeholder:text-muted-foreground transition-all";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Share Territory
          </DialogTitle>
          <DialogDescription>
            Invite teammates or share a link to collaborate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Territory name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Territory Name</label>
            {editingName && isOwner ? (
              <div className="flex gap-2">
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className={inputClass}
                  onKeyDown={(e) => e.key === "Enter" && handleRename()}
                  autoFocus
                />
                <Button size="sm" onClick={handleRename}>Save</Button>
              </div>
            ) : (
              <div
                className={`text-sm font-medium text-foreground ${isOwner ? "cursor-pointer hover:text-primary" : ""}`}
                onClick={() => {
                  if (isOwner) {
                    setNameInput(territory?.name || "");
                    setEditingName(true);
                  }
                }}
              >
                {territory?.name || "My Territory"}
                {isOwner && <span className="text-[10px] text-muted-foreground ml-2">(click to rename)</span>}
              </div>
            )}
          </div>

          {/* Invite by email (owner only) */}
          {isOwner && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Add people</label>
              <div className="flex gap-2">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  className={inputClass}
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
                  className="px-2 py-2 text-xs rounded-lg border border-border bg-background text-foreground"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <Button
                size="sm"
                onClick={handleInvite}
                disabled={!email.trim() || inviting}
                className="w-full gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {inviting ? "Inviting..." : "Invite"}
              </Button>
            </div>
          )}

          {/* General access (owner only) */}
          {isOwner && (
            <div className="space-y-2 border-t border-border pt-3">
              <label className="text-xs font-medium text-muted-foreground">General access</label>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  {publicAccess !== "none" ? (
                    <Globe className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <select
                    value={publicAccess === "none" ? "restricted" : "anyone"}
                    onChange={(e) => {
                      if (e.target.value === "restricted") {
                        handleTogglePublicAccess("none");
                      } else {
                        handleTogglePublicAccess(linkRole);
                      }
                    }}
                    className="text-sm px-2 py-1.5 rounded-lg border border-border bg-background text-foreground w-full"
                  >
                    <option value="restricted">Restricted</option>
                    <option value="anyone">Anyone with the link</option>
                  </select>
                </div>
                {publicAccess !== "none" && (
                  <select
                    value={linkRole}
                    onChange={(e) => handleLinkRoleChange(e.target.value as "editor" | "viewer")}
                    className="px-2 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>
                )}
              </div>
              {publicAccess !== "none" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="w-full gap-1.5"
                >
                  {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Link className="w-3.5 h-3.5" />}
                  {linkCopied ? "Copied!" : "Copy link"}
                </Button>
              )}
              {publicAccess === "none" && (
                <p className="text-[10px] text-muted-foreground">Only people added above can access this territory.</p>
              )}
            </div>
          )}

          {/* Members list */}
          <div className="border-t border-border pt-3">
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              People with access ({members.length})
            </label>
            <div className="space-y-2">
              {members.map((m) => {
                const roleInfo = ROLE_LABELS[m.role];
                const isMe = m.user_id === currentUserId;
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {(m.email || m.user_id).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm text-foreground truncate block">
                          {m.email || m.user_id.slice(0, 8) + "..."}
                          {isMe && <span className="text-[10px] text-muted-foreground ml-1">(you)</span>}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={`text-[10px] ${roleInfo.color} gap-1`}>
                        {roleInfo.icon} {roleInfo.label}
                      </Badge>
                      {isOwner && !isMe && m.role !== "owner" && (
                        <div className="flex items-center gap-1">
                          <select
                            value={m.role}
                            onChange={(e) => onUpdateRole(m.id, e.target.value as "editor" | "viewer")}
                            className="text-[10px] px-1 py-0.5 rounded border border-border bg-background text-foreground"
                          >
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <button
                            onClick={() => onRemove(m.id)}
                            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Role legend */}
          <div className="text-[10px] text-muted-foreground space-y-0.5 border-t border-border pt-3">
            <p><strong>Owner</strong> — Full control, manage members</p>
            <p><strong>Editor</strong> — Can add and edit prospects</p>
            <p><strong>Viewer</strong> — Read-only access</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
