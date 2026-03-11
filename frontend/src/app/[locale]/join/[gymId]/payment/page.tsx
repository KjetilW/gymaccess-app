import { getTranslations } from 'next-intl/server';
import PaymentPageClient from './PaymentPageClient';

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const t = await getTranslations({ locale: params.locale, namespace: 'meta.join' });
  return {
    title: t('title', { gymName: 'GymAccess' }),
    description: t('description', { gymName: 'GymAccess' }),
  };
}

export default function PaymentPage() {
  return <PaymentPageClient />;
}
