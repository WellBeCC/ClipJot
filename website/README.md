# ClipJot website

Source of [clipjot.app](https://clipjot.app), built with Astro, React islands and Tailwind.

```sh
bun install
bun run dev      # http://localhost:4321
bun run build    # static output in dist/
bun run tsc      # type check
```

Pushing changes under `website/` to `main` deploys to GitHub Pages (`.github/workflows/deploy-website.yml`).

## SEO and AI discoverability

- Product facts (description, features, FAQ, version) live in `src/lib/site.ts`. The page, the JSON-LD
  (`SoftwareApplication`, `Organization`, `FAQPage`) and `/llms.txt` are all generated from it, so edit them there.
- The app version is read from the root `package.json` at build time.
- `/sitemap.xml` lists the indexable pages (`src/pages/sitemap.xml.ts`); add new public pages there.
- Pages that should stay out of search results pass `noindex` to `BaseLayout`.
- `public/og-image.png` (1200×630) is the social preview; `public/app-screenshot.{png,webp}` is the hero image.
