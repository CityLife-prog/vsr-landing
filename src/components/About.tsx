// src/components/About.tsx
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';

export default function About() {
  const { t } = useTranslation();

  return (
    <section
      id="about"
      className="relative min-h-screen flex items-center justify-center bg-cover bg-center text-white scroll-mt-12"
      style={{ backgroundImage: "url('/about.jpg')" }}
    >
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-black/60 z-0" />

      {/* Content */}
      <div className="relative z-10 max-w-2xl text-center px-4">
        <h2 className="text-4xl font-bold mb-6">
          {t('common.about', 'About Us')}
        </h2>
        <p className="text-lg text-gray-200">
          {t('about.description', 'Established in 2021, VSR LLC was founded with one goal: to deliver dependable, high-quality property maintenance all year round. From commercial snow removal to full-scale landscaping, hardscaping, demolition, and concrete work — we\'re the team businesses trust to show up, do it right, and treat every job like it\'s our own.')}
        </p>
        <Link href="/about">
          <button className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold">
            {t('about.learn_more', 'More About Us')}
          </button>
        </Link>
      </div>
    </section>
  );
}