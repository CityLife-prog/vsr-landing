import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useMobile } from '@/context/MobileContext';

export default function QuotePage() {
  const { isMobile } = useMobile();
  const [showBubble, setShowBubble] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowBubble(true);
    }, 100);
    return () => clearTimeout(timeout);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (!e.target.files) return;
  setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
  e.target.value = ''; // Allow re-selecting the same files
};

  return (
    <>
      <Head>
        <title>Request a Quote | VSR Construction</title>
      </Head>

      <section
        className="relative min-h-screen bg-cover bg-center text-white"
        style={{
          backgroundImage: `url('${
            isMobile ? '/contact_photo2.png' : '/contact_photo.png'
          }')`,
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-60 z-0" />

        <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-3xl mt-16">
            <h1 className="text-4xl font-bold text-center mb-6">Request a Quote</h1>

            {/* Chat Bubble */}
            <div className="mb-20 flex justify-end sm:justify-center">
              <div
                className={`relative bg-white text-gray-800 px-6 py-5 rounded-xl shadow-lg w-80 transition-opacity duration-1000 ease-in-out ${
                  showBubble ? 'opacity-100' : 'opacity-0'
                } ${isMobile ? 'mx-auto' : 'ml-auto'} ${isMobile ? 'pb-8' : ''}`}
              >
                <p className="text-sm sm:text-base leading-relaxed">
                  Let us know what services you need and we&apos;ll get back to you with a custom quote.
                </p>

                {!isMobile ? (
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-white"></div>
                ) : (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white"></div>
                )}
              </div>
            </div>

            {/* FORM */}
            <form
              method="POST"
              action="/api/quote"
              encType="multipart/form-data"
              className="space-y-6 bg-gray-800 bg-opacity-90 p-6 rounded-lg shadow-md"
            >
              <div>
                <label className="block mb-2 text-sm font-medium">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  placeholder="John Doe"
                  className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Email Address</label>
                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="(123) 456-7890"
                  className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Service Requested</label>
                <select
                  name="service"
                  className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
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
                  name="details"
                  rows={4}
                  placeholder="Describe your project..."
                  className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              {/* PHOTO UPLOAD */}
              <div>
                <label className="block mb-2 text-sm font-medium">Upload Files or Photos (optional)</label>

                <input
                  id="photoInput"
                  name="photos"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault(); 
                    document.getElementById('photoInput')?.click();
                  }}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white text-sm"
                >
                  Upload Files
                </button>

                {selectedFiles.length > 0 && (
                  <div className="mt-4 bg-gray-700 p-4 rounded">
                    <h3 className="text-white text-sm font-medium mb-2">Files Added:</h3>
                    <ul className="list-disc list-inside text-sm text-white space-y-1">
                      {selectedFiles.map((file, idx) => (
                        <li key={idx}>
                          {file.name}{' '}
                          <span className="text-gray-400 text-xs">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
