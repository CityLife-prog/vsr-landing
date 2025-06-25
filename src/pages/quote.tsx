import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useMobile } from '@/context/MobileContext';

// DO NOT import nodemailer here! Remove any line like:
// import nodemailer from 'nodemailer';
// import * as nodemailer from 'nodemailer';

export default function QuotePage() {
  const { isMobile } = useMobile();
  const [showBubble, setShowBubble] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [phone, setPhone] = useState('');
  

  function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '').substring(0, 10);
  const parts = [];

  if (digits.length > 0) parts.push('(' + digits.substring(0, 3));
  if (digits.length >= 4) parts.push(') ' + digits.substring(3, 6));
  if (digits.length >= 7) parts.push('-' + digits.substring(6, 10));

  return parts.join('');
}

  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowBubble(true);
    }, 100);
    return () => clearTimeout(timeout);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const newFiles = Array.from(e.target.files);
    console.log('Files selected:', newFiles.length);
    
    // Filter out files that are too large or invalid
    const validFiles = newFiles.filter(file => {
      if (file.size === 0) {
        console.log('Skipping empty file:', file.name);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        console.log('File too large:', file.name);
        alert(`File ${file.name} is too large. Please select files under 10MB.`);
        return false;
      }
      console.log('Valid file:', file.name, file.size, 'bytes');
      return true;
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    e.target.value = ''; // Reset input
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Add files to FormData
    console.log('Adding files to form:', selectedFiles.length);
    selectedFiles.forEach((file, index) => {
      console.log(`File ${index}: ${file.name} (${file.size} bytes)`);
      formData.append('photos', file);
    });

    try {
      console.log('Submitting form...');
      const res = await fetch('/api/quote', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      console.log('Response:', result);

      if (result.success) {
        setStatusMessage('Quote submitted successfully!');
        setTimeout(() => setStatusMessage(''), 5000);
        form.reset();
        setSelectedFiles([]);
        setPhone('');
        //alert('Quote submitted successfully.')
      } else {
        setStatusMessage(`Submission failed: ${result.error}`);
        setTimeout(() => setStatusMessage(''), 5000);

      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Network error. Please try again.');
    }
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

            {statusMessage && (
              <div className="mb-4 p-3 rounded bg-yellow-700 text-white text-sm text-center">
                {statusMessage}
              </div>
            )}
            <form
              onSubmit={handleSubmit}
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
                  required
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Email Address</label>
                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                  placeholder="(123) 456-7890"
                  className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
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
                  required
                ></textarea>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Upload Files or Photos (optional)</label>

                <input
                  type="file"
                  id="photoInput"
                  name="photos"
                  //accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      document.getElementById('photoInput')?.click();
                    }}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white text-sm transition-colors"
                  >
                    {selectedFiles.length > 0 ? 'Add More Files' : 'Choose Files'}
                  </button>
                  
                  {selectedFiles.length > 0 && (
                    <span className="text-sm text-gray-300">
                      {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                    </span>
                  )}
                </div>

                {selectedFiles.length > 0 && (
                  <div className="mt-4 bg-gray-700 p-4 rounded space-y-2">
                    <div className="flex justify-between items-center">
                      <h3 className="text-white text-sm font-medium">Selected Files:</h3>
                      <button
                        type="button"
                        onClick={() => setSelectedFiles([])}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        Clear All
                      </button>
                    </div>
                    
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-600 p-2 rounded">
                        <div>
                          <p className="text-white text-sm">{file.name}</p>
                          <p className="text-gray-300 text-xs">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="text-red-400 hover:text-red-300 text-xs ml-2"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
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