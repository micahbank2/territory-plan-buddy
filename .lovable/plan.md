

## Plan: Fix RichTextEditor + Convert Account Panel to Center Dialog

### Two Changes

**1. Fix RichTextEditor (tiptap v3 compatibility)**

The project uses `@tiptap/react` v3.20.5, which changed defaults from v2:
- `shouldRerenderOnTransaction` now defaults to `false`, so toolbar button active states don't update and the editor appears "broken"
- `setContent` signature changed in v3

Fix in `RichTextEditor.tsx`:
- Add `shouldRerenderOnTransaction: true` to the `useEditor` config
- This ensures the toolbar highlights (bold, italic, list active states) update correctly on every transaction

**2. Convert ProspectSheet from side panel to center dialog**

Currently uses `<Sheet side="right">` (slide-over panel). Change to a `<Dialog>` that hovers centered over the page.

Changes in `ProspectSheet.tsx`:
- Replace `Sheet`/`SheetContent`/`SheetHeader`/`SheetTitle` imports with `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` (already imported for sub-dialogs)
- Remove the `Drawer` mobile path — Dialog works on both
- Set `DialogContent` to a large size: `max-w-4xl max-h-[90vh] overflow-y-auto p-0`
- Keep the existing `sheetContent` JSX as the dialog body — no layout changes needed inside
- Update TerritoryPlanner's `<ProspectSheet>` usage if needed (props stay the same)

### Technical Details

**RichTextEditor.tsx** — add one line to `useEditor`:
```typescript
const editor = useEditor({
  shouldRerenderOnTransaction: true,
  extensions: [...],
  ...
});
```

**ProspectSheet.tsx** — bottom of file changes from:
```typescript
// Sheet/Drawer wrapper
if (isMobile) { return <Drawer>...</Drawer> }
return <Sheet><SheetContent side="right">...</SheetContent></Sheet>
```
to:
```typescript
return (
  <Dialog open={isOpen} onOpenChange={handleOpenChange}>
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
      {sheetContent}
    </DialogContent>
  </Dialog>
);
```

Remove unused Sheet/Drawer imports. DialogContent already has a close button built in.

