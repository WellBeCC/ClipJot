---
title: "feat: ClipJot marketing website"
type: feat
status: completed
date: 2026-04-02
origin: docs/brainstorms/2026-04-01-clipjot-marketing-website-requirements.md
---

# feat: ClipJot Marketing Website

## Overview

Build and deploy a focused marketing website for ClipJot — a static Astro site hosted on GitHub Pages at `https://wellbecc.github.io/ClipJot/`. The site offers frictionless direct downloads, an optional post-download subscription dialog, a bottom-of-page subscribe form, Google Analytics with GDPR-compliant cookie consent, and three legal pages (Terms, Privacy, Data Processing). All interactive components are React islands within an otherwise fully static Astro build.

## Problem Statement

ClipJot has no public web presence. Potential users cannot discover, learn about, or download the app. A marketing site is needed that:

- Communicates the app's clipboard-first value proposition clearly
- Provides one-click downloads for macOS and Windows
- Collects optional email subscriptions for product update communications
- Satisfies GDPR requirements (cookie consent, data processing disclosures, explicit opt-in)
- Is fast, SEO-optimised, and deployable without a backend

## Proposed Solution

A single-page marketing site (`/`) plus three legal pages (`/terms`, `/privacy`, `/data-processing`), built with Astro 5 + React islands + shadcn/ui + Tailwind v4. Static content renders to plain HTML at build time; interactive components (subscription dialog, subscribe form, cookie consent) hydrate as React islands. Deployed to GitHub Pages via GitHub Actions on push to `main`.

Email subscription uses EmailOctopus (free tier: 2,500 subscribers, 10,000 emails/month). Because the EmailOctopus REST API blocks CORS for browser requests, a **Cloudflare Worker** (free tier: 100,000 req/day) acts as a thin CORS proxy. This keeps the site fully static on GitHub Pages while enabling custom-styled subscription forms.

Google Analytics is gated behind `vanilla-cookieconsent` — the GA script is injected only after the user explicitly accepts analytics cookies.

## Technical Approach

### Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Astro 5.x | Static output, React islands, Bun-native |
| UI components | shadcn/ui (React) | Initialized with `-t astro` flag |
| Styling | Tailwind CSS v4 | Via `@tailwindcss/vite` (no config file) |
| Colors | Flexoki → Tailwind `@theme` | Copy `flexoki.css` + `tokens.css` from app |
| Interactive islands | `@astrojs/react` | `client:load` for dialog, form, consent |
| Cookie consent | `vanilla-cookieconsent` v3.1.0 | MIT, Astro `<script>` integration |
| Analytics | Google Analytics 4 | Consent-gated via cookieconsent callbacks |
| Email subscriptions | EmailOctopus (free) | Via Cloudflare Worker CORS proxy |
| Hosting | GitHub Pages | `https://wellbecc.github.io/ClipJot/` |
| Deployment | GitHub Actions | `withastro/action@v5` + `actions/deploy-pages@v4` |
| Package manager | Bun (required by CLAUDE.md) | All commands use `bun` / `bunx` |

### Directory Layout

The website lives in a `website/` subdirectory with its own `package.json` — isolated from the Tauri app's dependencies.

```
ClipJot/
├── src-tauri/           # Tauri app (unchanged)
├── src/                 # Vue app (unchanged)
│   └── assets/
│       ├── flexoki.css  # Copy into website/src/styles/
│       └── tokens.css   # Copy into website/src/styles/
├── website/             # Marketing website (new)
│   ├── package.json
│   ├── astro.config.mjs
│   ├── components.json  # shadcn/ui config
│   ├── tsconfig.json
│   ├── .github/
│   │   └── workflows/
│   │       └── deploy.yml
│   └── src/
│       ├── styles/
│       │   ├── global.css       # Tailwind @import + @theme Flexoki mapping
│       │   ├── flexoki.css      # Copied from app
│       │   └── tokens.css       # Copied from app (simplified)
│       ├── layouts/
│       │   └── BaseLayout.astro # <head> SEO, GA script tags, CookieConsent, slot
│       ├── pages/
│       │   ├── index.astro      # Landing page
│       │   ├── terms.astro      # Terms and Conditions
│       │   ├── privacy.astro    # Privacy Policy
│       │   └── data-processing.astro  # Data Processing Entities
│       ├── components/
│       │   ├── CookieConsent.astro    # vanilla-cookieconsent init
│       │   ├── Header.astro
│       │   ├── Hero.astro
│       │   ├── HowItWorks.astro
│       │   ├── Features.astro
│       │   ├── DownloadSection.astro
│       │   ├── SubscribeSection.astro # Bottom subscribe island wrapper
│       │   ├── Footer.astro
│       │   └── react/                # React island components
│       │       ├── DownloadButtons.tsx      # Download buttons + dialog trigger
│       │       ├── SubscribeDialog.tsx      # Post-download subscription dialog
│       │       └── SubscribeForm.tsx        # Bottom-of-page subscribe form
│       └── lib/
│           ├── utils.ts            # shadcn cn() helper
│           ├── download-config.ts  # Platform download URLs config
│           └── subscribe.ts        # EmailOctopus API call via CF Worker
```

