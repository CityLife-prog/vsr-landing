export default function SnowIceRemovalPage() {
    return (
      <div className="px-6 py-10">
        <h1 className="text-3xl font-bold mb-4">Snow & Ice Removal</h1>
        <p className="mb-8 text-lg">
          Reliable and timely snow and ice removal for commercial properties.
        </p>
        <h2 className="text-2xl font-semibold mb-4">Photo Gallery</h2>
        <div className="w-full h-[600px]">
          <iframe
            src="https://drive.google.com/embeddedfolderview?id=1IqMq5IdY5_NAlPk8ZvVw2_pyPSIRP7oh#grid"
            width="100%"
            height="100%"
            frameBorder="0"
          />
        </div>
      </div>
    );
  }