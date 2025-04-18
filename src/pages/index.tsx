//import Services from '@/components/Services';
//import Footer from '@/components/Footer';

import Head from 'next/head';
import Header from '@/components/Header';
import Hero from '@/components/Hero';

export default function Home() {
  return (
    <>
      <Head>
        <title>VSR Construction</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="font-sans bg-gray-50 text-gray-900">
        <Header />
        <Hero />
        {/* Placeholder for about, services, contact */}
        <section id="about" className="h-screen bg-white p-10">About</section>
        <section id="services" className="h-screen bg-gray-100 p-10">Services</section>
        <section id="contact" className="h-screen bg-white p-10">Contact</section>
      </main>
    </>
  );
}
