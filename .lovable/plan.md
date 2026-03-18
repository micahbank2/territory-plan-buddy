

## Landing Page for Territory Planner

### Approach
Create a new `LandingPage.tsx` that unauthenticated users see instead of being redirected to `/auth`. The page will use existing brand utilities (`.gradient-text`, `.glass-card`, `RetroGrid`, periwinkle primary) and link to `/auth` for sign-up/sign-in.

### Route Change
- **`App.tsx`**: Add a `/landing` route pointing to `LandingPage`, and change the `/auth` page to include a link back. Optionally make `/` show the landing page for unauthenticated users instead of redirecting to `/auth`.

### Page Structure (`src/pages/LandingPage.tsx`)

1. **Nav bar** -- Yext logo left, "Sign In" button right
2. **Hero section** -- Large `.gradient-text` headline ("AI-Powered Territory Planning"), subtitle, two CTAs: "Get Started" (primary, links to `/auth?signup=true`) and "See How It Works" (outline, scrolls down)
3. **Feature cards grid** (2x2 on desktop, stacked mobile) using `.glass-card`:
   - **AI Search Readiness** -- Brain icon, "Grade every prospect's visibility in AI search engines like ChatGPT and Google AI Overviews"
   - **Smart Import & Enrichment** -- Upload icon, "Paste from LinkedIn Sales Nav or upload a CSV. Auto-dedupe, auto-enrich industry and contacts"
   - **Secure Auth & Google OAuth** -- Shield icon, "Enterprise-grade auth with Google single sign-on. Your data stays private with row-level security"
   - **Share Anywhere** -- Share icon, "Google Docs-style sharing. Anyone with the link can view -- no login required"
4. **Secondary features strip** -- Smaller cards for Prospect Scoring, Signals & Triggers, Territory Views
5. **CTA banner** -- "Ready to plan smarter?" with sign-up button
6. **Footer** -- minimal, "Built with Lovable"

### Styling
- `RetroGrid` behind the hero (reuse from auth page)
- `fade-in-up` animation on feature cards with staggered delays
- Fully responsive -- single column on mobile
- High-contrast text per the readability-first memory

### Files
- **New**: `src/pages/LandingPage.tsx`
- **Edit**: `src/App.tsx` -- add route, show landing for unauthenticated `/` visits

