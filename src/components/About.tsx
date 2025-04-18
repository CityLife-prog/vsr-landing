// src/components/About.tsx
export default function About() {
    return (
      <section id="about" className="relative min-h-screen w-full flex items-center justify-center bg-cover bg-center text-white"
      style={{ backgroundImage: "url('/about.jpg')" }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">About Us</h2>
          <p className="text-lg">
            VSR Construction is your all-season partner for snow removal, landscaping,
            hardscaping, and full-service contracting.
          </p>
        </div>
      </section>
    );
  }