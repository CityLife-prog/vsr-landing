import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';

export default function Featured() {
  const { t } = useTranslation();

  return (
    <section
      id="featured"
      className="relative h-screen w-full flex items-center justify-center bg-cover bg-center text-white"
      style={{ backgroundImage: "url('/featured_project.png')" }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50 z-0" />

      {/* Text Content */}
      <div className="relative z-10 text-center px-4 max-w-2xl">
        <h2 className="text-4xl md:text-5xl font-bold mb-4">
          {t('projects.featured_title', 'Featured Project')}
        </h2>
        <p className="text-lg">
          {t('projects.featured_description', 'Check out our latest commercial snow removal client in Aurora Colorado.')}
        </p>
        <Link href="/projects" passHref
          className="mt-6 inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition"
        >
          {t('projects.view_all', 'View All Projects')}
        </Link>
      </div>
    </section>
  );
}
  