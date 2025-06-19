import { featureFlags } from '@/lib/version';
import { FaInstagram, FaFacebookF, FaLinkedinIn } from 'react-icons/fa';

export default function Footer() {
  const socialIcons = [
    { name: 'Instagram', icon: <FaInstagram />, href: 'https://instagram.com' },
    { name: 'Facebook', icon: <FaFacebookF />, href: 'https://facebook.com' },
    { name: 'LinkedIn', icon: <FaLinkedinIn />, href: 'https://linkedin.com' },
  ];

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
                Socials are not yet available.
              </div>
            </div>
          )
        )}
      </div>
      <p className="mt-4 text-sm text-gray-400">© 2025 VSR Construction. All rights reserved.</p>
    </footer>
  );
}
