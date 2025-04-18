export default function Hero() {
  return (
    <section className="relative h-screen w-full bg-[url('/sidewalk_guy.png')] bg-cover bg-center flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50" />

      {/* Text */}
      <div className="relative z-10 text-white text-center px-4">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          Built for winter. Growing for everything after.
        </h1>
        <p className="text-lg max-w-xl mx-auto">
          Snow removal now. Full-service contracting next.
        </p>
      </div>
    </section>
  );
}
