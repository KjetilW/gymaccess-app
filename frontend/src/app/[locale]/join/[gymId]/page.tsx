import { getTranslations } from 'next-intl/server';
import JoinPageClient from './JoinPageClient';

const BASE_URL = 'https://gymaccess.app';

export async function generateMetadata({ params }: { params: { locale: string; gymId: string } }) {
  const t = await getTranslations({ locale: params.locale, namespace: 'meta.join' });
  return {
    title: t('title', { gymName: 'GymAccess' }),
    description: t('description', { gymName: 'GymAccess' }),
    alternates: {
      canonical: `${BASE_URL}/${params.locale === 'nb' ? 'nb/bli-med' : 'en/join'}/${params.gymId}`,
      languages: {
        en: `${BASE_URL}/en/join/${params.gymId}`,
        nb: `${BASE_URL}/nb/bli-med/${params.gymId}`,
        'x-default': `${BASE_URL}/en/join/${params.gymId}`,
      },
    },
  };
}

export default function JoinPage() {
  return <JoinPageClient />;
}
