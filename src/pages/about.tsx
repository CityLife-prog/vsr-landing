import Link from 'next/link';

export default function AboutSection() {
  return (
    <section className="bg-gray-900 text-white px-6 py-16">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl font-bold mb-6">About Us</h2>
        <p className="mb-4 text-lg">
          Built for Every Season. Ready for Every Challenge.
        </p>
        <p className="mb-4">
          Established in 2021, VSR LLC was founded by two driven entrepreneurs, Marcus and Zach, with a clear mission: to provide dependable, top-tier property maintenance services that clients can trust year-round...
        </p>
         Established in 2021, VSR LLC was founded by two driven entrepreneurs, Marcus and Zach, with a clear mission: to provide dependable, top-tier property maintenance services that clients can trust year-round. What began as a professional snow and ice removal company dedicated solely to commercial properties has quickly evolved into a full-service contracting powerhouse.
         Today, VSR LLC proudly offers a wide range of services including Landscaping, Hardscaping, Demolition, Concrete Work, Asphalt Patching, and Repairs—all with the same commitment to quality and reliability that launched our business.
         We understand the importance of having a contractor who shows up, gets the job done right, and treats your property as if it were their own. That’s why we pride ourselves on being more than just a service provider—we’re your trusted partner in maintaining and enhancing the value, safety, and appearance of your property, no matter the season.
         Whether it’s clearing snow in the dead of winter or transforming your landscape in the peak of summer, VSR LLC is built to handle it all. 
         <p className="text-center font-semibold mb-4">
         Dependable. Professional. All-season ready.
        </p>

        <Link href="/projects">
          <button className="mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-lg transition">
            View Our Projects
          </button>
        </Link>
      </div>
    </section>
  );
}
