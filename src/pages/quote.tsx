import Head from 'next/head';
import { useEffect, useState } from 'react';


export default function QuotePage() {

  
  const [showBubble, setShowBubble] = useState(false);
    useEffect(() => {
      const timeout = setTimeout(() => {
        setShowBubble(true);
      }, 100);
      return () => clearTimeout(timeout);
    }, []);

  return (
    <>
      <Head>
        <title>Request a Quote | VSR Construction</title>
      </Head>

      <section
        className="relative min-h-screen bg-cover bg-center text-white"
        style={{ backgroundImage: "url('/contact_photo.png')" }}
      >
        {/* Fullscreen overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-60 z-0" />

        {/* Content on top of overlay */}
        <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-3xl mt-16">
            {/* Move the heading down */}
            <h1 className="text-4xl font-bold text-center mb-6">Request a Quote</h1>

            {/* Chat bubble */}
            <div className="flex mb-12">
            <div
  className={`relative bg-white text-gray-800 px-6 py-5 rounded-xl shadow-lg w-80 ml-auto transition-opacity duration-1000 ease-in-out ${
    showBubble ? 'opacity-100' : 'opacity-0'
  }`}
>

                <p className="text-sm sm:text-base leading-relaxed">
                  Let us know what services you need and we&apos;ll get back to you with a custom quote.<br />
                  
                </p>
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-white"></div>
              </div>
            </div>


            <form className="space-y-6 bg-gray-800 bg-opacity-90 p-6 rounded-lg shadow-md">
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
        </div>
      </section>
    </>
  );
}
