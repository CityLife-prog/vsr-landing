import Image from 'next/image';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="w-full px-6 py-4 bg-gray-100 shadow-md">
      <div className="max-w-screen-xl mx-auto flex justify-between items-center">
        {/* Logo on the left */}
        <div className="flex items-center">
          <Image src="/logo.png" alt="Logo" width={120} height={40} />
        </div>

        {/* Nav on the right */}
        <nav className="flex space-x-10 text-sm font-semibold text-gray-800">
          <Link href="#home" className="hover:text-blue-600">Home</Link>
          <Link href="#about" className="hover:text-blue-600">About</Link>
          <Link href="#services" className="hover:text-blue-600">Services</Link>
          <Link href="#contact" className="hover:text-blue-600">Contact</Link>
        </nav>
      </div>
    </header>
  );
}
