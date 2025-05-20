import Link from 'next/link';
import { FaLinkedin, FaInstagram, FaArrowUp } from 'react-icons/fa';

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer id="footer" className="relative bg-black text-white py-16 px-4 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/Denver_skyline.jpg"
          alt="Denver Skyline"
          className="w-full h-full object-cover opacity-40 brightness-90"
        />
        {/* Bottom-to-top fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
      </div>


      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto text-center space-y-6">
        <h2 className="text-2xl font-bold">VSR LLC</h2>
        <p className="text-gray-300 text-lg">Built for Every Season. Ready for Every Challenge.</p>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 flex-wrap">
          <Link href="/projects">
            <button className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg text-white font-medium transition">
              View Projects
            </button>
          </Link>
          <Link href="/quote">
            <button className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg text-white font-medium transition">
              Get a Quote
            </button>
          </Link>
          <Link href="/apply">
            <button className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg text-white font-medium transition">
              Apply Now
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
        <div className="flex justify-center gap-6 text-2xl text-gray-400">
          <a href="https://linkedin.com/company/vsrconstruction" target="_blank" rel="noopener noreferrer" className="hover:text-white">
            <FaLinkedin />
          </a>
          <a href="https://instagram.com/vsrconstruction" target="_blank" rel="noopener noreferrer" className="hover:text-white">
            <FaInstagram />
          </a>
        </div>

        {/* Back to Top */}
        <div>
          <button onClick={scrollToTop} className="mt-6 text-gray-400 hover:text-white transition">
            <FaArrowUp className="inline mr-2" />
            Back to Top
          </button>
        </div>

        <a
          href="mailto:m.kenner@outlook.com?subject=Web%20Development%20Inquiry"
          className="text-sm text-gray-400 hover:text-white block mt-2"
        >
          Web Development Contact
        </a>

        {/* Copyright */}
        <p className="text-xs text-gray-500 mt-4">
          © {new Date().getFullYear()} VSR LLC. All rights reserved.
        </p>
        <Link
          href="/privacy"
          className="text-sm text-gray-400 hover:text-white"
        >
          Privacy Policy
        </Link>


      </div>
    </footer>
  );
}