### Astro Config

**`website/astro.config.mjs`:**

```js
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://wellbecc.github.io',
  base: '/ClipJot',
  output: 'static',
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
```

**`website/tsconfig.json`:**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Tailwind v4 + Flexoki Theme

No `tailwind.config.js` — configuration lives entirely in CSS via the `@theme` directive.

**`website/src/styles/global.css`:**

```css
@import "tailwindcss";
@import "./flexoki.css";
@import "./tokens.css";

@theme {
  /* Map Flexoki primitives to Tailwind color utilities */
  --color-paper: var(--flexoki-paper);
  --color-base-950: var(--flexoki-950);
  --color-base-900: var(--flexoki-900);
  --color-base-800: var(--flexoki-800);
  --color-base-700: var(--flexoki-700);
  --color-base-600: var(--flexoki-600);
  --color-base-500: var(--flexoki-500);
  --color-base-300: var(--flexoki-300);
  --color-base-200: var(--flexoki-200);
  --color-base-100: var(--flexoki-100);
  --color-base-50: var(--flexoki-50);

  /* Brand accent — Flexoki blue */
  --color-accent: var(--flexoki-blue-600);
  --color-accent-hover: var(--flexoki-blue-700);

  /* Semantic surface tokens */
  --color-surface: var(--surface-app);
  --color-surface-panel: var(--surface-panel);
  --color-surface-elevated: var(--surface-elevated);

  /* Fonts */
  --font-sans: "Inter", system-ui, sans-serif;
}
```

shadcn/ui CSS variables (from `shadcn init -t astro`) will be appended to this file automatically during init, or to a separate `shadcn.css` imported here.

### shadcn/ui Config

**`website/components.json`:**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/global.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components/react",
    "utils": "@/lib/utils",
    "ui": "@/components/react/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

Components to add: `button`, `dialog`, `input`, `label`, `checkbox`, `form`.

### Download Config

Download URLs are hardcoded in a config file. When a new release is cut, update this file and redeploy the site (documented in the release checklist).

**`website/src/lib/download-config.ts`:**

```typescript
export const DOWNLOADS = {
  macos: {
    label: 'Download for macOS (Universal)',
    url: 'https://github.com/WellBeCC/ClipJot/releases/latest/download/ClipJot_universal.dmg',
    fallbackUrl: 'https://github.com/WellBeCC/ClipJot/releases/latest',
  },
  windows: {
    label: 'Download for Windows',
    url: 'https://github.com/WellBeCC/ClipJot/releases/latest/download/ClipJot_x64-setup.exe',
    fallbackUrl: 'https://github.com/WellBeCC/ClipJot/releases/latest',
  },
} as const;

export type Platform = keyof typeof DOWNLOADS;
```

Note: Using GitHub's `/releases/latest/download/<asset-name>` pattern automatically redirects to the latest release asset, making URLs stable across releases as long as asset names stay consistent.

### Download + Subscription Dialog Flow

**`website/src/components/react/DownloadButtons.tsx`** (React island, `client:load`):

- Renders two buttons: macOS + Windows
- On click: (1) trigger the browser download via `<a href>` (or `window.location.href`), (2) check session state — if not yet shown and not yet subscribed this session, open `SubscribeDialog`
- Session state stored in `sessionStorage`: `clipjot_dialog_shown` flag prevents re-appearing on second download click
- Passes clicked platform to dialog (for analytics purposes only; dialog copy is generic per design decision)

**Dialog appearance rule:** Show at most once per browser session. Suppressed if `clipjot_subscribed_session` is set in `sessionStorage`.

**`website/src/components/react/SubscribeDialog.tsx`:**

