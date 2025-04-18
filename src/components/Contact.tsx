export default function Contact() {
    return (
      <section
        id="contact"
        className="relative min-h-screen w-full flex items-center justify-center bg-cover bg-center text-white"
        style={{ backgroundImage: "url('/contact_photo.png')" }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-60 z-0" />
  
        {/* Contact Info */}
        <div className="relative z-10 text-center px-4">
          <h2 className="text-3xl font-bold mb-4">Contact Us</h2>
          <p className="text-lg">Email: marcus@vsrsnow.com</p>
          <p className="text-lg">Phone: (720) 838-5807</p>
        </div>
      </section>
    );
  }
  