import { getTranslations } from 'next-intl/server';
import NextLink from 'next/link';
import { FaqItem } from '../components/FaqItem';
import { Logo } from '../components/Logo';

const BASE_URL = 'https://gymaccess.app';

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const t = await getTranslations({ locale: params.locale, namespace: 'meta.landing' });
  return {
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('ogTitle'),
      description: t('ogDescription'),
    },
    alternates: {
      canonical: `${BASE_URL}/${params.locale}/`,
      languages: {
        en: `${BASE_URL}/en/`,
        nb: `${BASE_URL}/nb/`,
        'x-default': `${BASE_URL}/en/`,
      },
    },
  };
}

export default async function Home({ params }: { params: { locale: string } }) {
  const t = await getTranslations({ locale: params.locale, namespace: 'landing' });
  const nav = await getTranslations({ locale: params.locale, namespace: 'nav' });

  const starterFeatures = t.raw('pricing.starter.features') as string[];
  const proFeatures = t.raw('pricing.pro.features') as string[];

  return (
    <div className="min-h-screen bg-warm-50">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-6xl mx-auto">
        <Logo size={32} />
        <div className="flex items-center gap-4">
          <NextLink href="/admin/login" className="text-forest-700 font-medium hover:text-forest-900 transition-colors text-sm">
            {nav('signIn')}
          </NextLink>
          <NextLink
            href="/admin/register"
            className="bg-forest-900 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-forest-800 transition-colors text-sm"
          >
            {nav('register')}
          </NextLink>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-8 py-20 lg:py-28 text-center">
        <div className="inline-flex items-center gap-2 bg-forest-50 border border-forest-200 text-forest-700 text-sm font-medium px-4 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-sage"></span>
          {t('badge')}
        </div>

        <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-7xl text-forest-900 leading-[1.05] mb-6 tracking-tight">
          {t('hero.headline1')}<br />
          <span className="text-sage-dark">{t('hero.headline2')}</span>
        </h1>
        <p className="text-xl text-forest-700 max-w-2xl mx-auto mb-10 leading-relaxed">
          {t('hero.body')}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <NextLink href="/admin/register" className="bg-forest-900 text-white px-8 py-4 rounded-xl font-display font-semibold text-lg hover:bg-forest-800 transition-all duration-150 shadow-lg shadow-forest-900/20">
            {t('hero.ctaPrimary')}
          </NextLink>
          <a href="#how-it-works" className="bg-white border border-warm-200 text-forest-800 px-8 py-4 rounded-xl font-display font-semibold text-lg hover:bg-warm-100 transition-all duration-150">
            {t('hero.ctaSecondary')}
          </a>
        </div>
      </section>

      {/* Pain Points */}
      <section className="bg-white border-y border-warm-200">
        <div className="max-w-6xl mx-auto px-8 py-20">
          <h2 className="font-display font-bold text-4xl text-forest-900 text-center mb-4">{t('pain.heading')}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            {/* Spreadsheet chaos */}
            <div className="p-6 rounded-2xl bg-warm-50 border border-warm-200">
              <div className="w-12 h-12 bg-warm-200 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-forest-700">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125" />
                </svg>
              </div>
              <h3 className="font-display font-bold text-lg text-forest-900 mb-2">{t('pain.spreadsheet.title')}</h3>
              <p className="text-forest-600 text-sm leading-relaxed">{t('pain.spreadsheet.body')}</p>
            </div>
            {/* Chasing payments */}
            <div className="p-6 rounded-2xl bg-warm-50 border border-warm-200">
              <div className="w-12 h-12 bg-warm-200 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-forest-700">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                </svg>
              </div>
              <h3 className="font-display font-bold text-lg text-forest-900 mb-2">{t('pain.chasing.title')}</h3>
              <p className="text-forest-600 text-sm leading-relaxed">{t('pain.chasing.body')}</p>
            </div>
            {/* Sharing door codes */}
            <div className="p-6 rounded-2xl bg-warm-50 border border-warm-200">
              <div className="w-12 h-12 bg-warm-200 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-forest-700">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
                </svg>
              </div>
              <h3 className="font-display font-bold text-lg text-forest-900 mb-2">{t('pain.codes.title')}</h3>
              <p className="text-forest-600 text-sm leading-relaxed">{t('pain.codes.body')}</p>
            </div>
            {/* No overview */}
            <div className="p-6 rounded-2xl bg-warm-50 border border-warm-200">
              <div className="w-12 h-12 bg-warm-200 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-forest-700">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              </div>
              <h3 className="font-display font-bold text-lg text-forest-900 mb-2">{t('pain.nooverview.title')}</h3>
              <p className="text-forest-600 text-sm leading-relaxed">{t('pain.nooverview.body')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-8 py-20">
        <h2 className="font-display font-bold text-4xl text-forest-900 text-center mb-4">{t('features.heading')}</h2>
        <p className="text-forest-600 text-center mb-12 text-lg">{t('features.subheading')}</p>
        <div className="space-y-8">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl bg-warm-100 border border-warm-200">
              <span className="inline-block text-xs font-bold uppercase tracking-wider text-warm-300 mb-3">{t('features.before')}</span>
              <h3 className="font-display font-bold text-xl text-forest-900 mb-2">{t('features.signup.title')}</h3>
              <p className="text-forest-500 line-through decoration-warm-300">{t('features.signup.before')}</p>
            </div>
            <div className="p-6 rounded-2xl bg-forest-50 border border-forest-200">
              <span className="inline-block text-xs font-bold uppercase tracking-wider text-sage-dark mb-3">{t('features.after')}</span>
              <h3 className="font-display font-bold text-xl text-forest-900 mb-2">{t('features.signup.title')}</h3>
              <p className="text-forest-700">{t('features.signup.after')}</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl bg-warm-100 border border-warm-200">
              <span className="inline-block text-xs font-bold uppercase tracking-wider text-warm-300 mb-3">{t('features.before')}</span>
              <h3 className="font-display font-bold text-xl text-forest-900 mb-2">{t('features.payments.title')}</h3>
              <p className="text-forest-500 line-through decoration-warm-300">{t('features.payments.before')}</p>
            </div>
            <div className="p-6 rounded-2xl bg-forest-50 border border-forest-200">
              <span className="inline-block text-xs font-bold uppercase tracking-wider text-sage-dark mb-3">{t('features.after')}</span>
              <h3 className="font-display font-bold text-xl text-forest-900 mb-2">{t('features.payments.title')}</h3>
              <p className="text-forest-700">{t('features.payments.after')}</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl bg-warm-100 border border-warm-200">
              <span className="inline-block text-xs font-bold uppercase tracking-wider text-warm-300 mb-3">{t('features.before')}</span>
              <h3 className="font-display font-bold text-xl text-forest-900 mb-2">{t('features.access.title')}</h3>
              <p className="text-forest-500 line-through decoration-warm-300">{t('features.access.before')}</p>
            </div>
            <div className="p-6 rounded-2xl bg-forest-50 border border-forest-200">
              <span className="inline-block text-xs font-bold uppercase tracking-wider text-sage-dark mb-3">{t('features.after')}</span>
              <h3 className="font-display font-bold text-xl text-forest-900 mb-2">{t('features.access.title')}</h3>
              <p className="text-forest-700">{t('features.access.after')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-white border-y border-warm-200">
        <div className="max-w-6xl mx-auto px-8 py-20">
          <h2 className="font-display font-bold text-4xl text-forest-900 text-center mb-4">{t('howItWorks.heading')}</h2>
          <p className="text-forest-600 text-center mb-16 text-lg">{t('howItWorks.subheading')}</p>
          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <div className="font-display font-extrabold text-6xl text-warm-200 mb-3 leading-none">01</div>
              <h3 className="font-display font-bold text-xl text-forest-900 mb-2">{t('howItWorks.step1.title')}</h3>
              <p className="text-forest-600 text-sm leading-relaxed">{t('howItWorks.step1.body')}</p>
            </div>
            <div>
              <div className="font-display font-extrabold text-6xl text-warm-200 mb-3 leading-none">02</div>
              <h3 className="font-display font-bold text-xl text-forest-900 mb-2">{t('howItWorks.step2.title')}</h3>
              <p className="text-forest-600 text-sm leading-relaxed">{t('howItWorks.step2.body')}</p>
            </div>
            <div>
              <div className="font-display font-extrabold text-6xl text-warm-200 mb-3 leading-none">03</div>
              <h3 className="font-display font-bold text-xl text-forest-900 mb-2">{t('howItWorks.step3.title')}</h3>
              <p className="text-forest-600 text-sm leading-relaxed">{t('howItWorks.step3.body')}</p>
            </div>
            <div>
              <div className="font-display font-extrabold text-6xl text-warm-200 mb-3 leading-none">04</div>
              <h3 className="font-display font-bold text-xl text-forest-900 mb-2">{t('howItWorks.step4.title')}</h3>
              <p className="text-forest-600 text-sm leading-relaxed">{t('howItWorks.step4.body')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-6xl mx-auto px-8 py-20">
        <h2 className="font-display font-bold text-4xl text-forest-900 text-center mb-4">{t('pricing.heading')}</h2>
        <p className="text-forest-600 text-center mb-12 text-lg">{t('pricing.subheading')}</p>
        <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Starter */}
          <div className="bg-white border border-warm-200 rounded-3xl p-8">
            <div className="text-xs font-bold uppercase tracking-widest text-forest-500 mb-3">{t('pricing.starter.name')}</div>
            <div className="mb-1"><span className="font-display font-extrabold text-5xl text-forest-900">{t('pricing.starter.price')}</span></div>
            <p className="text-forest-500 text-sm mb-6">{t('pricing.starter.fee')}</p>
            <ul className="space-y-2.5 text-left mb-8">
              {starterFeatures.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-sage flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  <span className="text-forest-700 text-sm">{item}</span>
                </li>
              ))}
            </ul>
            <NextLink href="/admin/register" className="block w-full bg-forest-900 text-white py-3 rounded-xl font-display font-semibold text-base hover:bg-forest-800 transition-all duration-150 text-center">{t('pricing.starter.cta')}</NextLink>
          </div>
          {/* Pro */}
          <div className="bg-forest-900 border border-forest-700 rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute top-4 right-4"><span className="bg-sage text-forest-900 text-xs font-bold px-2.5 py-1 rounded-full">{t('pricing.saveOnFees')}</span></div>
            <div className="text-xs font-bold uppercase tracking-widest text-forest-400 mb-3">{t('pricing.pro.name')}</div>
            <div className="mb-1"><span className="font-display font-extrabold text-5xl text-white">{t('pricing.pro.price')}</span><span className="text-forest-400 text-lg">{t('pricing.pro.interval')}</span></div>
            <p className="text-forest-400 text-sm mb-6">{t('pricing.pro.fee')}</p>
            <ul className="space-y-2.5 text-left mb-8">
              {proFeatures.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-sage flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  <span className="text-forest-200 text-sm">{item}</span>
                </li>
              ))}
            </ul>
            <NextLink href="/admin/register" className="block w-full bg-sage text-forest-900 py-3 rounded-xl font-display font-semibold text-base hover:bg-sage/90 transition-all duration-150 text-center">{t('pricing.pro.cta')}</NextLink>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white border-y border-warm-200">
        <div className="max-w-3xl mx-auto px-8 py-20">
          <h2 className="font-display font-bold text-4xl text-forest-900 text-center mb-12">{t('faq.heading')}</h2>
          <div>
            <FaqItem question={t('faq.q1')} answer={t('faq.a1')} />
            <FaqItem question={t('faq.q2')} answer={t('faq.a2')} />
            <FaqItem question={t('faq.q3')} answer={t('faq.a3')} />
            <FaqItem question={t('faq.q4')} answer={t('faq.a4')} />
            <FaqItem question={t('faq.q5')} answer={t('faq.a5')} />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-forest-900 mx-8 mb-8 rounded-3xl">
        <div className="max-w-4xl mx-auto px-8 py-16 text-center">
          <h2 className="font-display font-extrabold text-4xl lg:text-5xl text-white mb-4">{t('cta.heading1')}<br />{t('cta.heading2')}</h2>
          <p className="text-forest-200 text-xl mb-10">{t('cta.body')}</p>
          <NextLink href="/admin/register" className="inline-block bg-sage text-forest-900 px-10 py-4 rounded-xl font-display font-bold text-lg hover:bg-sage-light transition-all duration-150 shadow-lg">{t('cta.button')}</NextLink>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-warm-200 bg-white">
        <div className="max-w-6xl mx-auto px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size={24} />
            <span className="text-warm-300">·</span>
            <span className="text-sm text-forest-600">{t('footer.tagline')}</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-forest-600">
            <NextLink href="/admin/register" className="hover:text-forest-900 transition-colors">{t('footer.register')}</NextLink>
            <NextLink href="/admin/login" className="hover:text-forest-900 transition-colors">{t('footer.signIn')}</NextLink>
            <a href="mailto:support@gymaccess.app" className="hover:text-forest-900 transition-colors">{t('footer.support')}</a>
          </nav>
          <p className="text-xs text-gray-400">{t('footer.copyright', { year: new Date().getFullYear() })}</p>
        </div>
      </footer>
    </div>
  );
}
