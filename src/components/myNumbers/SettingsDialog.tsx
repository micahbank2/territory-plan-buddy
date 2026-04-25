import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_SETTINGS, type CompSettings } from "@/data/myNumbers/storage";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: CompSettings;
  onSave: (next: CompSettings) => void;
}

export function SettingsDialog({
  open,
  onOpenChange,
  settings,
  onSave,
}: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Comp Plan Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <SettingsField
            label="Annual TI ($)"
            value={settings.annualTI}
            onChange={(v) => onSave({ ...settings, annualTI: v })}
          />
          <div className="grid grid-cols-2 gap-3">
            <SettingsField
              label="Incremental Split (%)"
              value={Math.round(settings.incrementalSplit * 100)}
              onChange={(v) => onSave({ ...settings, incrementalSplit: v / 100 })}
            />
            <SettingsField
              label="Renewal Split (%)"
              value={Math.round(settings.renewalSplit * 100)}
              onChange={(v) => onSave({ ...settings, renewalSplit: v / 100 })}
            />
          </div>
          <SettingsField
            label="Annual Incremental Quota ($)"
            value={settings.annualIncrementalQuota}
            onChange={(v) => onSave({ ...settings, annualIncrementalQuota: v })}
          />
          <SettingsField
            label="FY ACV U4R ($)"
            value={settings.u4r}
            onChange={(v) => onSave({ ...settings, u4r: v })}
          />
          <div className="grid grid-cols-2 gap-3">
            <SettingsField
              label="Retention Target (%)"
              value={Math.round(settings.retentionTarget * 100)}
              onChange={(v) => onSave({ ...settings, retentionTarget: v / 100 })}
            />
            <SettingsField
              label="Renewal >100% Rate (%)"
              value={settings.renewalAbove100Rate * 100}
              onChange={(v) => onSave({ ...settings, renewalAbove100Rate: v / 100 })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onSave(DEFAULT_SETTINGS);
            }}
          >
            Reset Defaults
          </Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettingsField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">
        {label}
      </label>
      <Input
        type="number"
        value={value || ""}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="font-mono"
      />
    </div>
  );
}
