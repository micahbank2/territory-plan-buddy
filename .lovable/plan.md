

## Fix Malformed Website URLs

### Problem
The URLs stored in the database have malformed protocols like `http//www.sheetz.com` (missing the colon after `http`). The current `normalizeUrl` function only checks for properly-formed `http://` or `https://`, so these broken URLs slip through and get `https://` prepended, creating completely invalid links.

### Solution
Two changes to fully fix this:

**1. Make `normalizeUrl` handle malformed protocols** (`src/lib/utils.ts`)

Update the function to detect and fix common malformations like `http//`, `https//`, `Http//`, etc. by normalizing them to proper `https://` before returning.

```typescript
export function normalizeUrl(url: string): string {
  // Already valid
  if (/^https?:\/\//i.test(url)) return url;
  // Fix malformed: http//, https//, Http//, etc. (missing colon)
  if (/^https?\/\//i.test(url)) return url.replace(/^https?\/\//i, "https://");
  // No protocol at all
  return `https://${url}`;
}
```

**2. Clean URLs on CSV import** (`src/components/CSVUploadDialog.tsx`)

In the `mapRow` function, when the field is `website`, run `normalizeUrl` to fix the value before storing it. This prevents future bad data from entering the database. Alternatively, strip the protocol entirely and store just the domain (consistent with seed data).

### Technical Details

- `src/lib/utils.ts` -- Update `normalizeUrl` to handle `http//`, `https//` patterns (missing colon)
- `src/components/CSVUploadDialog.tsx` -- Normalize website values during import using a `cleanWebsite` step so the database stores clean URLs going forward
- Existing broken data in the database will be handled at display time by the improved `normalizeUrl`
