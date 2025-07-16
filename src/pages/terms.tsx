import Head from 'next/head';
import Link from 'next/link';
import { FaArrowLeft, FaChevronRight } from 'react-icons/fa';

export default function TermsAndConditions() {
  return (
    <>
      <Head>
        <title>Terms and Conditions | VSR Construction</title>
        <meta name="description" content="Terms and conditions for VSR Construction services" />
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
            <h1 className="text-4xl font-bold">Terms and Conditions</h1>
          </div>
          <p className="mb-4 text-sm text-gray-300">Effective Date: July 16, 2025</p>

          <h2 className="text-2xl font-semibold mt-8 mb-2">1. Acceptance of Terms</h2>
          <p className="mb-6">
            By accessing and using the website, services, or requesting quotes from VSR Construction LLC ("VSR," "Company," "we," "our," or "us"), 
            you ("Client," "Customer," or "you") accept and agree to be bound by these terms and conditions. 
            If you do not agree to these terms, please do not use our services or website.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-2">2. Company Information</h2>
          <p className="mb-6">
            VSR Construction LLC is a limited liability company operating in Colorado, providing construction, 
            maintenance, and related services to commercial and residential clients.
          </p>
          <div className="mb-6 bg-gray-800 p-4 rounded">
            <p className="text-white">
              <strong>VSR Construction LLC</strong><br />
              Business Operations: Colorado<br />
              Email: <a href="mailto:marcus@vsrsnow.com" className="underline text-blue-400 hover:text-blue-300">marcus@vsrsnow.com</a><br />
              Phone: <a href="tel:+17208385807" className="underline text-blue-400 hover:text-blue-300">(720) 838-5807</a>
            </p>
          </div>

          <h2 className="text-2xl font-semibold mt-8 mb-2">3. Services Provided</h2>
          <p className="mb-4 text-gray-300">
            VSR Construction LLC provides the following professional services:
          </p>
          
          <h3 className="text-lg font-medium mt-4 mb-2 text-gray-300">Commercial Services:</h3>
          <ul className="list-disc pl-6 mb-4 text-gray-300">
            <li><strong>Snow and Ice Removal:</strong> Commercial property winter maintenance and de-icing services</li>
            <li><strong>Landscaping and Hardscaping:</strong> Commercial grounds maintenance, design, and installation</li>
            <li><strong>Concrete and Asphalt Services:</strong> Repair, installation, and maintenance of commercial surfaces</li>
            <li><strong>Demolition Services:</strong> Safe and professional demolition for commercial projects</li>
            <li><strong>Painting Services:</strong> Interior and exterior commercial painting and finishing</li>
          </ul>

          <h3 className="text-lg font-medium mt-4 mb-2 text-gray-300">Residential Services:</h3>
          <ul className="list-disc pl-6 mb-6 text-gray-300">
            <li><strong>Landscaping and Hardscaping:</strong> Residential landscape design, installation, and maintenance</li>
            <li><strong>Concrete and Asphalt Work:</strong> Driveways, walkways, patios, and repair services</li>
            <li><strong>Demolition:</strong> Residential demolition and debris removal</li>
            <li><strong>Painting:</strong> Interior and exterior residential painting services</li>
            <li><strong>General Construction:</strong> Home improvement and construction projects</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-2">4. Quote and Estimate Process</h2>
          <h3 className="text-lg font-medium mt-4 mb-2 text-gray-300">Quote Validity and Pricing:</h3>
          <ul className="list-disc pl-6 mb-4 text-gray-300">
            <li><strong>Validity Period:</strong> All quotes and estimates are valid for 30 days unless otherwise specified in writing</li>
            <li><strong>Site Conditions:</strong> Final pricing may vary based on actual site conditions discovered during project execution</li>
            <li><strong>Scope Changes:</strong> Any changes to the agreed scope of work will require written approval and may affect pricing</li>
            <li><strong>Material Costs:</strong> Quotes are subject to material cost fluctuations beyond our control</li>
          </ul>

          <h3 className="text-lg font-medium mt-4 mb-2 text-gray-300">Acceptance of Quotes:</h3>
          <ul className="list-disc pl-6 mb-6 text-gray-300">
            <li>Written acceptance is required to proceed with quoted work</li>
            <li>Verbal agreements must be confirmed in writing within 48 hours</li>
            <li>Emergency services may proceed with verbal authorization followed by written confirmation</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-2">5. Payment Terms and Conditions</h2>
          <h3 className="text-lg font-medium mt-4 mb-2 text-gray-300">Payment Schedule:</h3>
          <ul className="list-disc pl-6 mb-4 text-gray-300">
            <li><strong>Small Projects (Under $5,000):</strong> Payment due upon completion</li>
            <li><strong>Medium Projects ($5,000-$15,000):</strong> 50% deposit required, balance due upon completion</li>
            <li><strong>Large Projects (Over $15,000):</strong> Custom payment schedule established in contract</li>
            <li><strong>Recurring Services:</strong> Monthly billing with 30-day payment terms</li>
          </ul>

          <h3 className="text-lg font-medium mt-4 mb-2 text-gray-300">Payment Methods and Policies:</h3>
          <ul className="list-disc pl-6 mb-6 text-gray-300">
            <li>Accepted payment methods: Check, bank transfer, major credit cards (processing fees may apply)</li>
            <li><strong>Late Payments:</strong> 1.5% monthly service charge on overdue balances</li>
            <li><strong>Disputed Charges:</strong> Must be reported in writing within 30 days of invoice date</li>
            <li><strong>Collection Costs:</strong> Customer responsible for collection costs including reasonable attorney fees</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-2">6. Cancellation and Scheduling Policy</h2>
          <h3 className="text-lg font-medium mt-4 mb-2 text-gray-300">Cancellation Notice Requirements:</h3>
          <ul className="list-disc pl-6 mb-4 text-gray-300">
            <li><strong>One-time Services:</strong> 24-hour advance notice required for cancellation without penalty</li>
            <li><strong>Recurring Services:</strong> 30-day written notice required for service termination</li>
            <li><strong>Emergency Services:</strong> Cannot be cancelled once work has commenced</li>
            <li><strong>Weather-Related Delays:</strong> No cancellation fees apply for weather-related service delays</li>
          </ul>

          <h3 className="text-lg font-medium mt-4 mb-2 text-gray-300">Cancellation Fees:</h3>
          <ul className="list-disc pl-6 mb-6 text-gray-300">
            <li>Less than 24-hour notice: 25% of scheduled service cost</li>
            <li>No-show or same-day cancellation: 50% of scheduled service cost</li>
            <li>Materials already ordered are non-refundable unless returned unused in original condition</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-2">7. Insurance, Liability, and Limitations</h2>
          <h3 className="text-lg font-medium mt-4 mb-2 text-gray-300">Insurance Coverage:</h3>
          <ul className="list-disc pl-6 mb-4 text-gray-300">
            <li>VSR Construction LLC maintains comprehensive general liability insurance</li>
            <li>Workers' compensation insurance covers all employees</li>
            <li>Equipment and vehicle insurance protects against property damage</li>
            <li>Certificate of insurance available upon request</li>
          </ul>

          <h3 className="text-lg font-medium mt-4 mb-2 text-gray-300">Liability Limitations:</h3>
          <ul className="list-disc pl-6 mb-6 text-gray-300">
            <li><strong>Service Liability:</strong> Our liability is limited to the total cost of services provided for the specific project</li>
            <li><strong>Pre-existing Conditions:</strong> Not responsible for damage to property not directly related to our services</li>
            <li><strong>Hidden Conditions:</strong> Not liable for damage caused by hidden utilities, structures, or hazardous materials</li>
            <li><strong>Consequential Damages:</strong> Not liable for indirect, incidental, or consequential damages</li>
            <li><strong>Time Limitation:</strong> Claims must be made within one year of service completion</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-2">8. Force Majeure and Weather Conditions</h2>
          <p className="mb-4 text-gray-300">
            Service delivery may be affected by circumstances beyond our reasonable control:
          </p>
          <ul className="list-disc pl-6 mb-6 text-gray-300">
            <li><strong>Weather Conditions:</strong> Extreme weather, snow, ice, or unsafe working conditions</li>
            <li><strong>Natural Disasters:</strong> Earthquakes, floods, fires, or other natural catastrophes</li>
            <li><strong>Government Action:</strong> Regulations, restrictions, or emergency orders</li>
            <li><strong>Supply Chain Issues:</strong> Material shortages or delivery delays beyond our control</li>
            <li><strong>Labor Disputes:</strong> Strikes or other labor-related disruptions</li>
          </ul>
          <p className="mb-6 text-sm bg-gray-800 p-3 rounded">
            <strong>Rescheduling:</strong> We will reschedule affected services at the earliest opportunity and notify clients promptly of any delays.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-2">9. Property Access and Client Responsibilities</h2>
          <h3 className="text-lg font-medium mt-4 mb-2 text-gray-300">Access Requirements:</h3>
          <ul className="list-disc pl-6 mb-4 text-gray-300">
            <li><strong>Reasonable Access:</strong> Client must provide safe and reasonable access to work areas</li>
            <li><strong>Advance Notice:</strong> Any access restrictions must be communicated at least 24 hours in advance</li>
            <li><strong>Security Requirements:</strong> Special security or access procedures must be documented</li>
            <li><strong>Pet Safety:</strong> Client responsible for securing pets during service delivery</li>
          </ul>

          <h3 className="text-lg font-medium mt-4 mb-2 text-gray-300">Client Preparation Responsibilities:</h3>
          <ul className="list-disc pl-6 mb-6 text-gray-300">
            <li>Clear work areas of personal belongings and obstacles</li>
            <li>Mark or identify underground utilities, sprinkler systems, or hidden infrastructure</li>
            <li>Ensure adequate electrical power and water access when required</li>
            <li>Provide accurate property boundaries and any easement information</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-2">10. Warranties and Guarantees</h2>
          <h3 className="text-lg font-medium mt-4 mb-2 text-gray-300">Workmanship Warranty:</h3>
          <ul className="list-disc pl-6 mb-4 text-gray-300">
            <li><strong>Duration:</strong> One-year warranty on workmanship from project completion date</li>
            <li><strong>Coverage:</strong> Defects in installation, construction methods, or service delivery</li>
            <li><strong>Response Time:</strong> Warranty issues addressed within 5 business days of notification</li>
          </ul>

          <h3 className="text-lg font-medium mt-4 mb-2 text-gray-300">Material Warranties:</h3>
          <ul className="list-disc pl-6 mb-4 text-gray-300">
            <li>Material warranties provided by manufacturers and passed through to clients</li>
            <li>VSR will assist with warranty claims but is not responsible for manufacturer defects</li>
            <li>Installation required to meet manufacturer specifications for warranty validity</li>
          </ul>

          <h3 className="text-lg font-medium mt-4 mb-2 text-gray-300">Warranty Exclusions:</h3>
          <ul className="list-disc pl-6 mb-6 text-gray-300">
            <li>Normal wear and tear from weather and usage</li>
            <li>Damage from misuse, negligence, or improper maintenance</li>
            <li>Modifications made by others after project completion</li>
            <li>Acts of nature, vandalism, or third-party damage</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-2">11. Dispute Resolution and Governing Law</h2>
          <h3 className="text-lg font-medium mt-4 mb-2 text-gray-300">Resolution Process:</h3>
          <ul className="list-disc pl-6 mb-4 text-gray-300">
            <li><strong>Step 1:</strong> Direct communication with project manager or company owner</li>
            <li><strong>Step 2:</strong> Formal written complaint with requested resolution</li>
            <li><strong>Step 3:</strong> Mediation through neutral third party if needed</li>
            <li><strong>Step 4:</strong> Binding arbitration as final resolution method</li>
          </ul>

          <h3 className="text-lg font-medium mt-4 mb-2 text-gray-300">Legal Jurisdiction:</h3>
          <ul className="list-disc pl-6 mb-6 text-gray-300">
            <li><strong>Governing Law:</strong> All disputes governed by Colorado state law</li>
            <li><strong>Arbitration Location:</strong> Colorado, or via online arbitration platforms</li>
            <li><strong>Attorney Fees:</strong> Prevailing party entitled to reasonable attorney fees and costs</li>
            <li><strong>Limitation Period:</strong> Claims must be brought within one year of discovery</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-2">12. Privacy and Data Protection</h2>
          <p className="mb-4 text-gray-300">
            VSR Construction is committed to protecting your personal information and privacy:
          </p>
          <ul className="list-disc pl-6 mb-6 text-gray-300">
            <li><strong>Data Collection:</strong> We collect only information necessary to provide services and communicate with clients</li>
            <li><strong>Data Security:</strong> All personal information is protected using industry-standard security measures</li>
            <li><strong>Data Usage:</strong> Information is used solely for service delivery, communication, and business operations</li>
            <li><strong>Third Parties:</strong> We do not sell or share personal information with third parties for marketing purposes</li>
            <li><strong>Rights:</strong> You have the right to access, correct, or request deletion of your personal information</li>
          </ul>
          <p className="mb-6 text-sm bg-gray-800 p-3 rounded">
            For complete details, please refer to our <a href="/privacy" className="underline text-blue-400 hover:text-blue-300">Privacy Policy</a>.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-2">13. Website Terms and Digital Services</h2>
          <h3 className="text-lg font-medium mt-4 mb-2 text-gray-300">Website Usage:</h3>
          <ul className="list-disc pl-6 mb-4 text-gray-300">
            <li><strong>Permitted Use:</strong> Website is for legitimate business purposes and quote requests only</li>
            <li><strong>Prohibited Activities:</strong> No automated data collection, system interference, or malicious activities</li>
            <li><strong>Content Rights:</strong> All website content is protected by copyright and trademark laws</li>
            <li><strong>User Content:</strong> Information submitted through forms becomes part of our business records</li>
          </ul>

          <h3 className="text-lg font-medium mt-4 mb-2 text-gray-300">Digital Communication:</h3>
          <ul className="list-disc pl-6 mb-6 text-gray-300">
            <li>Email communications are considered binding for business purposes</li>
            <li>Client responsible for maintaining accurate contact information</li>
            <li>Digital signatures and electronic acceptance are legally binding</li>
            <li>System maintenance may temporarily affect website or email availability</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-2">14. Modifications and Updates</h2>
          <h3 className="text-lg font-medium mt-4 mb-2 text-gray-300">Terms Updates:</h3>
          <ul className="list-disc pl-6 mb-4 text-gray-300">
            <li><strong>Regular Review:</strong> These terms are reviewed and updated periodically</li>
            <li><strong>Notice of Changes:</strong> Material changes will be posted on our website and communicated to active clients</li>
            <li><strong>Effective Date:</strong> Changes become effective 30 days after posting unless otherwise specified</li>
            <li><strong>Continued Use:</strong> Continued use of services after changes constitutes acceptance</li>
          </ul>

          <h3 className="text-lg font-medium mt-4 mb-2 text-gray-300">Service Updates:</h3>
          <ul className="list-disc pl-6 mb-6 text-gray-300">
            <li>Service offerings and pricing may change with appropriate notice</li>
            <li>Existing contracts remain valid under original terms unless mutually modified</li>
            <li>New services may have additional or different terms and conditions</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-2">15. Severability and Entire Agreement</h2>
          <p className="mb-4 text-gray-300">
            These terms constitute the entire agreement between VSR Construction LLC and the client:
          </p>
          <ul className="list-disc pl-6 mb-6 text-gray-300">
            <li><strong>Severability:</strong> If any provision is found unenforceable, remaining terms continue in full effect</li>
            <li><strong>Entire Agreement:</strong> These terms supersede all prior agreements and communications</li>
            <li><strong>Modifications:</strong> Changes must be made in writing and signed by both parties</li>
            <li><strong>Headings:</strong> Section headings are for convenience only and do not affect interpretation</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-2">16. Contact Information and Support</h2>
          <p className="mb-4 text-gray-300">
            For questions about these terms and conditions or our services, please contact us:
          </p>
          <div className="mb-8 bg-gray-800 p-4 rounded">
            <p className="text-white">
              <strong>VSR Construction LLC</strong><br />
              Primary Contact: <a href="mailto:marcus@vsrsnow.com" className="underline text-blue-400 hover:text-blue-300">marcus@vsrsnow.com</a><br />
              Phone: <a href="tel:+17208385807" className="underline text-blue-400 hover:text-blue-300">(720) 838-5807</a><br />
              Legal/Terms Questions: <a href="mailto:citylife32@outlook.com?subject=Terms and Conditions Inquiry" className="underline text-blue-400 hover:text-blue-300">citylife32@outlook.com</a><br />
              Business Hours: Monday-Friday, 8:00 AM - 6:00 PM MT
            </p>
          </div>
          
          <p className="mb-8 text-sm text-gray-400">
            <strong>Response Time:</strong> We strive to respond to all inquiries within 1-2 business days. 
            For urgent matters, please call our main phone number.
          </p>

          {/* Navigation */}
          <div className="mt-12 flex justify-between items-center border-t border-gray-700 pt-6">
            <Link
              href="/privacy"
              className="inline-flex items-center space-x-2 text-blue-400 hover:text-blue-300"
            >
              <FaArrowLeft className="h-4 w-4" />
              <span>Previous Legal Page</span>
            </Link>
            <Link
              href="/accessibility"
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