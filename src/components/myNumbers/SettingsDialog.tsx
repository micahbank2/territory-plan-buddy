import type { CompSettings } from "@/data/myNumbers/storage";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: CompSettings;
  onSave: (next: CompSettings) => void;
}

export function SettingsDialog(_props: SettingsDialogProps) {
  return null;
}
