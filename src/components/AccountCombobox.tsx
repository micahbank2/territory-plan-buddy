import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

interface AccountOption {
  id: string;
  name: string;
}

interface AccountComboboxProps {
  accounts: AccountOption[];
  value: string | null;
  onChange: (prospectId: string | null) => void;
  onCreateNew?: (name: string) => void;
  placeholder?: string;
  triggerClassName?: string;
  compact?: boolean;
}

export function AccountCombobox({
  accounts,
  value,
  onChange,
  onCreateNew,
  placeholder = "Select account...",
  triggerClassName,
  compact = false,
}: AccountComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const sorted = useMemo(
    () => [...accounts].sort((a, b) => a.name.localeCompare(b.name)),
    [accounts]
  );

  const selected = accounts.find((a) => a.id === value);

  const exactMatch = sorted.some(
    (a) => a.name.toLowerCase() === search.trim().toLowerCase()
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between font-normal",
            !selected && "text-muted-foreground",
            compact && "h-7 border-dashed text-xs",
            triggerClassName
          )}
        >
          <span className="truncate">
            {selected ? selected.name : placeholder}
          </span>
          <div className="flex items-center gap-1 ml-1 shrink-0">
            {selected && (
              <span
                role="button"
                className="opacity-50 hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command shouldFilter={true}>
          <CommandInput
            placeholder="Search or type a name..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[240px] overflow-y-auto" style={{ maxHeight: 240 }}>
            <CommandEmpty className="py-3 text-center text-sm text-muted-foreground">
              No accounts found.
            </CommandEmpty>
            <CommandGroup>
              {sorted.map((account) => (
                <CommandItem
                  key={account.id}
                  value={account.name}
                  onSelect={() => {
                    onChange(account.id === value ? null : account.id);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-3.5 w-3.5",
                      value === account.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{account.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            {onCreateNew && search.trim() && !exactMatch && (
              <CommandGroup heading="New">
                <CommandItem
                  value={`__create__${search.trim()}`}
                  onSelect={() => {
                    onCreateNew(search.trim());
                    setOpen(false);
                    setSearch("");
                  }}
                  className="text-primary"
                >
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Add "{search.trim()}" as account
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
