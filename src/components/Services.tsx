import { useMobile } from '@/context/MobileContext'; 
import { serviceTags } from '@/lib/serviceTags';
import ServiceBox from '@/components/ServiceBox';
import Link from 'next/link';

const siteVersion = process.env.NEXT_PUBLIC_SITE_VERSION;
const isV2 = siteVersion === '2';

export default function Services() {
  const { isMobile } = useMobile();

  return (
    <section
      id="services"
      className="relative min-h-screen w-full flex items-center justify-center bg-cover bg-center text-white"
      style={{ backgroundImage: "url('/services.jpg')" }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-60 z-0" />

      <div className="relative z-10 text-center px-4 max-w-6xl w-full">
        <h2 className="text-3xl font-bold mb-16">Our Services</h2>

        <div className={isMobile ? 'flex flex-col space-y-4' : 'grid gap-6 md:grid-cols-2 lg:grid-cols-3'}>
          {serviceTags.map((tag, index) => {
            const isDisabled = tag.disabled || !isV2;
            const tooltipPosition = index < 3 ? 'top' : 'bottom';

            return isMobile ? (
              <div key={tag.name} className="flex flex-row gap-4 items-start w-full">
                {/* Title box (same style as desktop) */}
                <div className="w-1/2">
                  <ServiceBox
                    name={tag.name}
                    disabled={isDisabled}
                    variant="mobile"
                  />
                </div>

                {/* Description box — styled like tooltip */}
                <div className="w-1/2">
                  <div className="bg-black bg-opacity-80 text-white text-sm p-4 rounded shadow text-left">
                    {tag.description || ''}
                  </div>
                </div>
              </div>
            ) : (
              <ServiceBox
                key={tag.name}
                name={tag.name}
                description={tag.description}
                link={tag.link}
                tooltipPosition={tooltipPosition}
                disabled={isDisabled}
                variant="landing"
              />
            );
          })}

          {/* Get a Quote Box */}
          {isMobile ? (
            <div className="w-full flex justify-center mt-6">
              <Link href="/quote" className="w-1/2">
                <div className="bg-blue-600 hover:bg-blue-700 p-4 rounded shadow cursor-pointer transition font-medium text-center">
                  Get a Quote
                </div>
              </Link>
            </div>
          ) : (
            <Link href="/quote">
              <div className="bg-blue-600 hover:bg-blue-700 p-4 rounded shadow cursor-pointer transition font-medium text-center">
                Get a Quote
              </div>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
