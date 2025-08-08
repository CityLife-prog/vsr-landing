import Head from 'next/head';
import Link from 'next/link';
import { FaArrowLeft, FaChevronRight } from 'react-icons/fa';

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy | VSR LLC</title>
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
            <h1 className="text-4xl font-bold">Privacy Policy</h1>
          </div>

          <p className="mb-4 text-sm text-gray-300">Effective Date: July 16, 2025</p>

          <p className="mb-6">
            VSR LLC values your privacy and is committed to protecting your personal information. This Privacy Policy 
            explains how we collect, use, store, and protect your data when you visit our website or interact with our services.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-2">1. Information We Collect</h2>
          
          <h3 className="text-lg font-medium mt-4 mb-2 text-gray-300">Personal Information You Provide:</h3>
          <ul className="list-disc pl-6 mb-4 text-gray-300">
            <li><strong>Contact Information:</strong> Name, email address, phone number (collected through quote requests, job applications, and update forms)</li>
            <li><strong>Project Details:</strong> Service type, project descriptions, additional notes, and uploaded photos or documents</li>
            <li><strong>Employment Information:</strong> Resume files, work experience descriptions, and application materials</li>
            <li><strong>Contract Information:</strong> Contract IDs and project update information for existing clients</li>
          </ul>

          <h3 className="text-lg font-medium mt-4 mb-2 text-gray-300">Information Automatically Collected:</h3>
          <ul className="list-disc pl-6 mb-6 text-gray-300">
            <li><strong>Technical Data:</strong> IP address, browser type, device information, operating system, and referral sources</li>
            <li><strong>Usage Analytics:</strong> Pages visited, time spent on site, click patterns, and user interactions</li>
            <li><strong>Cookies and Local Storage:</strong> Browser preferences, consent choices, and session data</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-2">2. How We Collect Your Information</h2>
          <ul className="list-disc pl-6 mb-6 text-gray-300">
            <li><strong>Web Forms:</strong> Quote requests, job applications, and VSR team update submissions</li>
            <li><strong>File Uploads:</strong> Photos, documents, and resumes attached to forms</li>
            <li><strong>Website Analytics:</strong> Automatic collection through our website analytics system</li>
            <li><strong>Cookies:</strong> Browser cookies for functionality and analytics (with your consent)</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-2">3. How We Use Your Information</h2>
          <ul className="list-disc pl-6 mb-6 text-gray-300">
            <li><strong>Service Delivery:</strong> Process quote requests, evaluate job applications, and manage ongoing projects</li>
            <li><strong>Communication:</strong> Respond to inquiries, provide project updates, and maintain client relationships</li>
            <li><strong>Business Operations:</strong> Improve our services, analyze website performance, and optimize user experience</li>
            <li><strong>Legal Compliance:</strong> Meet regulatory requirements and maintain business records</li>
            <li><strong>Security:</strong> Protect against fraud, abuse, and unauthorized access</li>
          </ul>
          <p className="mb-6 text-sm bg-gray-800 p-3 rounded">
            <strong>Important:</strong> We do NOT sell, rent, or share your personal data with third parties for marketing purposes.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-2">4. Data Storage and Retention</h2>
          <ul className="list-disc pl-6 mb-6 text-gray-300">
            <li><strong>Quote Requests:</strong> Stored in our database and retained for 3 years from submission date</li>
            <li><strong>Job Applications:</strong> Kept for 1 year for current openings, 2 years for future consideration</li>
            <li><strong>Project Files:</strong> Maintained for the duration of the project plus 7 years for warranty purposes</li>
            <li><strong>Analytics Data:</strong> Aggregated and anonymized data retained for business analysis</li>
            <li><strong>Cookies:</strong> Session cookies expire when you close your browser; persistent cookies expire after 1 year</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-2">5. Who Has Access to Your Data</h2>
          <ul className="list-disc pl-6 mb-6 text-gray-300">
            <li><strong>VSR Team Members:</strong> Only authorized personnel who need access to perform their job duties</li>
            <li><strong>Email Recipients:</strong> Quote requests are sent to marcus@vsrsnow.com and zach@vsrsnow.com; job applications go to marcus@vsrsnow.com</li>
            <li><strong>System Administrators:</strong> Technical staff for maintenance and security purposes only</li>
            <li><strong>No Third Parties:</strong> We do not share your data with external parties except as required by law</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-2">6. Data Security Measures</h2>
          <p className="mb-4 text-gray-300">
            We take data security seriously and implement multiple layers of protection to safeguard your personal information:
          </p>
          
          <h3 className="text-lg font-medium mt-4 mb-2 text-gray-300">Encryption & Transmission Security:</h3>
          <ul className="list-disc pl-6 mb-4 text-gray-300">
            <li><strong>HTTPS/TLS Encryption:</strong> All data transmitted between your browser and our servers uses industry-standard TLS 1.3 encryption</li>
            <li><strong>End-to-End Security:</strong> Form submissions, file uploads, and personal data are encrypted during transmission</li>
            <li><strong>Certificate Authentication:</strong> SSL certificates verify our server identity and prevent man-in-the-middle attacks</li>
          </ul>

          <h3 className="text-lg font-medium mt-4 mb-2 text-gray-300">Data Storage Security:</h3>
          <ul className="list-disc pl-6 mb-4 text-gray-300">
            <li><strong>Database Encryption:</strong> Personal data stored in our databases is encrypted at rest using AES-256 encryption</li>
            <li><strong>Secure File Storage:</strong> Uploaded files (resumes, photos) are stored in encrypted, access-controlled storage systems</li>
            <li><strong>Data Segregation:</strong> Different types of data are stored in separate, secured environments</li>
          </ul>

          <h3 className="text-lg font-medium mt-4 mb-2 text-gray-300">Access Controls & Authentication:</h3>
          <ul className="list-disc pl-6 mb-4 text-gray-300">
            <li><strong>Multi-Factor Authentication:</strong> Admin access requires strong password policies and additional verification</li>
            <li><strong>Role-Based Permissions:</strong> Team members only have access to data necessary for their specific job functions</li>
            <li><strong>Session Management:</strong> Automatic logout and secure session handling prevent unauthorized access</li>
            <li><strong>IP Monitoring:</strong> Unusual access patterns are automatically flagged and investigated</li>
          </ul>

          <h3 className="text-lg font-medium mt-4 mb-2 text-gray-300">Infrastructure & Monitoring:</h3>
          <ul className="list-disc pl-6 mb-4 text-gray-300">
            <li><strong>Regular Security Audits:</strong> Periodic security assessments and vulnerability scans</li>
            <li><strong>Automated Backups:</strong> Daily encrypted backups stored in geographically separate locations</li>
            <li><strong>24/7 Monitoring:</strong> Continuous monitoring for security threats, intrusion attempts, and system anomalies</li>
            <li><strong>Incident Response:</strong> Established procedures for rapid response to any security incidents</li>
            <li><strong>Software Updates:</strong> Regular security patches and updates to all systems and dependencies</li>
          </ul>

          <div className="mb-6 bg-blue-900 bg-opacity-30 border border-blue-700 p-4 rounded">
            <p className="text-sm text-blue-200">
              <strong>Security Commitment:</strong> While we implement industry-leading security measures and continuously improve our practices, 
              no system can guarantee 100% security. We are committed to maintaining the highest security standards and will promptly 
              notify affected users in the unlikely event of a data breach, as required by applicable laws.
            </p>
          </div>

          <p className="mb-6 text-sm text-gray-400">
            <strong>Have security concerns?</strong> Please report any potential security issues to{' '}
            <a href="mailto:citylife32@outlook.com?subject=Security Concern" className="underline text-blue-400 hover:text-blue-300">
              citylife32@outlook.com
            </a>{' '}
            immediately.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-2">7. Cookies and Tracking</h2>
          <p className="mb-4 text-gray-300">
            We use cookies to enhance your browsing experience and analyze website performance. You can control cookie preferences through our consent banner.
          </p>
          <ul className="list-disc pl-6 mb-6 text-gray-300">
            <li><strong>Essential Cookies:</strong> Required for basic website functionality</li>
            <li><strong>Analytics Cookies:</strong> Help us understand how visitors use our website</li>
            <li><strong>Preference Cookies:</strong> Remember your settings and choices</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-2">8. Third-Party Services</h2>
          <p className="mb-4 text-gray-300">
            Our website may include embedded content from third-party services:
          </p>
          <ul className="list-disc pl-6 mb-6 text-gray-300">
            <li><strong>Google Maps:</strong> For location services (governed by Google's Privacy Policy)</li>
            <li><strong>Weather Widgets:</strong> For weather information display</li>
            <li><strong>Social Media Embeds:</strong> May collect data according to their respective privacy policies</li>
          </ul>
          <p className="mb-6 text-sm text-gray-400">
            We recommend reviewing the privacy policies of these third-party services for complete information about their data practices.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-2">9. Your Privacy Rights</h2>
          <p className="mb-4 text-gray-300">You have the following rights regarding your personal information:</p>
          <ul className="list-disc pl-6 mb-6 text-gray-300">
            <li><strong>Access:</strong> Request copies of your personal data we hold</li>
            <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
            <li><strong>Deletion:</strong> Request deletion of your personal data (subject to legal retention requirements)</li>
            <li><strong>Portability:</strong> Request your data in a commonly used, machine-readable format</li>
            <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing where consent was the legal basis</li>
            <li><strong>Object:</strong> Object to processing of your personal data in certain circumstances</li>
          </ul>
          <p className="mb-6 text-sm bg-gray-800 p-3 rounded">
            To exercise any of these rights, please contact us at marcus@vsrsnow.com with your specific request. We will respond within 30 days.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-2">10. Contact Us</h2>
          <p className="mb-4 text-gray-300">
            If you have any questions about this Privacy Policy or our data practices, please contact us:
          </p>
          <div className="mb-8 bg-gray-800 p-4 rounded">
            <p className="text-white">
              <strong>VSR LLC</strong><br />
              Email: <a href="mailto:marcus@vsrsnow.com" className="underline text-blue-400 hover:text-blue-300">marcus@vsrsnow.com</a><br />
              Phone: <a href="tel:+17208385807" className="underline text-blue-400 hover:text-blue-300">(720) 838-5807</a><br />
              Privacy Inquiries: <a href="mailto:citylife32@outlook.com" className="underline text-blue-400 hover:text-blue-300">citylife32@outlook.com</a>
            </p>
          </div>

          <h2 className="text-2xl font-semibold mt-8 mb-2">11. Changes to This Policy</h2>
          <p className="mb-8 text-gray-300">
            We may update this Privacy Policy from time to time to reflect changes in our practices or applicable laws. 
            When we make changes, we will update the "Effective Date" at the top of this policy. We encourage you to 
            review this policy periodically to stay informed about how we protect your privacy.
          </p>

          {/* Navigation */}
          <div className="mt-12 flex justify-between items-center border-t border-gray-700 pt-6">
            <Link
              href="/accessibility"
              className="inline-flex items-center space-x-2 text-blue-400 hover:text-blue-300"
            >
              <FaArrowLeft className="h-4 w-4" />
              <span>Previous Legal Page</span>
            </Link>
            <Link
              href="/terms"
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