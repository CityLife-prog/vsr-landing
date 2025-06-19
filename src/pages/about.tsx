import Link from 'next/link';

export default function AboutSection() {
  return (
    <section className="bg-gray-900 text-white px-6 py-16">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl font-bold mb-6">About Us</h2>
        <p className="text-xl font-medium mb-6">
          Built for Every Season. Ready for Every Challenge.
        </p>
        <p className="mb-4">
          Founded in 2021 by two determined entrepreneurs, Marcus and Zach, VSR LLC began with a clear mission: to deliver reliable, high-quality property maintenance services that clients can count on year-round.
        </p>
        <p className="mb-4">
          What started as a snow and ice removal service for commercial properties has rapidly grown into a full-service contracting firm. Today, VSR LLC offers a broad range of services including Landscaping, Hardscaping, Demolition, Concrete Work, Asphalt Patching, and Repairs—all delivered with the same professionalism and reliability that fueled our start.
        </p>
        <p className="mb-4">
          At VSR, we&apos;re more than a service provider—we're a trusted partner dedicated to preserving and enhancing the value, safety, and appearance of your property in every season. Whether it’s clearing snow in winter or revitalizing your landscape in summer, we’re ready to meet any challenge.
        </p>
        <p className="text-center font-semibold mt-6 text-lg italic">
          Dependable. Professional. All-Season Ready.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-10">
          <Link href="/projects">
            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-lg transition">
              View Our Projects
            </button>
          </Link>
          <Link href="/quote">
            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-lg transition">
              Get a Quote
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}
