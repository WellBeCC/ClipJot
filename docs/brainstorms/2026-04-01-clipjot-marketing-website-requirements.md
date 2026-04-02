---
date: 2026-04-02
topic: clipjot-marketing-website
---

# ClipJot Marketing Website

## Problem Frame

ClipJot has no public web presence. Potential users have nowhere to learn about the app or download it. A focused marketing site hosted on GitHub Pages will serve as the public face of the project — offering frictionless direct downloads, an optional subscription for product updates, and full GDPR-compliant legal coverage.

## Requirements

### Core Site

- R1. Site hosted via GitHub Pages, built statically and deployed via GitHub Actions on push to `main`.
- R2. The site uses the Flexoki color scheme to visually align with the app, implemented as a Tailwind CSS custom theme, with shadcn/ui components.
- R3. Built with Astro + React islands + shadcn/ui: static content (hero, features, how-it-works, footer) renders to plain HTML at build time; interactive components (subscribe dialog, subscribe form, cookie consent) hydrate as React islands (`client:load`).

### Landing Page

- R4. Single landing page (`/`) is the primary entry point.
- R5. The page includes two download CTAs — "Download for macOS (Universal)" and "Download for Windows" — placed in the hero section and a dedicated download section lower on the page.
- R6. Clicking a download button immediately triggers the file download (direct link to the GitHub Releases asset for that platform). No email gate.
- R7. After download begins, a modal dialog appears offering the user the option to subscribe for product updates. The dialog is dismissible — subscribing is fully optional.
- R8. The subscription dialog contains: an email input, a GDPR checkbox ("I agree to the [Terms and Conditions] and [Privacy Policy]"), and a subscribe button (disabled until the checkbox is ticked).
- R9. On successful subscription, the dialog transitions to a confirmation state ("You're subscribed. We'll keep you posted.").
- R10. A subscribe section appears near the bottom of the landing page (above the footer) with the same email input + GDPR checkbox as the dialog (R8).
- R11. The page is SEO-optimized: keyword-targeted `<title>`, meta description, Open Graph tags, and `SoftwareApplication` JSON-LD schema.
- R12. The page communicates the core value proposition and workflow: paste clipboard image → annotate → copy back.
- R13. The page includes a "How it works" section with three steps illustrating the clipboard-first workflow.
- R14. The page includes a features section: annotations (arrows, text, shapes), redaction/blur, crop, clipboard round-trip.
- R15. Download links point to GitHub Releases assets.

### Legal Pages

- R16. `/terms` — Terms and Conditions page.
- R17. `/privacy` — Privacy Policy page.
- R18. `/data-processing` — List of information processing entities (third-party services used: email provider, analytics if any, etc.).
- R19. All legal pages are linked in the site footer.

### Cookie Consent

- R20. A cookie consent banner is implemented using `vanilla-cookieconsent` (MIT license). It appears on first visit, allows accepting/rejecting non-essential cookies, and persists the user's preference.
- R21. The banner links to `/privacy` for more information.

## SEO Strategy

### Target Keywords

| Priority | Keyword | Intent | Notes |
|----------|---------|--------|-------|
| Primary | `screenshot editor` | Download | High volume; competitive but strong fit |
| Primary | `clipboard image editor` | Download | Low volume; exact match to product |
| Primary | `free screenshot editor mac windows` | Download | Cross-platform + free differentiator |
| Secondary | `screenshot annotation tool` | Download | Describes core feature |
| Secondary | `image annotation tool` | Research | Broader, educational intent |
| Long-tail | `annotate clipboard screenshot` | Download | Low competition; workflow-specific |
| Long-tail | `paste and annotate image` | Download | Very specific to ClipJot's workflow |

### Page SEO Targets

**Title tag (≤60 chars):**
```
ClipJot – Free Screenshot Editor for Mac & Windows
```

**Meta description (≤160 chars):**
```
Paste any image from your clipboard, add arrows, text, and shapes, then copy it back in seconds. Free screenshot editor for macOS and Windows.
```

**H1:**
```
Edit screenshots straight from your clipboard
```

**Hero subheading:**
```
Paste. Annotate. Copy back. Done in seconds.
```

**JSON-LD schema:** `SoftwareApplication` with `operatingSystem: ["macOS", "Windows"]`, `applicationCategory: "UtilitiesApplication"`, `offers: { price: "0" }`.

### Open Graph

- `og:title`: ClipJot — Free Clipboard Screenshot Editor
- `og:description`: Same as meta description
- `og:image`: App screenshot or branded card (1200×630)
- `og:type`: website

