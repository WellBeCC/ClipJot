import type { APIRoute } from 'astro';
import { SITE_URL } from '../lib/site';

const PAGES = ['/', '/privacy/', '/terms/', '/data-processing/'];

export const GET: APIRoute = () => {
  const urls = PAGES.map((path) => `  <url><loc>${SITE_URL}${path}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
