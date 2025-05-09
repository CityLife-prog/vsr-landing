import Link from 'next/link';

export default function Hero() {
  return (
    <section
  className="relative h-screen bg-cover bg-center flex items-center justify-center text-white"
  style={{ backgroundImage: "url('/dump_truck.jpg')" }}
>
  {/* Dark Overlay */}
  <div className="absolute inset-0 bg-black/60 z-0" />

  {/* Text Content */}
  <div className="relative z-10 text-center max-w-4xl px-4">
    <h1 className="text-4xl font-bold mb-4">Built for Every Season. Trusted in Every Service.</h1>
    <p className="text-lg text-gray-200">
      From snow removal to full-scale contracting, VSR Construction is ready year-round.
    </p>
    <Link href="/quote">
      <button className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold">
        Get a Quote
      </button>
    </Link>
  </div>
</section>

  );
}
