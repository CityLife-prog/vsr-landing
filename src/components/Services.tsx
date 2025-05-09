import Link from 'next/link';

export default function Services() {
  return (
    <section
      id="services"
      className="relative min-h-screen w-full flex items-center justify-center bg-cover bg-center text-white"
      style={{ backgroundImage: "url('/services.jpg')" }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-60 z-0" />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-6xl w-full">
        <h2 className="text-3xl font-bold mb-6">Our Services</h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white/10 p-4 rounded shadow">Snow & Ice Removal</div>
          <div className="bg-white/10 p-4 rounded shadow">Landscaping, Arboring & Hardscaping</div>
          <div className="bg-white/10 p-4 rounded shadow">Concrete & Asphalt Repairs</div>
          <div className="bg-white/10 p-4 rounded shadow">Demolition</div>
          <div className="bg-white/10 p-4 rounded shadow">Painting</div>

          {/* "Get a Quote" button styled like the others */}
          <Link href="/quote">
            <div className="bg-blue-600 hover:bg-blue-700 p-4 rounded shadow cursor-pointer transition font-medium">
              Get a Quote
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
