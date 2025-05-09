import Head from 'next/head';

export default function QuotePage() {
  return (
    <>
      <Head>
        <title>Request a Quote | VSR Construction</title>
      </Head>

      <section className="min-h-screen bg-gray-900 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-6">Request a Quote</h1>
          <p className="text-center text-gray-300 mb-12">
            Let us know what service you need and we'll get back to you with a custom quote.
          </p>

          <form className="space-y-6 bg-gray-800 p-6 rounded-lg shadow-md">
            <div>
              <label className="block mb-2 text-sm font-medium">Full Name</label>
              <input
                type="text"
                className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">Email Address</label>
              <input
                type="email"
                className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">Phone Number</label>
              <input
                type="tel"
                className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="(123) 456-7890"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">Service Requested</label>
              <select className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Snow Removal</option>
                <option>Landscaping / Hardscaping</option>
                <option>Concrete / Asphalt Repairs</option>
                <option>Demolition</option>
                <option>Painting</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">Additional Details</label>
              <textarea
                rows={4}
                className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your project..."
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-lg font-semibold transition"
            >
              Submit Request
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
