import Link from 'next/link';

export default function NowHiring() {
    return (
      <section id="hiring" className="min-h-screen bg-gray-900 text-white flex items-center justify-center px-6 py-24">
        <div className="text-center max-w-2xl">
          <h2 className="text-4xl font-bold mb-6">We&apos;re Hiring!</h2>
          <p className="text-lg">
            Join the VSR team this season. We&apos;re looking for snow removal pros, drivers, and general crew members.
          </p>
          <Link href="/apply" passHref
            className="mt-6 inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition"

          >
            Apply Today
          </Link>
        </div>
      </section>
    );
  }
  