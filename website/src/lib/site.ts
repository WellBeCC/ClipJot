import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DOWNLOADS } from './download-config';

export const SITE_URL = 'https://clipjot.app';
export const REPO_URL = 'https://github.com/WellBeCC/ClipJot';
export const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;

/** App version, read at build time from the app's package.json (website/ is the build cwd). */
export const APP_VERSION: string = (() => {
  try {
    return JSON.parse(readFileSync(resolve(process.cwd(), '../package.json'), 'utf8')).version;
  } catch {
    return '';
  }
})();

export const DEFAULT_DESCRIPTION =
  'Paste any image from your clipboard, add arrows, text, shapes and numbered callouts, redact sensitive data, then copy it back in seconds. Free, open-source screenshot editor for macOS and Windows.';

export const FEATURE_LIST = [
  'Paste images from the clipboard and edit them instantly',
  'Arrows, lines, rectangles and circles',
  'Text annotations',
  'Numbered callouts for step-by-step instructions',
  'Freehand pen, pencil, marker and eraser',
  'Redaction with solid, pixelate and blur styles',
  'Crop with aspect ratio presets',
  'Undo and redo',
  'Multiple tabs and tab duplication',
  'Copy the edited image back to the clipboard',
  'Save to file',
  'Global keyboard shortcut to open ClipJot',
];

export const FAQ = [
  {
    q: 'What is ClipJot?',
    a: 'ClipJot is a free, open-source desktop screenshot editor for macOS and Windows. It opens the image that is currently on your clipboard, lets you add arrows, text, shapes, numbered callouts and redactions, and copies the result back to the clipboard so you can paste it into Slack, email, Notion or a ticket.',
  },
  {
    q: 'Is ClipJot free?',
    a: 'Yes. ClipJot is free to download and use, with no account, no subscription and no watermark.',
  },
  {
    q: 'Is ClipJot open source?',
    a: 'Yes. ClipJot is open source under the GNU General Public License v3.0 (GPL-3.0). The full source code is on GitHub at github.com/WellBeCC/ClipJot.',
  },
  {
    q: 'How do I annotate a screenshot from the clipboard?',
    a: 'Take a screenshot to the clipboard (for example Cmd+Ctrl+Shift+4 on macOS or Win+Shift+S on Windows), press the ClipJot shortcut Cmd+Shift+J on macOS or Ctrl+Shift+J on Windows, annotate the image, then press Cmd+C or Ctrl+C to copy it back.',
  },
  {
    q: 'Can I hide passwords, emails or other sensitive data in a screenshot?',
    a: 'Yes. The Redact tool covers any area with a solid block, pixelation or blur before you share the image.',
  },
  {
    q: 'Does ClipJot upload my images?',
    a: 'No. ClipJot works entirely offline. Images stay on your computer and the app makes no network requests.',
  },
  {
    q: 'Which operating systems does ClipJot support?',
    a: 'ClipJot runs on macOS 12 or later (Apple Silicon and Intel) and Windows 10 or later.',
  },
];

export const softwareJsonLd = (description = DEFAULT_DESCRIPTION) => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ClipJot',
  applicationCategory: 'MultimediaApplication',
  applicationSubCategory: 'Screenshot editor',
  operatingSystem: 'macOS 12+, Windows 10+',
  ...(APP_VERSION && { softwareVersion: APP_VERSION }),
  description,
  url: SITE_URL,
  image: `${SITE_URL}/og-image.png`,
  screenshot: `${SITE_URL}/app-screenshot.png`,
  downloadUrl: [DOWNLOADS.macos.url, DOWNLOADS.windows.url],
  featureList: FEATURE_LIST,
  isAccessibleForFree: true,
  license: LICENSE_URL,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  publisher: { '@id': `${SITE_URL}/#organization` },
  sameAs: [REPO_URL],
});

export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'WellBe s.r.o.',
  url: SITE_URL,
  logo: `${SITE_URL}/apple-touch-icon.png`,
  sameAs: [REPO_URL],
};

export const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
};