State machine:
1. `idle` — email input + GDPR checkbox + Subscribe button (disabled until checkbox checked)
2. `loading` — button disabled, spinner shown, input disabled
3. `success` — confirmation message, auto-closes after **4 seconds**
4. `error` — generic error copy ("Something went wrong — please try again"), button re-enabled

On success: set `sessionStorage.clipjot_subscribed_session = '1'`.

**Mobile note:** Both download buttons include a note below them on small screens: _"Desktop app — download on a Mac or Windows PC."_ The buttons remain visible and functional (they will attempt the download). On `sm:` and above, the note is hidden.

### EmailOctopus Subscription via Cloudflare Worker

The EmailOctopus REST API blocks CORS for browser requests. A minimal **Cloudflare Worker** acts as a CORS proxy. This is deployed separately from the site and takes ~10 minutes to set up.

**Cloudflare Worker (`subscribe-proxy/src/index.ts`):**

```typescript
export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': 'https://wellbecc.github.io',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { email } = await request.json<{ email: string }>();

    const response = await fetch(
      `https://emailoctopus.com/api/1.6/lists/${EO_LIST_ID}/contacts`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: EO_API_KEY,
          email_address: email,
          status: 'PENDING',  // triggers double opt-in
        }),
      }
    );

    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://wellbecc.github.io',
    };

    // Treat duplicate email (409) as success — don't leak subscription status
    if (response.status === 409) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.ok ? 200 : response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },
} satisfies ExportedHandler;
```

`EO_API_KEY` and `EO_LIST_ID` are stored as Cloudflare Worker secrets (never in the codebase).

`status: 'PENDING'` triggers EmailOctopus's double opt-in flow — the subscriber receives a confirmation email before being added to the active list (required for GDPR best practice).

**`website/src/lib/subscribe.ts`:**

```typescript
const WORKER_URL = import.meta.env.PUBLIC_SUBSCRIBE_WORKER_URL;

export async function subscribeEmail(email: string): Promise<void> {
  const response = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error(`Subscription failed: ${response.status}`);
  }
}
```

`PUBLIC_SUBSCRIBE_WORKER_URL` is set in `website/.env` (not committed) and injected as a GitHub Actions secret during the build.

### Google Analytics + Cookie Consent

**`vanilla-cookieconsent` v3** is integrated as `src/components/CookieConsent.astro` and imported in `BaseLayout.astro`. Since this is a single-page site, the View Transitions issue does not apply.

Categories: `necessary` (readonly) + `analytics` (Google Analytics 4).

GA is loaded **only** via the `onConsent` and `onFirstConsent` callbacks — never as a static `<script>` tag. This ensures GA never fires before user consent.

**`website/src/components/CookieConsent.astro`:**

```astro
---
import 'vanilla-cookieconsent/dist/cookieconsent.css';
---

<style is:global>
  /* Override cookieconsent theme to use Flexoki colors */
  :root {
    --cc-bg: var(--flexoki-paper);
    --cc-primary-color: var(--flexoki-950);
    --cc-btn-primary-bg: var(--flexoki-blue-600);
    --cc-btn-primary-hover-bg: var(--flexoki-blue-700);
    --cc-btn-secondary-bg: var(--flexoki-100);
    --cc-btn-secondary-hover-bg: var(--flexoki-200);
  }
</style>

