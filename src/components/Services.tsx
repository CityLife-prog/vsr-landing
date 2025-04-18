// components/Services.tsx
export default function Services() {
    return (
      <section id="services" className="py-16 px-6 text-center bg-white">
        <h2 className="text-2xl font-bold mb-6">Our Services</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
          <div className="p-4 bg-gray-100 rounded shadow">❄️ Snow Removal</div>
          <div className="p-4 bg-gray-100 rounded shadow">🌿 Landscaping, Arboring & Hardscaping</div>
          <div className="p-4 bg-gray-100 rounded shadow">🧱 Concrete & Asphalt Repairs</div>
          <div className="p-4 bg-gray-100 rounded shadow">🏗️ Demolition</div>
          <div className="p-4 bg-gray-100 rounded shadow">🎨 Painting</div>
        </div>
      </section>
    );
  }
  