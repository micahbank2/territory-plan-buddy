import type { AddOns } from "@/data/myNumbers/storage";
import type { AddOnPayoutsResult } from "@/data/myNumbers/comp";

interface AddonsSectionProps {
  addons: AddOns;
  addonPayouts: AddOnPayoutsResult;
  isOpen: boolean;
  onToggle: () => void;
  onSave: (next: AddOns) => void;
}

export function AddonsSection(_props: AddonsSectionProps) {
  return <div data-testid="addons-section-stub">TODO AddonsSection</div>;
}
