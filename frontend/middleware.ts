import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

// Norwegian language tags that map to 'nb' locale
const NORWEGIAN_LANGS = new Set(['nb', 'no', 'nb-NO', 'nn', 'nn-NO']);

function getPreferredLocale(request: NextRequest): string | null {
  // 1. Explicit user preference cookie takes priority
  const cookiePref = request.cookies.get('locale-pref')?.value;
  if (cookiePref && (routing.locales as readonly string[]).includes(cookiePref)) {
    return cookiePref;
  }

  // 2. Fall back to Accept-Language header detection
  const acceptLang = request.headers.get('Accept-Language') ?? '';
  const langs = acceptLang.split(',').map((l) => l.split(';')[0].trim());
  for (const lang of langs) {
    if (NORWEGIAN_LANGS.has(lang)) return 'nb';
  }

  return null; // next-intl will use defaultLocale ('en')
}

export default function middleware(request: NextRequest) {
  const preferredLocale = getPreferredLocale(request);

  if (preferredLocale) {
    // Override Accept-Language header so next-intl's detection picks up our preference.
    // This lets next-intl handle translated-slug redirects correctly via its pathnames config.
    const headers = new Headers(request.headers);
    headers.set('Accept-Language', preferredLocale);
    // NextRequest can be constructed from a URL + init object; we forward the essentials
    const modifiedRequest = new NextRequest(request.url, {
      headers,
      method: request.method,
      // body only needed for mutating requests — middleware never mutates
    });
    // Copy cookies so next-intl and other middleware can read them
    for (const { name, value } of request.cookies.getAll()) {
      modifiedRequest.cookies.set(name, value);
    }
    return intlMiddleware(modifiedRequest);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!admin|_next|_vercel|.*\\..*).*)'],
};
