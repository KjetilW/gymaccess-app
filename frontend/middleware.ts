import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for explicit locale preference cookie
  const localePref = request.cookies.get('locale-pref')?.value;
  const validLocales = routing.locales as readonly string[];

  if (localePref && validLocales.includes(localePref)) {
    // If user has a preference cookie, check if current path already matches it
    const pathLocale = pathname.split('/')[1];
    if (pathLocale !== localePref && validLocales.includes(pathLocale)) {
      // Replace only the leading locale segment
      const newPath = `/${localePref}${pathname.slice(pathLocale.length + 1)}`;
      return NextResponse.redirect(new URL(newPath, request.url));
    }
  }

  return intlMiddleware(request);
}

export const config = {
  // Match all paths except: admin/*, _next/*, _vercel/*, and static files
  matcher: ['/((?!admin|_next|_vercel|.*\\..*).*)'],
};
