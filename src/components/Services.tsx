export default function Services() {
  return (
    <section
      id="services"
      className="relative min-h-screen w-full flex items-center justify-center bg-cover bg-center text-white"
      style={{ backgroundImage: "url('/services.jpg')" }}
    >
      {/* Overlay for contrast */}
      <div className="absolute inset-0 bg-black bg-opacity-60 z-0" />

      {/* Centered Text Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl">
        <h2 className="text-3xl font-bold mb-6">Our Services</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white/10 p-4 rounded shadow">❄️ Snow Removal</div>
          <div className="bg-white/10 p-4 rounded shadow">🌿 Landscaping, Arboring & Hardscaping</div>
          <div className="bg-white/10 p-4 rounded shadow">🧱 Concrete & Asphalt Repairs</div>
          <div className="bg-white/10 p-4 rounded shadow">🏗️ Demolition</div>
          <div className="bg-white/10 p-4 rounded shadow">🎨 Painting</div>
        </div>
      </div>
    </section>
  );
}
