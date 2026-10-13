import type { APIRoute } from 'astro';
import { DOWNLOADS } from '../lib/download-config';
import { APP_VERSION, DEFAULT_DESCRIPTION, FAQ, FEATURE_LIST, LICENSE_URL, REPO_URL, SITE_URL } from '../lib/site';

export const GET: APIRoute = () => {
  const body = `# ClipJot

> ${DEFAULT_DESCRIPTION}

ClipJot is a free desktop app for macOS 12+ and Windows 10+, made by WellBe s.r.o. (Brno, Czech Republic).${APP_VERSION ? ` The current version is ${APP_VERSION}.` : ''} It opens the image on your clipboard, lets you annotate it, and copies the result back, so there are no files to save or open. It works offline: images never leave the computer. No account, subscription or watermark. ClipJot is open source under the GNU GPL v3.0.

## Features

${FEATURE_LIST.map((f) => `- ${f}`).join('\n')}

## Download

- [ClipJot for macOS (Universal, Apple Silicon and Intel)](${DOWNLOADS.macos.url})
- [ClipJot for Windows (x64 installer)](${DOWNLOADS.windows.url})
- [All releases and changelog](${REPO_URL}/releases)

## FAQ

${FAQ.map(({ q, a }) => `### ${q}\n\n${a}`).join('\n\n')}

## Links

- [Website](${SITE_URL}/)
- [Source code on GitHub](${REPO_URL})
- [License: GPL-3.0](${LICENSE_URL})
- [Privacy policy](${SITE_URL}/privacy/)
- [Terms and conditions](${SITE_URL}/terms/)
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
