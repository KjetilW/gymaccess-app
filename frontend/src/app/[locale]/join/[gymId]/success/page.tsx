import { getTranslations } from 'next-intl/server';
import SuccessPageClient from './SuccessPageClient';

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const t = await getTranslations({ locale: params.locale, namespace: 'meta.join' });
  return {
    title: t('title', { gymName: 'GymAccess' }),
  };
}

export default function SuccessPage() {
  return <SuccessPageClient />;
}
