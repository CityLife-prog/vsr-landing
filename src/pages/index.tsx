import Header from '@/components/Header';
import Hero from '@/components/Hero';
import About from '@/components/About';
import Featured from '@/components/Featured';
import Services from '@/components/Services';
import Contact from '@/components/Contact';



export default function Home() {
  return (
    <>
      <Header />
      <main>
          <Hero />
          <Featured />
          <About />
          <Services />       
          <Contact />
      </main>
    </>
  );
}