<script>
  import * as CookieConsent from 'vanilla-cookieconsent';

  const GA_ID = import.meta.env.PUBLIC_GA_ID;

  function loadGA() {
    CookieConsent.loadScript(
      `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
    ).then(() => {
      window.dataLayer = window.dataLayer || [];
      function gtag(...args: unknown[]) { window.dataLayer.push(args); }
      gtag('js', new Date());
      gtag('config', GA_ID, { anonymize_ip: true });
    });
  }

  CookieConsent.run({
    categories: {
      necessary: { enabled: true, readOnly: true },
      analytics: {
        autoClear: {
          cookies: [{ name: /^_ga/ }, { name: '_gid' }],
          reloadPage: false,
        },
      },
    },

    onConsent() {
      if (CookieConsent.acceptedCategory('analytics')) loadGA();
    },
    onFirstConsent() {
      if (CookieConsent.acceptedCategory('analytics')) loadGA();
    },
    onChange({ changedCategories }) {
      if (changedCategories.includes('analytics')) {
        if (CookieConsent.acceptedCategory('analytics')) {
          loadGA();
        }
        // autoClear handles cookie removal on revoke
      }
    },

    language: {
      default: 'en',
      translations: {
        en: {
          consentModal: {
            title: 'We use cookies',
            description:
              'We use essential cookies to keep the site running, and analytics cookies (Google Analytics) to understand how people find and use ClipJot. <a href="/ClipJot/privacy">Privacy Policy</a>',
            acceptAllBtn: 'Accept all',
            acceptNecessaryBtn: 'Reject all',
            showPreferencesBtn: 'Manage preferences',
          },
          preferencesModal: {
            title: 'Cookie preferences',
            acceptAllBtn: 'Accept all',
            acceptNecessaryBtn: 'Reject all',
            savePreferencesBtn: 'Save',
            closeIconLabel: 'Close',
            sections: [
              {
                title: 'Strictly necessary',
                description: 'Required for the site to function. Cannot be disabled.',
                linkedCategory: 'necessary',
              },
              {
                title: 'Analytics (Google Analytics)',
                description: 'Helps us understand traffic sources and popular content. Data is anonymised.',
                linkedCategory: 'analytics',
              },
            ],
          },
        },
      },
    },
  });
</script>
```

### Legal Pages

Three Astro pages using the same `BaseLayout.astro` wrapper. Content is generated with AI assistance and reviewed before launch.

| Page | Route | Key Content |
|---|---|---|
| `terms.astro` | `/terms` | Permitted use, disclaimer of warranties, limitation of liability, governing law |
| `privacy.astro` | `/privacy` | Data collected (email address only), purpose (product updates), retention, user rights (access, deletion, unsubscribe), contact |
| `data-processing.astro` | `/data-processing` | Table of third-party processors: EmailOctopus (email list), Google Analytics (web analytics), Cloudflare (Worker/CDN), GitHub (hosting) — each with country, purpose, DPA link |

### GitHub Actions Deployment

**`website/.github/workflows/deploy.yml`** — or more practically placed at the repo root: **`.github/workflows/deploy-website.yml`**:

```yaml
name: Deploy Website to GitHub Pages

on:
  push:
    branches: [main]
    paths: ['website/**']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Astro site
        uses: withastro/action@v5
        with:
          path: website
          package-manager: bun
        env:
          PUBLIC_GA_ID: ${{ secrets.PUBLIC_GA_ID }}
          PUBLIC_SUBSCRIBE_WORKER_URL: ${{ secrets.SUBSCRIBE_WORKER_URL }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**Required GitHub repository setup:**
1. Go to Settings > Pages > Source → select **GitHub Actions**
2. Add repository secrets: `PUBLIC_GA_ID` (GA4 Measurement ID), `SUBSCRIBE_WORKER_URL` (Cloudflare Worker URL)

The workflow triggers only when files under `website/` change, preventing unnecessary deployments on app-only commits.

## Implementation Phases

### Phase 1: Project Scaffolding

- [ ] Create `website/` directory with its own `package.json`
- [ ] `bun create astro@latest` inside `website/` (minimal template, strict TypeScript)
- [ ] `bun astro add react` — React integration
- [ ] `bun astro add tailwind` — Tailwind v4 via `@tailwindcss/vite`
- [ ] `bunx shadcn@latest init -t astro` — shadcn/ui
- [ ] Copy `src/assets/flexoki.css` and `src/assets/tokens.css` into `website/src/styles/`
- [ ] Write `global.css` with `@theme` Flexoki mapping
- [ ] Configure `astro.config.mjs` with `site`, `base: '/ClipJot'`, `output: 'static'`
- [ ] Configure `tsconfig.json` (strict, jsx react-jsx)
- [ ] Add shadcn components: `button`, `dialog`, `input`, `label`, `checkbox`, `form`
- [ ] Verify `bun run build` produces a static `dist/` with correct `/ClipJot/` base paths

### Phase 2: Landing Page Static Sections

- [ ] `BaseLayout.astro` — `<head>` with SEO tags, OG tags, JSON-LD schema, GA script placeholder (blocked), font import
- [ ] `Header.astro` — logo + Download CTA (scrolls to download section)
- [ ] `Hero.astro` — H1, subheading, download button island slot, app screenshot placeholder
- [ ] `HowItWorks.astro` — 3-step layout (Paste → Annotate → Copy back)
- [ ] `Features.astro` — feature grid (annotations, redact, crop, clipboard round-trip)
- [ ] `DownloadSection.astro` — repeated download CTAs section
- [ ] `SubscribeSection.astro` — bottom subscribe section wrapper
- [ ] `Footer.astro` — links to `/terms`, `/privacy`, `/data-processing`, GitHub link, copyright
- [ ] Mobile responsive layout across all sections
- [ ] Desktop-only note below download buttons (`sm:hidden` note visible on mobile)

### Phase 3: Interactive React Islands

- [ ] `website/src/lib/download-config.ts` — platform download URL config
- [ ] `website/src/lib/subscribe.ts` — EmailOctopus API wrapper (via CF Worker)
- [ ] `DownloadButtons.tsx` — two download buttons, session state management, dialog trigger
- [ ] `SubscribeDialog.tsx` — shadcn Dialog with email input, GDPR checkbox, state machine (idle → loading → success/error), 4-second auto-close on success
- [ ] `SubscribeForm.tsx` — bottom-of-page form with same GDPR checkbox pattern, inline success/error states
- [ ] Mount islands in `Hero.astro`, `DownloadSection.astro`, `SubscribeSection.astro` with `client:load`
- [ ] `CookieConsent.astro` — vanilla-cookieconsent v3 init with GA gating callbacks
- [ ] Import `CookieConsent` in `BaseLayout.astro`
- [ ] `website/.env.example` with `PUBLIC_GA_ID` and `PUBLIC_SUBSCRIBE_WORKER_URL` documented

### Phase 4: Cloudflare Worker Proxy

- [ ] Create `subscribe-proxy/` directory (separate from `website/`)
- [ ] Initialize Cloudflare Worker with Wrangler (`bunx wrangler init`)
- [ ] Implement `subscribe-proxy/src/index.ts` — CORS proxy to EmailOctopus API
- [ ] Set Cloudflare secrets: `EO_API_KEY`, `EO_LIST_ID` via `wrangler secret put`
- [ ] Deploy Worker: `bunx wrangler deploy`
- [ ] Test end-to-end: subscribe form → Worker → EmailOctopus double opt-in email

### Phase 5: Legal Pages

- [ ] Draft `terms.astro` content (AI-assisted, reviewed)
- [ ] Draft `privacy.astro` content (email collection, GA, EmailOctopus)
- [ ] Draft `data-processing.astro` with processor table (EmailOctopus, Google Analytics, Cloudflare, GitHub)
- [ ] All pages use `BaseLayout.astro`, linked from footer

### Phase 6: GitHub Actions + Deployment

- [ ] Create `.github/workflows/deploy-website.yml` at repo root
- [ ] Add GitHub repository secrets: `PUBLIC_GA_ID`, `SUBSCRIBE_WORKER_URL`
- [ ] Set GitHub Pages source to **GitHub Actions** in repo settings
- [ ] Test deployment on push to `main`
- [ ] Verify `https://wellbecc.github.io/ClipJot/` serves correct content
- [ ] Verify all internal links work with `/ClipJot/` base path

### Phase 7: QA + SEO Verification

- [ ] Verify `<title>`, meta description, OG tags, JSON-LD in page source
- [ ] Run Lighthouse (target: Performance ≥90, Accessibility ≥90, SEO ≥95)
- [ ] Check Core Web Vitals: LCP < 2.5s, CLS < 0.1
- [ ] Test download buttons — files download correctly on macOS + Windows
- [ ] Test subscription dialog flow: appears once per session, correct states
- [ ] Test bottom subscribe form: correct states
- [ ] Test GDPR checkbox: subscribe button disabled until checked
- [ ] Test cookie consent: banner on first visit, preference persists, GA fires only after accept
- [ ] Test on mobile: layout correct, download note visible
- [ ] Verify legal page links in footer all work
- [ ] Test double opt-in: submit form → receive EmailOctopus confirmation email

## System-Wide Impact

- **No impact on Tauri app** — the website is a fully isolated subdirectory with its own `package.json` and `node_modules`.
- **Root `package.json` unchanged** — Bun workspaces are not used; the website is self-contained.
- **New GitHub Actions workflow** — triggers only on `website/**` path changes; does not affect any existing CI for the app.
- **Cloudflare Worker** — external service, independent of GitHub Pages; failure does not affect the static site.

## Acceptance Criteria

### Functional

- [ ] R1: Site deploys to GitHub Pages on push to `main` via GitHub Actions
- [ ] R3/R15: macOS and Windows download buttons trigger immediate file downloads from GitHub Releases
- [ ] R6: No email gate — download is immediate on button click
- [ ] R7: Post-download subscription dialog appears once per session, not if already subscribed
- [ ] R8/R10: Subscribe button disabled until GDPR checkbox is ticked (both dialog and form)
- [ ] R9: Successful subscription shows confirmation state; dialog auto-closes after 4 seconds
- [ ] R11: Page title = "ClipJot – Free Screenshot Editor for Mac & Windows"
- [ ] R11: Meta description matches SEO target (≤160 chars)
- [ ] R11: JSON-LD `SoftwareApplication` schema present with correct OS and price
- [ ] R16: `/terms` page accessible and linked from footer
- [ ] R17: `/privacy` page accessible and linked from footer
- [ ] R18: `/data-processing` page accessible and linked from footer
- [ ] R20: Cookie consent banner on first visit; preference persists on return
- [ ] R20: GA fires only after analytics consent is given

### Non-Functional

- [ ] Lighthouse Performance ≥90 on desktop
- [ ] Core Web Vitals: LCP < 2.5s, CLS < 0.1
- [ ] Mobile layout correct on 375px width
- [ ] All internal links use correct `/ClipJot/` base path
- [ ] `bun run tsc` passes with no errors
- [ ] Trailing newline preserved in all files (per CLAUDE.md)

### GDPR

- [ ] Subscribe button is disabled (not just visually) until checkbox is checked
- [ ] Double opt-in enabled in EmailOctopus list settings before launch
- [ ] No pre-ticked boxes anywhere on the site
- [ ] Cookie consent preference stored and respected on return visits
- [ ] `/data-processing` lists all four processors (EmailOctopus, Google Analytics, Cloudflare, GitHub)

## Dependencies & Risks

| Item | Type | Notes |
|---|---|---|
| GitHub Releases binary assets | Hard dependency | Site can launch without, but download buttons will 404. Use `/releases/latest/download/<name>` URL pattern for stability across releases. |
| EmailOctopus account setup | Hard dependency | Free account + API key + list ID required before Phase 4 |
| EmailOctopus double opt-in | Configuration | Must be explicitly enabled in list settings (off by default) |
| Cloudflare account | Hard dependency | Free account required; Worker deployment takes ~10 min |
| GA4 Measurement ID | Configuration | Required for analytics; safe to launch without (leave `PUBLIC_GA_ID` empty and skip GA init) |
| Open Graph image | Soft dependency | 1200×630px image needed for social previews. Placeholder acceptable at launch. |
| Legal content review | Risk | AI-drafted legal content must be reviewed before launch. Incorrect legal pages create GDPR/liability risk. |
| GitHub Pages setup | Configuration | Must set source to "GitHub Actions" in repo settings before first deploy |
| Cloudflare Worker CORS restriction | Architecture | Worker origin-checks `wellbecc.github.io` — if domain changes, update the Worker |
| GitHub Releases URL stability | Risk | `/releases/latest/download/<asset-name>` is stable only if asset names stay consistent across releases. Document this in the release checklist. |

## Sources & References

### Origin

- **Origin document:** [docs/brainstorms/2026-04-01-clipjot-marketing-website-requirements.md](docs/brainstorms/2026-04-01-clipjot-marketing-website-requirements.md)
  - Key decisions carried forward: (1) direct download with optional post-download subscription dialog, (2) Astro + React islands + shadcn/ui + Tailwind v4 stack, (3) GDPR-compliant subscription with mandatory checkbox, (4) legal pages in scope

### Internal References

- Flexoki CSS primitives: [src/assets/flexoki.css](src/assets/flexoki.css)
- Semantic design tokens: [src/assets/tokens.css](src/assets/tokens.css)

### External References

- Astro docs: https://docs.astro.build
- Astro + React integration: https://docs.astro.build/en/guides/integrations-guide/react/
- shadcn/ui Astro guide: https://ui.shadcn.com/docs/installation/astro
- Tailwind v4 in Astro: https://docs.astro.build/en/guides/styling/#tailwind
- vanilla-cookieconsent v3: https://cookieconsent.orestbida.com/essential/getting-started.html
- EmailOctopus API docs: https://emailoctopus.com/api-documentation
- Cloudflare Workers free tier: https://developers.cloudflare.com/workers/platform/limits/
- GitHub Actions for Astro: https://docs.astro.build/en/guides/deploy/github/
- withastro/action@v5: https://github.com/withastro/action