## Page Structure

```
Header: Logo + "Download" CTA button (scrolls to download section)
Hero: H1, subheading, macOS + Windows download buttons, app screenshot/demo
How it works: 3-step flow (Paste → Annotate → Copy back)
Features: Icons + descriptions for annotations, redact, crop, clipboard round-trip
Download section: Repeated CTAs for macOS and Windows
Subscribe section: Email input + GDPR checkbox + subscribe button
Footer: Links to /terms, /privacy, /data-processing | GitHub link | copyright
```

## Download + Subscription Flow

1. User clicks a platform download button.
2. Browser immediately starts downloading the file from the GitHub Releases URL.
3. A modal appears: "While your download starts, want to get notified about updates?" with email input + GDPR checkbox.
4. User can dismiss the modal or fill in email + tick checkbox and subscribe.
5. On success, the dialog shows confirmation and auto-closes after a few seconds.
6. The email is added to the subscription list via client-side API call.

## GDPR Compliance

- All subscription touchpoints (dialog + bottom form) require an explicit checkbox: "I agree to the [Terms and Conditions] and [Privacy Policy]". The subscribe button is disabled until checked.
- `vanilla-cookieconsent` handles cookie consent banner with accept/reject and persistent preference.
- `/privacy` documents what data is collected and how it is used.
- `/data-processing` lists all third-party services that process user data (email provider, any analytics).
- No pre-ticked boxes, no dark patterns.

## Success Criteria

- Clicking a download button immediately triggers the file download for the correct platform.
- The post-download subscription dialog appears after the download starts.
- Subscription requires GDPR checkbox to be ticked before the button enables.
- Cookie consent banner appears on first visit and preference persists across visits.
- Legal pages exist at `/terms`, `/privacy`, `/data-processing` and are linked in the footer.
- Page passes Core Web Vitals (LCP < 2.5s, CLS < 0.1).
- Page renders correctly on mobile.
- GitHub Actions build deploys successfully to GitHub Pages on push to `main`.
- Page title and meta description match SEO targets above.

## Scope Boundaries

- No authentication, user accounts, or dashboard.
- No payment or pricing — the app is free.
- Actual download binary hosting is out of scope (GitHub Releases handles this).
- No server-side backend — all interactivity runs client-side or via third-party SaaS APIs.
- No blog or changelog page.

## Key Decisions

- **Direct download (no email gate)**: Eliminated friction. Users download immediately. Subscription for updates is optional and appears post-download.
- **GDPR-first subscription**: Checkbox required before subscribing; no implied consent. Covers EU users.
- **Legal pages in scope**: Terms, Privacy, and Data Processing entities pages are required to support GDPR compliance and the subscribe flow.
- **`vanilla-cookieconsent` (MIT)**: Only free, MIT-licensed library with full GDPR features (consent categories, accept/reject/manage, persistent prefs, Google Consent Mode v2). Integrates as a plain Astro `<script>` — no React overhead.
- **Astro + React islands + shadcn/ui + Tailwind**: Static HTML for content sections; React islands only for interactive components (subscription form/dialog, cookie consent). Excellent Core Web Vitals.
- **Flexoki + Tailwind custom theme**: Flexoki palette mapped to Tailwind CSS custom theme variables to align visually with the app.
- **GitHub Releases for binaries**: Natural fit for a GitHub-hosted project; no additional file hosting needed.

## Dependencies / Assumptions

- GitHub Releases will exist for the app binaries when the site goes live.
- A third-party subscription/email list service account is set up before launch (service TBD in planning).
- An Open Graph image (1200×630) will be created for social previews.
- Legal page content (T&C, Privacy Policy, Data Processing list) will need to be drafted — likely AI-assisted but reviewed.

## Outstanding Questions

### Resolve Before Planning

- None.

### Deferred to Planning

- [Affects R8, R10][Needs research] Which subscription list service to use for a static site? Options: Mailchimp (free ≤500 subscribers), Brevo (free ≤300/day), EmailOctopus (free ≤2500 subscribers). Needs a client-side API or embeddable form. Evaluate GDPR compliance posture of each.
- [Affects R1][Technical] GitHub Pages deployment: confirm GitHub Actions workflow approach (`peaceiris/actions-gh-pages` vs native Pages deployment action) and whether a custom domain is needed.
- [Affects R16–R18][Content] Legal page content needs to be drafted. Planner should determine whether to generate placeholder content or stub pages with a "coming soon" note for initial deploy.

## Next Steps

→ `/ce:plan` for structured implementation planning
