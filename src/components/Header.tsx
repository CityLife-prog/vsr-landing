import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';


export default function Header() {
  const router = useRouter();

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const headerOffset = 60; // matches scroll-mt-16
      const elementPosition = el.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - headerOffset;
  
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    } else {
      router.push(`/#${id}`);
    }
  };
  
  return (
    <header className="w-full bg-black text-white shadow-md fixed top-0 left-0 z-50 h-12">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
      {/* Logo */}
        <div>
          <Link href="/" className = "flex items-center">
            <Image
              src="/VSR.png"
              alt="VSR Logo"
              width={60}
              height={24}
              priority
            />
          </Link>
        </div>

        {/* Navigation */}
        {/* Full Navigation (Desktop Only) */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          <button onClick={() => scrollTo('featured')} className="hover:text-blue-400">Projects</button>
          <button onClick={() => scrollTo('about')} className="hover:text-blue-400">About</button>
          <button onClick={() => scrollTo('services')} className="hover:text-blue-400">Services</button>
          <button onClick={() => scrollTo('hiring')} className="hover:text-blue-400">Now Hiring</button>
          <button onClick={() => scrollTo('footer')} className="hover:text-blue-400">Contact</button>

        </nav>

        {/* Mobile Navigation: Only show Contact and Hiring */}
        <nav className="flex md:hidden items-center space-x-4 text-sm font-medium">
          <button onClick={() => scrollTo('hiring')} className="hover:text-blue-400">Now Hiring</button>
          <button onClick={() => scrollTo('footer')} className="hover:text-blue-400">Contact</button>
        </nav>
      </div>
    </header>
  );
}