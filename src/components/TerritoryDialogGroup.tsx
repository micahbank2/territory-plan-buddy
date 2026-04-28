import { forwardRef, useImperativeHandle, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { Prospect, InteractionLog, Contact } from "@/data/prospects";
import type { Territory, TerritoryMember } from "@/hooks/useTerritories";
import type { Signal } from "@/hooks/useSignals";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { AddProspectDialog } from "@/components/AddProspectDialog";
import { AddContactDialog } from "@/components/AddContactDialog";
import { CSVUploadDialog } from "@/components/CSVUploadDialog";
import { PasteImportDialog } from "@/components/PasteImportDialog";
import { ShareTerritoryDialog } from "@/components/ShareTerritoryDialog";
import { EnrichmentQueue } from "@/components/EnrichmentQueue";
import { ExportDialog } from "@/components/ExportDialog";

export interface TerritoryDialogGroupHandle {
  openAdd: () => void;
  openAddContact: () => void;
  openUpload: () => void;
  openPasteImport: () => void;
  openEnrich: () => void;
  openExport: () => void;
  openShare: () => void;
  openNewTerritory: () => void;
  openReset: () => void;
  openDeleteConfirm: (prospectId: string) => void;
}

export interface TerritoryDialogGroupProps {
  user: User | null;
  territoryId: string | null;
  myRole: "owner" | "editor" | "viewer";
  activeTerrObj: Territory | null;
  members: TerritoryMember[];

  data: Prospect[];
  filtered: Prospect[];
  signals: Signal[];

  add: (partial: Partial<Prospect>) => Promise<string>;
  bulkAdd: (partials: Partial<Prospect>[]) => Promise<void>;
  bulkMerge: (updates: Partial<Prospect>[]) => Promise<void>;
  update: (id: string, changes: Partial<Prospect>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  addNote: (prospectId: string, text: string) => Promise<void>;
  addContact: (prospectId: string, contact: Omit<Contact, "id">) => Promise<void>;

  createTerritory: (name: string) => Promise<void>;
  renameTerritory: (name: string) => Promise<void> | void;
  inviteMember: (email: string, role: "editor" | "viewer") => Promise<boolean>;
  removeMember: (userId: string) => Promise<void>;
  updateMemberRole: (userId: string, role: "editor" | "viewer") => Promise<void>;

  reset: () => Promise<void>;

  inputClass: string;
  selectClass: string;

  onProspectDeleted: (id: string) => void;
}

export const TerritoryDialogGroup = forwardRef<
  TerritoryDialogGroupHandle,
  TerritoryDialogGroupProps
>(function TerritoryDialogGroup(props, ref) {
  const {
    user,
    myRole,
    activeTerrObj,
    members,
    data,
    filtered,
    add,
    bulkAdd,
    bulkMerge,
    addNote,
    addContact,
    remove,
    update,
    createTerritory,
    renameTerritory,
    inviteMember,
    removeMember,
    updateMemberRole,
    reset,
    inputClass,
    onProspectDeleted,
  } = props;

  const [showAdd, setShowAdd] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showPasteImport, setShowPasteImport] = useState(false);
  const [showEnrich, setShowEnrich] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showNewTerritory, setShowNewTerritory] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetInput, setResetInput] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [newTerritoryName, setNewTerritoryName] = useState("");

  useImperativeHandle(
    ref,
    () => ({
      openAdd: () => setShowAdd(true),
      openAddContact: () => setShowAddContact(true),
      openUpload: () => setShowUpload(true),
      openPasteImport: () => setShowPasteImport(true),
      openEnrich: () => setShowEnrich(true),
      openExport: () => setShowExport(true),
      openShare: () => setShowShare(true),
      openNewTerritory: () => setShowNewTerritory(true),
      openReset: () => {
        setResetInput("");
        setResetDialogOpen(true);
      },
      openDeleteConfirm: (id: string) => setDeleteConfirmId(id),
    }),
    []
  );

  const prospectToDelete = deleteConfirmId
    ? data.find((p) => p.id === deleteConfirmId) ?? null
    : null;

  return (
    <>
      {/* --- Quick Add Dialog --- */}
      <AddProspectDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        onAdd={add}
        onAddNote={addNote}
        existingNames={data.map((p) => p.name)}
        inputClass={inputClass}
        selectClass={props.selectClass}
      />

      {/* --- Add Contact Dialog --- */}
      <AddContactDialog
        open={showAddContact}
        onOpenChange={setShowAddContact}
        prospects={data}
        addContact={addContact}
      />

      {/* --- Single-Row Delete Confirm --- */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={(v) => {
          if (!v) setDeleteConfirmId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {prospectToDelete?.name || "this prospect"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes this prospect and all its contacts, interactions, notes, and tasks. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteConfirmId) {
                  await remove(deleteConfirmId);
                  onProspectDeleted(deleteConfirmId);
                  toast("🗑️ Prospect deleted");
                }
                setDeleteConfirmId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- CSV Upload --- */}
      <CSVUploadDialog
        open={showUpload}
        onOpenChange={setShowUpload}
        existingData={data}
        onImport={(newRows, updates) => {
          if (newRows.length > 0) bulkAdd(newRows);
          if (updates.length > 0) bulkMerge(updates);
        }}
      />

      {/* --- Paste Import --- */}
      <PasteImportDialog
        open={showPasteImport}
        onOpenChange={setShowPasteImport}
        existingData={data}
        onImport={(newRows, updates) => {
          if (newRows.length > 0) bulkAdd(newRows);
          if (updates.length > 0) bulkMerge(updates);
        }}
      />

      {/* --- Reset --- */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Warning
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This will <span className="font-bold text-foreground">permanently erase ALL</span>{" "}
              prospect data and reset to demo defaults. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Type <span className="font-mono font-bold text-foreground">RESET</span> to confirm:
            </label>
            <input
              value={resetInput}
              onChange={(e) => setResetInput(e.target.value)}
              placeholder="Type RESET"
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-destructive/30 placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setResetInput("")}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={resetInput !== "RESET"}
              onClick={async () => {
                await reset();
                setResetDialogOpen(false);
                setResetInput("");
                toast("🔄 Data reset to defaults");
              }}
            >
              Reset All Data
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- Share Territory --- */}
      <ShareTerritoryDialog
        open={showShare}
        onOpenChange={setShowShare}
        territory={activeTerrObj}
        members={members}
        myRole={myRole}
        currentUserId={user?.id || ""}
        onInvite={inviteMember}
        onRemove={removeMember}
        onUpdateRole={updateMemberRole}
        onRename={renameTerritory}
      />

      {/* --- New Territory --- */}
      <Dialog open={showNewTerritory} onOpenChange={setShowNewTerritory}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Territory</DialogTitle>
            <DialogDescription>Create a new territory to organize a different set of accounts.</DialogDescription>
          </DialogHeader>
          <input
            value={newTerritoryName}
            onChange={(e) => setNewTerritoryName(e.target.value)}
            placeholder="Territory name"
            className={inputClass}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTerritoryName.trim()) {
                createTerritory(newTerritoryName.trim());
                setNewTerritoryName("");
                setShowNewTerritory(false);
              }
            }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTerritory(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (newTerritoryName.trim()) {
                  createTerritory(newTerritoryName.trim());
                  setNewTerritoryName("");
                  setShowNewTerritory(false);
                }
              }}
              disabled={!newTerritoryName.trim()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Enrichment Queue --- */}
      {showEnrich && (
        <EnrichmentQueue
          prospects={data}
          onUpdate={async (id, changes) => {
            await update(id, changes);
          }}
          onClose={() => setShowEnrich(false)}
        />
      )}

      {/* --- Export --- */}
      <ExportDialog open={showExport} onOpenChange={setShowExport} prospects={filtered} />
    </>
  );
});
