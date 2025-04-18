export default function Hero() {
  return (
    <section
      className="relative h-screen w-full flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/dump_truck.jpg')" }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50 z-0" />

      {/* Text content */}
      <div className="relative z-10 px-4 text-center">
        <h1 className="text-white text-4xl md:text-6xl font-bold mb-4">
          Built for winter. Growing for everything after.
        </h1>
        <p className="text-white text-lg max-w-xl mx-auto">
          Snow removal now. Full-service contracting next.
        </p>
      </div>
    </section>
  );
}
