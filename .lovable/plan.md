
## Add Contact Import Support to CSV Upload

### Problem
The CSV upload system only understands prospect/account-level fields. When you upload a contacts CSV (with First Name, Last Name, Title, Email, Company), the system:
- Can't map "First Name", "Last Name", or "Title" columns -- warns they'll be omitted
- Maps "Email" to the account-level contactEmail field instead of a contact record
- Maps "Company" as a prospect name, potentially creating duplicates or overwriting data
- Has no way to add contacts to existing prospects

### Solution
Detect when a CSV contains contact-specific columns, switch to a "contact import" mode, and merge contacts into matching existing prospects without touching any other account data.

### How It Will Work
1. **Auto-detect contact CSVs** -- If the file has columns like "First Name" or "Last Name", treat it as a contact import
2. **Match by Company name** -- Use the Company column to find the existing prospect (using the same fuzzy matching already in place)
3. **Add contacts, don't overwrite** -- Append new contacts to the prospect's contacts list; skip duplicates (matched by email)
4. **Never create new prospects** -- Contact-only rows that don't match an existing company are flagged for review, not auto-created
5. **Never touch account fields** -- No prospect fields (industry, tier, outreach, etc.) are modified during a contact import

### Technical Details

**File: `src/components/CSVUploadDialog.tsx`**

1. Add contact-specific column aliases to detect contact CSVs:
   - "first name", "fname", "given name" -> contactFirstName
   - "last name", "lname", "surname", "family name" -> contactLastName  
   - "title", "job title", "position", "role" -> contactTitle
   - "email", "email address", "e-mail" -> contactEmail (already partially exists)
   - "phone", "phone number", "mobile" -> contactPhone

2. Add a detection step after parsing headers: if contact-specific columns (first name, last name) are present, flag the import as `mode: "contacts"` instead of `mode: "prospects"`

3. In contact mode, change `mapRow` behavior:
   - Map "Company" to a lookup key (not to `name` for creating prospects)
   - Combine First Name + Last Name into a contact name
   - Map Title, Email, Phone to contact fields
   - Return a structured contact object instead of a flat prospect partial

4. In contact mode, change the matching/preview logic:
   - Match each row's Company value against existing prospects (exact, then fuzzy)
   - If matched: action = "update" (will add contact to that prospect)
   - If no match: action = "review" (user decides; cannot auto-create)
   - If contact email already exists on that prospect: action = "skip" (duplicate)

5. In contact mode, change `handleConfirm`:
   - For each "update" row, append the new contact to the matched prospect's existing contacts array
   - Call `onImport` with updates that only modify the `contacts` field
   - Never pass new prospect rows

6. Update the preview table columns to show contact-relevant info (Name, Title, Email, Company) instead of prospect fields when in contact mode

7. Update the dialog description to indicate "Contact Import" when in contact mode

**File: `src/hooks/useProspects.ts`**
- No changes needed -- the existing `update` function already handles syncing contacts when `contacts` is included in the update payload
