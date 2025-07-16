import Head from 'next/head';
import Link from 'next/link';
import { FaArrowLeft, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

export default function AccessibilityStatement() {
  return (
    <>
      <Head>
        <title>Accessibility Statement | VSR Construction</title>
        <meta name="description" content="VSR Construction's commitment to web accessibility and inclusive design" />
        <meta name="robots" content="index, follow" />
      </Head>

      <section className="min-h-screen bg-gray-900 text-white py-16 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Header with Navigation */}
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 text-blue-400 hover:text-blue-300 mb-6"
            >
              <FaArrowLeft />
              <span>Back to VSR Landing Page</span>
            </Link>
            <h1 className="text-4xl font-bold">Accessibility Statement</h1>
          </div>
          <p className="mb-4 text-sm text-gray-300">Last updated: {new Date().toLocaleDateString()}</p>

          <h2 className="text-2xl font-semibold mt-8 mb-2">Our Commitment to Accessibility</h2>
          <p className="mb-6">
            VSR Construction LLC is committed to ensuring digital accessibility for people with disabilities. 
            We are continually improving the user experience for everyone and applying the relevant accessibility standards.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-2">Conformance Status</h2>
          <p className="mb-6">
            The Web Content Accessibility Guidelines (WCAG) defines requirements for designers and developers 
            to improve accessibility for people with disabilities. It defines three levels of conformance: 
            Level A, Level AA, and Level AAA.
          </p>
          <p className="mb-6">
            This website is partially conformant with WCAG 2.1 Level AA. 
            "Partially conformant" means that some parts of the content do not fully conform to the accessibility standard.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-2">Accessibility Features</h2>
          <p className="mb-6">
            We have implemented the following accessibility features:
          </p>
          <ul className="list-disc pl-6 mb-6 text-gray-300">
            <li>Semantic HTML markup for screen readers</li>
            <li>Keyboard navigation support</li>
            <li>Alternative text for images</li>
            <li>Sufficient color contrast ratios</li>
            <li>Readable fonts and appropriate text sizing</li>
            <li>Focus indicators for interactive elements</li>
            <li>Descriptive link text</li>
            <li>Form labels and error messages</li>
            <li>Multi-language support with Spanish translation capabilities</li>
            <li>Language detection and switching functionality</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-2">Language Accessibility</h2>
          <p className="mb-4 text-gray-300">
            VSR Construction is committed to serving our diverse community by providing language accessibility:
          </p>
          
          <h3 className="text-lg font-medium mt-4 mb-2 text-gray-300">Spanish Language Support:</h3>
          <ul className="list-disc pl-6 mb-4 text-gray-300">
            <li><strong>Automatic Translation:</strong> Our website automatically detects browser language preferences and can display content in Spanish</li>
            <li><strong>Manual Language Selection:</strong> Users can manually switch to Spanish using the "/es" URL path (e.g., vsrsnow.com/es)</li>
            <li><strong>Form Translations:</strong> Quote requests, job applications, and contact forms are available in Spanish</li>
            <li><strong>Navigation Elements:</strong> All menu items, buttons, and navigation elements are translated</li>
            <li><strong>Service Descriptions:</strong> Complete service information is provided in Spanish</li>
          </ul>

          <h3 className="text-lg font-medium mt-4 mb-2 text-gray-300">Translation Quality:</h3>
          <ul className="list-disc pl-6 mb-6 text-gray-300">
            <li>Professional translation services ensure accurate, culturally appropriate content</li>
            <li>Regular review and updates of translated materials</li>
            <li>Native Spanish speakers can submit feedback on translation quality</li>
            <li>Technical construction terms are properly localized for Spanish-speaking clients</li>
          </ul>

          <p className="mb-6 text-sm bg-gray-800 p-3 rounded">
            <strong>Language Support Contact:</strong> If you need assistance with language accessibility or have feedback on our Spanish translations, 
            please contact us at <a href="mailto:citylife32@outlook.com?subject=Language Accessibility" className="underline text-blue-400 hover:text-blue-300">citylife32@outlook.com</a>.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-2">Known Limitations</h2>
          <p className="mb-6">
            Despite our efforts, there may be some limitations. Below is a description of known limitations:
          </p>
          <ul className="list-disc pl-6 mb-6 text-gray-300">
            <li>Some embedded content may not be fully accessible</li>
            <li>Complex interactive elements may require additional testing</li>
            <li>PDF documents may not be fully accessible (we are working to improve this)</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-2">Assistive Technology Compatibility</h2>
          <p className="mb-6">
            This website is designed to be compatible with:
          </p>
          <ul className="list-disc pl-6 mb-6 text-gray-300">
            <li>Screen readers (NVDA, JAWS, VoiceOver)</li>
            <li>Voice recognition software</li>
            <li>Keyboard-only navigation</li>
            <li>Browser zoom up to 200%</li>
            <li>High contrast mode</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-2">Technical Specifications</h2>
          <p className="mb-6">
            Accessibility of this website relies on the following technologies:
          </p>
          <ul className="list-disc pl-6 mb-6 text-gray-300">
            <li>HTML5</li>
            <li>CSS3</li>
            <li>JavaScript (when used, includes fallbacks)</li>
            <li>WAI-ARIA (Web Accessibility Initiative – Accessible Rich Internet Applications)</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-2">Feedback and Contact Information</h2>
          <p className="mb-6">
            We welcome your feedback on the accessibility of this website. 
            Please let us know if you encounter accessibility barriers:
          </p>
          <p className="mb-8">
            <strong>CityLyfe LLC</strong><br />
            Email: <a href="mailto:citylife32@outlook.com" className="underline text-blue-400">citylife32@outlook.com</a><br />
            Phone: <a href="tel:+17205255659" className="underline text-blue-400">(720) 838-5807</a><br />
            Subject: Website Accessibility
          </p>
          <p className="mb-6">
            We try to respond to accessibility feedback within 5 business days.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-2">Alternative Communication Methods</h2>
          <p className="mb-6">
            If you have difficulty accessing information on this website, we offer alternative ways to get the information:
          </p>
          <ul className="list-disc pl-6 mb-6 text-gray-300">
            <li>Phone consultations for service information</li>
            <li>Email communication for quotes and inquiries</li>
            <li>In-person meetings when possible</li>
            <li>Large print materials upon request</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-2">Ongoing Improvements</h2>
          <p className="mb-6">
            We are committed to continuously improving accessibility. Our ongoing efforts include:
          </p>
          <ul className="list-disc pl-6 mb-6 text-gray-300">
            <li>Regular accessibility audits and testing</li>
            <li>Staff training on accessibility best practices</li>
            <li>User testing with assistive technology</li>
            <li>Staying current with accessibility standards and guidelines</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-2">Legal Information</h2>
          <p className="mb-8">
            This accessibility statement was created on {new Date().toLocaleDateString()} using the 
            W3C Accessibility Statement Generator Tool. 
            The statement is reviewed and updated as needed to reflect current accessibility status.
          </p>

          {/* Navigation */}
          <div className="mt-12 flex justify-between items-center border-t border-gray-700 pt-6">
            <Link
              href="/terms"
              className="inline-flex items-center space-x-2 text-blue-400 hover:text-blue-300"
            >
              <FaChevronLeft className="h-4 w-4" />
              <span>Previous Legal Page</span>
            </Link>
            <Link
              href="/privacy"
              className="inline-flex items-center space-x-2 text-blue-400 hover:text-blue-300"
            >
              <span>Next Legal Page</span>
              <FaChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}