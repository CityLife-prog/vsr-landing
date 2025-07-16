import Link from 'next/link';
import { featureFlags } from '@/lib/version';
import { FaLinkedin, FaInstagram, FaArrowUp, FaFacebookF, FaLinkedinIn } from 'react-icons/fa';
import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';

interface FooterProps {
  variant?: 'enhanced' | 'simple';
}

export default function Footer({ variant = 'enhanced' }: FooterProps) {
  const { t } = useTranslation();
  const socialIcons = variant === 'enhanced' ? [
    { name: 'Instagram', icon: <FaInstagram />, href: 'https://instagram.com' },
    { name: 'LinkedIn', icon: <FaLinkedin />, href: 'https://linkedin.com' },
  ] : [
    { name: 'Instagram', icon: <FaInstagram />, href: 'https://instagram.com' },
    { name: 'Facebook', icon: <FaFacebookF />, href: 'https://facebook.com' },
    { name: 'LinkedIn', icon: <FaLinkedinIn />, href: 'https://linkedin.com' },
  ];
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (variant === 'simple') {
    return (
      <footer className="bg-black text-white px-6 py-8 text-center">
        <div className="flex justify-center gap-6">
          {socialIcons.map((social) =>
            featureFlags.socialsEnabled ? (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white text-xl hover:text-blue-400 transition"
              >
                {social.icon}
              </a>
            ) : (
              <div
                key={social.name}
                className="relative group text-white text-xl cursor-not-allowed opacity-60"
              >
                {social.icon}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                  {t('footer.socials_not_available', 'Socials are not yet available.')}
                </div>
              </div>
            )
          )}
        </div>
        <p className="mt-4 text-sm text-gray-400">© 2025 VSR Construction. All rights reserved.</p>
      </footer>
    );
  }

  return (
    <footer id="footer" className="relative bg-black text-white py-16 px-4 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/Denver_skyline.jpg"
          alt="Denver Skyline"
          fill
          priority
          className="object-cover opacity-40 brightness-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
      </div>


      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto text-center space-y-6">
        <h2 className="text-2xl font-bold">VSR LLC</h2>
        <p className="text-gray-300 text-lg">
          {t('footer.tagline', 'Built for Every Season. Ready for Every Challenge.')}
        </p>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 flex-wrap">
          <Link href="/projects">
            <button className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg text-white font-medium transition">
              {t('footer.view_projects', 'View Projects')}
            </button>
          </Link>
          <Link href="/quote">
            <button className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg text-white font-medium transition">
              {t('footer.get_quote', 'Get a Quote')}
            </button>
          </Link>
          <Link href="/apply">
            <button className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg text-white font-medium transition">
              {t('footer.apply_now', 'Apply Now')}
            </button>
          </Link>
        </div>

        {/* Contact Info */}
        <div className="text-gray-300">
          <a href="mailto:marcus@vsrsnow.com" className="underline hover:text-blue-400 block">
            marcus@vsrsnow.com
          </a>
          <a href="tel:+17208385807" className="hover:text-blue-400 block">
            (720) 838-5807
          </a>
        </div>

        {/* Social Icons */}

        <div className="flex justify-center gap-6">
          {socialIcons.map((social) =>
            featureFlags.socialsEnabled ? (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white text-xl hover:text-blue-400 transition"
              >
                {social.icon}
              </a>
            ) : (
              <div
                key={social.name}
                className="relative group text-white text-xl cursor-not-allowed opacity-60"
              >
                {social.icon}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                  {t('footer.socials_coming_soon', 'Socials coming soon!')}
                </div>
              </div>
            )
          )}
        </div>

        {/* Back to Top */}
        <div>
          <button onClick={scrollToTop} className="mt-6 text-gray-400 hover:text-white transition">
            <FaArrowUp className="inline mr-2" />
            {t('footer.back_to_top', 'Back to Top')}
          </button>
        </div>

        <a
          href="mailto:citylife32@outlook.com?subject=Web%20Development%20Inquiry"
          className="text-sm text-gray-400 hover:text-white block mt-2"
        >
          {t('footer.web_development', 'Web Development Contact')}
        </a>

        {/* Copyright */}
        <p className="text-xs text-gray-500 mt-4">
          {t('footer.copyright', `© ${new Date().getFullYear()} VSR LLC. All rights reserved.`)}
        </p>
        
        {/* Legal Links */}
        <div className="flex justify-center gap-4 flex-wrap text-sm">
          <Link
            href="/privacy"
            className="text-gray-400 hover:text-white"
          >
            {t('footer.privacy_policy', 'Privacy Policy')}
          </Link>
          <Link
            href="/terms"
            className="text-gray-400 hover:text-white"
          >
            {t('footer.terms_conditions', 'Terms & Conditions')}
          </Link>
          <Link
            href="/accessibility"
            className="text-gray-400 hover:text-white"
          >
            {t('footer.accessibility', 'Accessibility Statement')}
          </Link>
        </div>


      </div>
    </footer>
  );
}
