

# Swipe-to-Dismiss on Mobile Prospect Panel

## What changes

On mobile, replace the right-side `Sheet` with vaul's `Drawer` configured with `direction="right"`. This gives native swipe-to-dismiss behavior -- swipe right with your thumb and the panel slides away. On desktop, nothing changes.

## How it works

The `vaul` library (already installed) supports a `direction` prop. Setting `direction="right"` makes the drawer slide in from the right and swipe-dismiss to the right -- exactly the gesture you'd expect.

## Technical Details

### File: `src/components/ProspectSheet.tsx`

- Import `useIsMobile` hook and the Drawer components
- Wrap the render in a conditional:
  - **Mobile**: Use `Drawer` with `direction="right"` instead of `Sheet`. The `DrawerContent` gets the same styling and children as the current `SheetContent`
  - **Desktop**: Keep the existing `Sheet` with `side="right"` unchanged
- The vaul Drawer handles the swipe gesture automatically -- no custom touch event code needed

### File: `src/components/ui/drawer.tsx`

- The current `DrawerContent` has a bottom-oriented drag handle (`mx-auto mt-4 h-2 w-[100px]`). Add a variant that either hides the handle or shows a thin vertical bar on the left edge when `direction="right"`, so it looks natural as a side panel.

### Rough structure:

```text
if (isMobile) {
  <Drawer direction="right" open={...} onOpenChange={...}>
    <DrawerContent className="w-full h-full rounded-none">
      {/* same prospect content */}
    </DrawerContent>
  </Drawer>
} else {
  <Sheet ...>
    <SheetContent side="right">
      {/* same prospect content */}
    </SheetContent>
  </Sheet>
}
```

The shared content (header, tabs, details) stays in the same component -- only the wrapper changes based on screen size.

### Files to modify:
| File | Changes |
|------|---------|
| `src/components/ProspectSheet.tsx` | Conditional Drawer (mobile) vs Sheet (desktop) |
| `src/components/ui/drawer.tsx` | Support right-direction styling (hide bottom handle, adjust content classes) |
