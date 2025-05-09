import Link from 'next/link';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 shadow-md py-4 px-6 flex justify-between items-center">
        <div className="text-xl font-bold">VSR</div>
        <nav className="space-x-4">
          <Link href="/" className="hover:text-blue-400">Home</Link>
          <Link href="/projects" className="hover:text-blue-400">Projects</Link>
          <Link href="/about" className="hover:text-blue-400">About</Link>
          <Link href="/services" className="hover:text-blue-400">Services</Link>
          <Link href="/apply" className="hover:text-blue-400">Now Hiring</Link>
        </nav>
      </header>
      <main className="px-4 py-8">{children}</main>
    </div>
  );
}
