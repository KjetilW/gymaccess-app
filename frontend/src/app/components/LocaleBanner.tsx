'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '../../../i18n/navigation';

const NORWEGIAN_LANGS = ['nb', 'no', 'nb-NO', 'nn', 'nn-NO'];

function isBrowserNorwegian(): boolean {
  if (typeof navigator === 'undefined') return false;
  const langs = navigator.languages || [navigator.language];
  return langs.some((l) => NORWEGIAN_LANGS.some((n) => l.toLowerCase().startsWith(n.toLowerCase())));
}

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.cookie.split(';').find((c) => c.trim().startsWith(name + '='))?.split('=')[1];
}

export function LocaleBanner() {
  const locale = useLocale();
  const t = useTranslations('banner');
  const router = useRouter();
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (locale !== 'en') return;
    if (getCookie('locale-pref')) return;
    if (getCookie('locale-banner-dismissed')) return;
    if (isBrowserNorwegian()) setShow(true);
  }, [locale]);

  if (!show) return null;

  function switchToNorwegian() {
    document.cookie = 'locale-pref=nb;path=/;max-age=31536000;SameSite=Lax';
    document.cookie = 'locale-banner-dismissed=1;path=/;max-age=31536000;SameSite=Lax';
    router.replace(pathname as any, { locale: 'nb' as any });
  }

  function dismiss() {
    document.cookie = 'locale-banner-dismissed=1;path=/;max-age=31536000;SameSite=Lax';
    setShow(false);
  }

  return (
    <div className="bg-forest-800 text-forest-100 px-6 py-2.5 flex items-center justify-between gap-4 text-sm">
      <span>{t('text')}</span>
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={switchToNorwegian}
          className="font-semibold text-white hover:text-forest-200 transition-colors"
        >
          {t('cta')}
        </button>
        <button
          onClick={dismiss}
          className="text-forest-400 hover:text-forest-200 transition-colors text-xs"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
