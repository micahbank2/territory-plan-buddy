

## Fix Broken Website URLs

### Problem
Your CSV has website values like `Http://www.sheetz.com`. The code always adds `https://` in front, creating invalid URLs like `https://Http://www.sheetz.com`. The browser then breaks this into the garbled `http//www.sheetz.com` you're seeing.

### Solution
Add a small helper function that checks if a URL already has a protocol before adding one, then use it everywhere website links appear.

### Technical Details

**1. `src/lib/utils.ts`** -- Add helper:
```typescript
export function normalizeUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}
```

**2. `src/components/TerritoryPlanner.tsx`** (line 1394)
- Import `normalizeUrl` from `@/lib/utils`
- Change `href={\`https://${p.website}\`}` to `href={normalizeUrl(p.website)}`

**3. `src/components/ProspectSheet.tsx`** (line 210)
- Import `normalizeUrl` from `@/lib/utils`
- Change `href={\`https://${prospect.website}\`}` to `href={normalizeUrl(prospect.website)}`

**4. `src/pages/ProspectPage.tsx`** (line 499)
- Import `normalizeUrl` from `@/lib/utils`
- Change `href={\`https://${prospect.website}\`}` to `href={normalizeUrl(prospect.website)}`

This handles URLs with or without a protocol, and is case-insensitive so `Http://`, `HTTP://`, and `http://` all work correctly.
