import Image from 'next/image';

export default function Header() {
  return (
    <header className="w-full bg-black text-white shadow-md fixed top-0 left-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div>
          <a href="#home">
            <Image
              src="/VSR.png"
              alt="VSR Logo"
              width={140}
              height={50}
              priority
            />
          </a>
        </div>

        {/* Navigation */}
        <nav className="flex items-center space-x-6 text-base font-medium">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="px-4 py-2 rounded-md hover:bg-gray-800 transition"
          >
            Home
          </button>

          <button
            onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-4 py-2 rounded-md hover:bg-gray-800 transition"
          >
            About
          </button>

          

          {/* Services Dropdown */}
          <div className="relative group flex items-center">
            <button className="px-4 py-2 rounded-md hover:bg-gray-800 transition">
              Services
            </button>
            <div className="absolute right-0 mt-2 hidden group-hover:block bg-black bg-opacity-90 shadow-lg rounded-md border border-gray-700 z-50 min-w-[180px]">
              <ul className="py-2 text-sm text-white">
                <li
                  className="px-4 py-2 hover:bg-gray-800 cursor-pointer"
                  onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Snow Removal
                </li>
                <li className="px-4 py-2 hover:bg-gray-800 cursor-pointer">Landscaping</li>
                <li className="px-4 py-2 hover:bg-gray-800 cursor-pointer">Demolition</li>
                <li className="px-4 py-2 hover:bg-gray-800 cursor-pointer">Concrete & Asphalt</li>
              </ul>
            </div>
          </div>
          <button
            onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-4 py-2 rounded-md hover:bg-gray-800 transition"
          >
            Contact
          </button>
        </nav>
      </div>
    </header>
  );
}