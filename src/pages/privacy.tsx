import Head from 'next/head';

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy | VSR Construction</title>
      </Head>

      <section className="min-h-screen bg-gray-900 text-white py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>

          <p className="mb-4 text-sm text-gray-300">Effective Date: May 9, 2025</p>

          <p className="mb-6">
            VSR LLC values your privacy. This Privacy Policy outlines how we collect,
            use, and protect your personal information when you visit our website or interact with our services.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-2">1. Information We Collect</h2>
          <ul className="list-disc pl-6 mb-6 text-gray-300">
            <li>Contact Information: Name, email address, phone number (via quote and apply forms).</li>
            <li>Employment Information: Resume uploads, experience summaries (via job applications).</li>
            <li>Technical Data: IP address, browser type, device information, and usage patterns (via analytics tools).</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-2">2. How We Use Your Information</h2>
          <ul className="list-disc pl-6 mb-6 text-gray-300">
            <li>To contact you regarding your quote request or job application.</li>
            <li>To evaluate candidates for employment opportunities.</li>
            <li>To improve our services and website functionality.</li>
            <li>To respond to your inquiries or feedback.</li>
            <li>We do <strong>not</strong> sell or share your personal data with third parties for marketing purposes.</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-2">3. Data Retention</h2>
          <p className="mb-6">
            We retain personal information only as long as necessary to fulfill the purpose it was collected for,
            including legal or operational requirements.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-2">4. Security</h2>
          <p className="mb-6">
            We implement reasonable safeguards to protect your personal information, including encryption for file
            uploads and secure server communication. However, no system is 100% secure.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-2">5. Third-Party Services</h2>
          <p className="mb-6">
            Our website may contain embedded content (e.g., Google Maps, weather widgets) that may collect user data
            according to their respective privacy policies. We recommend reviewing their policies separately.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-2">6. Your Rights</h2>
          <p className="mb-6">
            You may request access to, update, or deletion of your personal information by contacting us directly.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-2">7. Contact Us</h2>
          <p>
            VSR LLC<br />
            Email: <a href="mailto:marcus@vsrsnow.com" className="underline text-blue-400">marcus@vsrsnow.com</a><br />
            Phone: (720) 838-5807
          </p>
        </div>
      </section>
    </>
  );
}