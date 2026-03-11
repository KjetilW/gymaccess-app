import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'nb'] as const,
  defaultLocale: 'en',
  localePrefix: 'always',
  pathnames: {
    '/': '/',
    '/join/[gymId]': {
      en: '/join/[gymId]',
      nb: '/bli-med/[gymId]',
    },
    '/join/[gymId]/payment': {
      en: '/join/[gymId]/payment',
      nb: '/bli-med/[gymId]/betaling',
    },
    '/join/[gymId]/success': {
      en: '/join/[gymId]/success',
      nb: '/bli-med/[gymId]/velkommen',
    },
    '/manage/[token]': {
      en: '/manage/[token]',
      nb: '/administrer/[token]',
    },
  },
});

export const locales = routing.locales;
export type Locale = (typeof locales)[number];
export const defaultLocale = routing.defaultLocale;
