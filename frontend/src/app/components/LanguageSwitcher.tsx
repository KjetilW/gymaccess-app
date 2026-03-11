'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '../../../i18n/navigation';
import { routing } from '../../../i18n/routing';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(newLocale: string) {
    // Set explicit preference cookie (expires in 1 year)
    document.cookie = `locale-pref=${newLocale};path=/;max-age=31536000;SameSite=Lax`;
    router.replace(pathname as any, { locale: newLocale as any });
  }

  return (
    <div className="flex items-center gap-1 text-xs font-semibold">
      {routing.locales.map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && <span className="text-forest-500">|</span>}
          <button
            onClick={() => switchLocale(l)}
            className={`px-1 py-0.5 rounded transition-colors ${
              locale === l
                ? 'text-forest-900 font-bold'
                : 'text-forest-500 hover:text-forest-700'
            }`}
          >
            {l.toUpperCase()}
          </button>
        </span>
      ))}
    </div>
  );
}
