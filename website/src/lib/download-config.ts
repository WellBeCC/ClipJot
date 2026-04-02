export const DOWNLOADS = {
  macos: {
    label: 'Download for macOS (Universal)',
    url: 'https://github.com/Lumeer/ClipJot/releases/latest/download/ClipJot_universal.dmg',
    fallbackUrl: 'https://github.com/Lumeer/ClipJot/releases/latest',
  },
  windows: {
    label: 'Download for Windows',
    url: 'https://github.com/Lumeer/ClipJot/releases/latest/download/ClipJot_x64-setup.exe',
    fallbackUrl: 'https://github.com/Lumeer/ClipJot/releases/latest',
  },
} as const;

export type Platform = keyof typeof DOWNLOADS;
