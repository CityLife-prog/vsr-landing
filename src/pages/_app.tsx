import type { AppProps } from 'next/app';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <Header />
      <main className="px-4 py-8">
        <Component {...pageProps} />
      </main>
      <Footer />
    </div>
  );
}
