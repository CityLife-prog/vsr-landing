export default function PaintingPage() {
    return (
      <div className="px-6 py-10">
        <h1 className="text-3xl font-bold mb-4">Painting</h1>
        <p className="mb-8 text-lg">
          Interior and exterior painting for homes and businesses that lasts.
        </p>
        <h2 className="text-2xl font-semibold mb-4">Photo Gallery</h2>
        <div className="w-full h-[600px]">
          <iframe
            src="https://drive.google.com/embeddedfolderview?id=1YPGSX4PBTpLyCLA8PIyITKmqUiEJobJk#grid"
            width="100%"
            height="100%"
            frameBorder="0"
          />
        </div>
      </div>
    );
  }
  