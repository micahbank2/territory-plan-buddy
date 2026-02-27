

## Restrict Seed Data to Owner Emails

### What will change
The "Import Seed Data" button (and the `seedData` function) will only be available to your two email addresses:
- `micahbank2@gmail.com`
- `mbank@yext.com`

All other users who sign up will see the welcome screen without the seed data import option -- they'll only get the "Add Prospect" button.

### Technical Details

**File: `src/components/TerritoryPlanner.tsx`**
- Add an `OWNER_EMAILS` constant: `["micahbank2@gmail.com", "mbank@yext.com"]`
- Import `useAuth` to get `user.email`
- Conditionally render the "Import Seed Data" button only when `user.email` is in `OWNER_EMAILS`
- The welcome message will adjust for non-owners (remove mention of 309 accounts)

**File: `src/hooks/useProspects.ts`**
- Add the same `OWNER_EMAILS` guard in the `seedData` function as a server-side safety check, so even if someone bypasses the UI, the function won't execute for non-owners

