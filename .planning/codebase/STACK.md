# Technology Stack

**Analysis Date:** 2026-04-24

## Languages

**Primary:**
- TypeScript ^5.8.3 - All application code (`src/**/*.ts`, `src/**/*.tsx`)
- TSX - React components

**Secondary:**
- CSS - Custom styles in `src/index.css` (Tailwind + custom classes)
- Deno/TypeScript - Supabase Edge Functions under `supabase/functions/*/index.ts` (Deno runtime, `https://deno.land/std@0.168.0/http/server.ts`)

**TypeScript Config:**
- Target: ES2020
- Strict mode: **disabled** (`strict: false` in `tsconfig.app.json`)
- `noImplicitAny`: disabled
- `noUnusedLocals`, `noUnusedParameters`: disabled
- `moduleResolution`: bundler
- `jsx`: react-jsx
- Path alias: `@/*` maps to `./src/*`
- Vitest globals enabled via `types: ["vitest/globals"]`

## Runtime

**Environment:**
- Bun (package manager and local runtime)
- Browser (SPA, no SSR)
- Deno (Supabase Edge Functions only)

**Package Manager:**
- Bun
- Lockfiles: `bun.lock` and `bun.lockb` present; `package-lock.json` also checked in (legacy — Bun is the source of truth)

## Frameworks

**Core:**
- React ^18.3.1 + react-dom ^18.3.1 - UI framework
- Vite ^5.4.19 - Build tool and dev server (SWC plugin via `@vitejs/plugin-react-swc`)
- React Router DOM ^6.30.1 - Client-side routing

**UI:**
- Tailwind CSS ^3.4.17 - Utility-first styling
- `@tailwindcss/typography` ^0.5.16 - Prose styles (used for markdown-rendered AI output)
- shadcn/ui (default style, slate base color, CSS variables) - Component library
  - Config: `components.json`
  - Components: `src/components/ui/`
  - Full Radix UI primitive suite installed (accordion, alert-dialog, avatar, checkbox, collapsible, context-menu, dialog, dropdown-menu, hover-card, label, menubar, navigation-menu, popover, progress, radio-group, scroll-area, select, separator, slider, slot, switch, tabs, toast, toggle, toggle-group, tooltip, aspect-ratio)
- next-themes ^0.3.0 - Dark/light mode toggle
- lucide-react ^0.462.0 - Icons

**Data:**
- TanStack React Query ^5.83.0 - `QueryClientProvider` wired in `src/App.tsx` (`refetchOnWindowFocus: false`), but NOT used for data fetching — every custom hook uses `useState` + `useEffect` directly against Supabase
- @supabase/supabase-js ^2.98.0 - Database client + auth + Edge Function invocation

**Testing:**
- Vitest ^3.2.4 - Test runner (jsdom environment)
- @testing-library/react ^16.0.0 - Component testing
- @testing-library/jest-dom ^6.6.0 - DOM matchers
- jsdom ^20.0.3 - DOM implementation for tests
- Config: `vitest.config.ts` (jsdom, globals, `src/**/*.{test,spec}.{ts,tsx}`), setup file: `src/test/setup.ts`

**Build/Dev:**
- @vitejs/plugin-react-swc ^3.11.0 - Fast React transforms
- lovable-tagger ^1.1.13 - Dev-only component tagging (Lovable platform); wired conditionally in `vite.config.ts` for `mode === "development"`
- PostCSS ^8.5.6 + Autoprefixer ^10.4.21 - CSS processing
- ESLint ^9.32.0 (flat config) + typescript-eslint ^8.38.0 - Linting
- eslint-plugin-react-hooks ^5.2.0, eslint-plugin-react-refresh ^0.4.20
- rollup ^4.59.0 - Pinned as a direct dep (used by Vite)

## Key Dependencies

**Critical (app cannot function without these):**
- `@supabase/supabase-js` ^2.98.0 - All data persistence, auth, and Edge Function invocation
- `react-router-dom` ^6.30.1 - Page routing
- `sonner` ^1.7.4 - Toast notifications (used throughout for user feedback)
- `date-fns` ^3.6.0 - Date formatting and manipulation

**Security:**
- `dompurify` ^3.3.3 + `@types/dompurify` ^3.2.0 - XSS sanitization; wrapped in `src/components/SafeHTML.tsx` and used when rendering user-supplied note HTML (installed as part of Phase 01 data-integrity-security hardening)

