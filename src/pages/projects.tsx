export default function ProjectsPage() {
    return (
      <main className="min-h-screen bg-gray-900 text-white px-4 py-10">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-bold mb-6">Our Projects</h1>
          <p className="mb-4 text-lg">
            Explore some of our recent and ongoing work across the Denver Metro area. Click on a location on the map to learn more about the project.
          </p>
          
          <div className="w-full h-[600px] rounded-xl overflow-hidden border border-gray-700">
            <iframe
              src="https://www.google.com/maps/d/embed?mid=1hV3qtSOdDXzZuXHtS2kxCzEinQcOe0c&ehbc=2E312F"
              width="100%"
              height="100%"
              allowFullScreen
              loading="lazy"
              className="rounded-xl"
            />
          </div>
        </div>
      </main>
    );
  }
  