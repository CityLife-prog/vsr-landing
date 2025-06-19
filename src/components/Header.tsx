import { useMobile } from '@/context/MobileContext'; // import from the context
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { FaBars, FaTimes } from 'react-icons/fa';

export default function Header() {
  const router = useRouter();
  const { isMobile } = useMobile(); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    setIsMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      const headerOffset = 60;
      const elementPosition = el.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    } else {
      router.push(`/#${id}`);
    }
  };

  return (
    <header className="w-full bg-black text-white shadow-md fixed top-0 left-0 z-50 h-12">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <div>
          <Link href="/" className="flex items-center">
            <Image
              src="/VSRv2.png"
              alt="VSR Logo"
              width={100}
              height={24}
              priority
            />
          </Link>
        </div>

        {!isMobile && (
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <button onClick={() => scrollTo('featured')} className="hover:text-blue-400">Projects</button>
            <button onClick={() => scrollTo('about')} className="hover:text-blue-400">About</button>
            <button onClick={() => scrollTo('services')} className="hover:text-blue-400">Services</button>
            <button onClick={() => scrollTo('hiring')} className="hover:text-blue-400">Now Hiring</button>
            <button onClick={() => scrollTo('footer')} className="hover:text-blue-400">Contact</button>
          </nav>
        )}

        {isMobile && (
          <div className="md:hidden relative">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="focus:outline-none">
              {isMenuOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
            </button>
            {isMenuOpen && (
              <div className="absolute top-10 right-0 bg-black text-white py-2 px-4 rounded shadow-lg z-50 space-y-2 text-sm">
                <button onClick={() => scrollTo('featured')} className="block w-full text-left hover:text-blue-400">Projects</button>
                <button onClick={() => scrollTo('about')} className="block w-full text-left hover:text-blue-400">About</button>
                <button onClick={() => scrollTo('services')} className="block w-full text-left hover:text-blue-400">Services</button>
                <button onClick={() => scrollTo('hiring')} className="block w-full text-left hover:text-blue-400">Now Hiring</button>
                <button onClick={() => scrollTo('footer')} className="block w-full text-left hover:text-blue-400">Contact</button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
