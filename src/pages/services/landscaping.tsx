// pages/services/landscaping.tsx
export default function LandscapingPage() {
    return (
      <div className="px-6 py-10">
        <h1 className="text-3xl font-bold mb-4">Landscaping</h1>
        <p className="mb-8 text-lg">
          Transforming outdoor spaces with expert design and maintenance.
        </p>
  
        <h2 className="text-2xl font-semibold mb-4">Photo Gallery</h2>
  
        <div className="w-full h-[600px]">
        <iframe
            src="https://drive.google.com/embeddedfolderview?id=1_jkL1KhqKyhwZD0N4mL0i4JyZ6zgfiLa#grid"
            width="100%"
            height="100%"
            frameBorder="0"
            />
        </div>
      </div>
    );
  }
  