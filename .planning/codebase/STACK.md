# Technology Stack

**Analysis Date:** 2026-03-26

## Languages

**Primary:**
- TypeScript ^5.8.3 - All application code (`src/**/*.ts`, `src/**/*.tsx`)
- TSX - React components

**Secondary:**
- CSS - Custom styles in `src/index.css` (Tailwind + custom classes)

**TypeScript Config:**
- Target: ES2020
- Strict mode: **disabled** (`strict: false` in `tsconfig.app.json`)
- `noImplicitAny`: disabled
- Path alias: `@/*` maps to `./src/*`

## Runtime

**Environment:**
- Bun (package manager and runtime)
- Browser (SPA, no SSR)

**Package Manager:**
- Bun
- Lockfiles: `bun.lock` and `bun.lockb` present

## Frameworks

**Core:**
- React ^18.3.1 - UI framework
- Vite ^5.4.19 - Build tool and dev server (SWC plugin via `@vitejs/plugin-react-swc`)
- React Router DOM ^6.30.1 - Client-side routing

**UI:**
- Tailwind CSS ^3.4.17 - Utility-first styling
- shadcn/ui (default style, slate base color, CSS variables) - Component library
  - Config: `components.json`
  - Components: `src/components/ui/`
  - Full Radix UI primitive suite installed
- next-themes ^0.3.0 - Dark/light mode toggle
- lucide-react ^0.462.0 - Icons

**Data:**
- TanStack React Query ^5.83.0 - Installed but underused; most fetching in custom hooks
- @supabase/supabase-js ^2.98.0 - Database client

**Testing:**
- Vitest ^3.2.4 - Test runner (jsdom environment)
- @testing-library/react ^16.0.0 - Component testing
- @testing-library/jest-dom ^6.6.0 - DOM matchers
- Config: `vitest.config.ts`, setup file: `src/test/setup.ts`

**Build/Dev:**
- @vitejs/plugin-react-swc ^3.11.0 - Fast React transforms
- lovable-tagger ^1.1.13 - Dev-only component tagging (Lovable platform)
- PostCSS ^8.5.6 + Autoprefixer ^10.4.21 - CSS processing
- ESLint ^9.32.0 + typescript-eslint ^8.38.0 - Linting

## Key Dependencies

**Critical (app cannot function without these):**
- `@supabase/supabase-js` ^2.98.0 - All data persistence and auth
- `react-router-dom` ^6.30.1 - Page routing
- `sonner` ^1.7.4 - Toast notifications (used throughout for user feedback)
- `date-fns` ^3.6.0 - Date formatting and manipulation

**UI/UX:**
- `recharts` ^2.15.4 - Charts on InsightsPage
- `react-hook-form` ^7.61.1 + `@hookform/resolvers` ^3.10.0 + `zod` ^3.25.76 - Form validation
- `vaul` ^0.9.9 - Mobile drawer (used by ProspectSheet on mobile)
- `cmdk` ^1.1.1 - Command palette / combobox
- `react-day-picker` ^8.10.1 - Date picker
- `embla-carousel-react` ^8.6.0 - Carousel component
- `react-resizable-panels` ^2.1.9 - Resizable panel layouts
- `react-markdown` ^10.1.0 - Markdown rendering (AI readiness data)
- `input-otp` ^1.4.2 - OTP input component

**Rich Text:**
- `@tiptap/react` ^3.20.5 + `@tiptap/starter-kit` ^3.20.5 + `@tiptap/pm` ^3.20.5 - Rich text editor

**Drag and Drop:**
- `@dnd-kit/core` ^6.3.1 + `@dnd-kit/sortable` ^10.0.0 + `@dnd-kit/utilities` ^3.2.2 - Drag-and-drop (kanban board)

**Utility:**
- `class-variance-authority` ^0.7.1 - Component variant management (shadcn pattern)
- `clsx` ^2.1.1 + `tailwind-merge` ^2.6.0 - Class name utilities
- `tailwindcss-animate` ^1.0.7 - Animation utilities

**Platform:**
- `@lovable.dev/cloud-auth-js` ^0.0.3 - Lovable Cloud authentication integration

## Configuration

**Environment Variables (existence only -- never read .env):**
- `.env` file present
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon/public key
- `VITE_ANTHROPIC_API_KEY` - Anthropic API key for AI features

**Build:**
- `vite.config.ts` - Dev server on port 8080, `@` path alias, HMR overlay disabled
- `tailwind.config.ts` - shadcn color system via CSS variables, custom keyframes
- `postcss.config.js` - Tailwind + Autoprefixer
- `tsconfig.app.json` - Lenient TS settings (no strict, no unused checks)
- `eslint.config.js` - Flat config, recommended rules, unused-vars disabled
- `vitest.config.ts` - jsdom environment, globals enabled

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

**Production:**
- `bun run build` outputs to `dist/`
- Deployed on Lovable Cloud
- GitHub-connected: push to `main` triggers deploy
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

*Stack analysis: 2026-03-26*
