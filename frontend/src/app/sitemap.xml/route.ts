import { NextResponse } from 'next/server';

const BASE_URL = 'https://gymaccess.app';

interface SitemapUrl {
  en: string;
  nb: string;
}

const staticUrls: SitemapUrl[] = [
  { en: '/en/', nb: '/nb/' },
  // Dynamic routes (join, manage) are excluded — gym/member-specific, not indexable
];

export async function GET() {
  const urlEntries = staticUrls.map(({ en, nb }) => `
  <url>
    <loc>${BASE_URL}${en}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <xhtml:link rel="alternate" hreflang="en" href="${BASE_URL}${en}"/>
    <xhtml:link rel="alternate" hreflang="nb" href="${BASE_URL}${nb}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}${en}"/>
  </url>
  <url>
    <loc>${BASE_URL}${nb}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <xhtml:link rel="alternate" hreflang="en" href="${BASE_URL}${en}"/>
    <xhtml:link rel="alternate" hreflang="nb" href="${BASE_URL}${nb}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}${en}"/>
  </url>`
  ).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
