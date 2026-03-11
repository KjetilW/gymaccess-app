import { getTranslations } from 'next-intl/server';
import ManagePageClient from './ManagePageClient';

const BASE_URL = 'https://gymaccess.app';

export async function generateMetadata({ params }: { params: { locale: string; token: string } }) {
  const t = await getTranslations({ locale: params.locale, namespace: 'meta.manage' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `${BASE_URL}/${params.locale === 'nb' ? 'nb/administrer' : 'en/manage'}/${params.token}`,
      languages: {
        en: `${BASE_URL}/en/manage/${params.token}`,
        nb: `${BASE_URL}/nb/administrer/${params.token}`,
        'x-default': `${BASE_URL}/en/manage/${params.token}`,
      },
    },
  };
}

export default function ManagePage() {
  return <ManagePageClient />;
}