**UI/UX:**
- `recharts` ^2.15.4 - Charts on InsightsPage
- `react-hook-form` ^7.61.1 + `@hookform/resolvers` ^3.10.0 + `zod` ^3.25.76 - Form validation
- `vaul` ^0.9.9 - Mobile drawer (used by ProspectSheet on mobile)
- `cmdk` ^1.1.1 - Command palette / combobox
- `react-day-picker` ^8.10.1 - Date picker
- `embla-carousel-react` ^8.6.0 - Carousel component
- `react-resizable-panels` ^2.1.9 - Resizable panel layouts
- `react-markdown` ^10.1.0 - Markdown rendering (AI readiness + meeting-prep + research output)
- `input-otp` ^1.4.2 - OTP input component

**Rich Text:**
- `@tiptap/react` ^3.20.5 + `@tiptap/starter-kit` ^3.20.5 + `@tiptap/pm` ^3.20.5 - Rich text editor (contact notes, prospect notes)

**Drag and Drop:**
- `@dnd-kit/core` ^6.3.1 + `@dnd-kit/sortable` ^10.0.0 + `@dnd-kit/utilities` ^3.2.2 - Drag-and-drop (opportunity kanban board)

**Utility:**
- `class-variance-authority` ^0.7.1 - Component variant management (shadcn pattern)
- `clsx` ^2.1.1 + `tailwind-merge` ^2.6.0 - Class name utilities
- `tailwindcss-animate` ^1.0.7 - Animation utilities

**Platform:**
- `@lovable.dev/cloud-auth-js` ^1.0.0 - Lovable Cloud OAuth wrapper (Google/Apple); bridged to Supabase session in `src/integrations/lovable/index.ts`

## Configuration

**Environment Variables (existence only — never read `.env`):**
- `.env` file present (git-ignored)
- `VITE_SUPABASE_URL` - Supabase project URL (project id: `opktnhjukjiclagcyqpk` per `supabase/config.toml`)
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon/public key
- `VITE_ANTHROPIC_API_KEY` - **REMOVED from client bundle** in Phase 01 security remediation. No longer referenced in `src/`. All AI calls now go through Supabase Edge Functions (see INTEGRATIONS.md).

**Edge Function secrets (server-side only, set via Lovable Cloud / Supabase dashboard):**
- `LOVABLE_API_KEY` - Used by every Edge Function to call the Lovable AI Gateway

**Build:**
- `vite.config.ts` - Dev server on port 8080 (host `::`), `@` path alias, HMR overlay disabled, `componentTagger()` in dev only
- `tailwind.config.ts` - shadcn color system via CSS variables, custom keyframes, typography plugin
- `postcss.config.js` - Tailwind + Autoprefixer
- `tsconfig.app.json` - Lenient TS settings (no strict, no unused checks)
- `tsconfig.node.json` - Node-side TS config
- `eslint.config.js` - Flat config, recommended rules, unused-vars disabled
- `vitest.config.ts` - jsdom environment, globals enabled, setup file `./src/test/setup.ts`
- `supabase/config.toml` - Project id + per-function `verify_jwt` overrides (chat, enrich-prospect, ai-readiness, categorize-signal run with `verify_jwt = false`)

**shadcn/ui:**
- Style: default
- Base color: slate
- CSS variables: enabled
- No RSC (not Next.js)
- Aliases configured in `components.json`

## Platform Requirements

**Development:**
- Bun installed
- Node.js compatible (ES2020 target)
- `bun install` then `bun run dev` (Vite dev server on :8080)
- Edge Functions run locally via `supabase functions serve` (requires Supabase CLI — Lovable Cloud instance is read-only from CLI, so local Edge Function changes deploy via git push to main)

**Production:**
- `bun run build` outputs to `dist/`
- Deployed on Lovable Cloud
- GitHub-connected: push to `main` triggers deploy of both the client bundle and the Edge Functions under `supabase/functions/`
- SPA with client-side routing

## Scripts

```bash
bun run dev          # Start Vite dev server on port 8080
bun run build        # Production build
bun run build:dev    # Development build
bun run lint         # ESLint
bun run preview      # Preview production build
bun run test         # Vitest run (single pass)
bun run test:watch   # Vitest watch mode
```

---

*Stack analysis: 2026-04-24*
