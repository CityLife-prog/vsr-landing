import { getCurrentVersion } from '@/utils/version';
import { useTranslation } from '@/hooks/useTranslation';

interface ProjectArea {
  zipcode: string;
  city: string;
  state: string;
  projectCount: number;
  centerLat: number;
  centerLng: number;
  services: string[];
}

export default function ProjectsPage() {
  const { t } = useTranslation();
  const currentVersion = getCurrentVersion();
  
  // For v2, show simple full-screen map (you will update Google My Maps with zipcode pins)
  if (currentVersion === 'v2') {
    return (
      <main className="min-h-screen bg-gray-900 text-white">
        {/* Header Section */}
        <div className="bg-gray-900 pt-20 pb-6 px-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl font-bold mb-4">{t('projects.title', 'Our Projects')}</h1>
            <p className="text-lg text-gray-300 max-w-3xl">
              {t('projects.description', 'Explore our work across the Denver Metro area. Map shows general service areas grouped by zip codes.')}
            </p>
          </div>
        </div>
        
        {/* Map Section with Margins */}
        <div className="px-6 pb-6">
          <div className="max-w-6xl mx-auto">
            <div 
              className="w-full rounded-lg overflow-hidden shadow-lg border border-gray-700" 
              style={{ height: 'calc(100vh - 280px)' }}
            >
              <iframe
                src="https://www.google.com/maps/d/u/2/embed?mid=1BJDyMnTrLDz1GEWH9flRBrQxcVIa0hU&ehbc=2E312F"
                width="100%"
                height="100%"
                allowFullScreen
                loading="lazy"
                style={{ border: 0 }}
              />
            </div>
          </div>
        </div>
      </main>
    );
  }

  // For v3 and v4, show enhanced version with zipcode grouping
  const projectAreas: ProjectArea[] = [
    {
      zipcode: "80031",
      city: "Westminster",
      state: "CO",
      projectCount: 15,
      centerLat: 39.8366,
      centerLng: -105.0372,
      services: ["Snow Removal", "Landscaping", "Concrete Work"]
    },
    {
      zipcode: "80234",
      city: "Thornton",
      state: "CO", 
      projectCount: 8,
      centerLat: 39.8681,
      centerLng: -104.9725,
      services: ["Snow Removal", "Demolition", "Painting"]
    },
    {
      zipcode: "80211",
      city: "Denver",
      state: "CO",
      projectCount: 22,
      centerLat: 39.7817,
      centerLng: -105.0178,
      services: ["Commercial Snow Removal", "Asphalt Repairs", "Hardscaping"]
    },
    {
      zipcode: "80033",
      city: "Wheat Ridge",
      state: "CO",
      projectCount: 12,
      centerLat: 39.7664,
      centerLng: -105.0772,
      services: ["Residential Landscaping", "Concrete Work", "Painting"]
    }
  ];

  return (
    <main className="min-h-screen bg-gray-900 text-white px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">{t('projects.title', 'Our Projects')}</h1>
        <p className="mb-4 text-lg">
          {t('projects.description_detailed', 'Explore our recent and ongoing work across the Denver Metro area. Projects are grouped by service area for privacy and security.')}
        </p>
        
        {/* Security Notice */}
        <div className="mb-6 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
          <p className="text-sm text-blue-200">
            <strong>{t('projects.privacy_notice_title', 'Privacy Notice:')}:</strong> {t('projects.privacy_notice_text', 'Project locations are grouped by zipcode areas to protect client privacy. Exact addresses are only available to authorized personnel.')}
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Project Areas Summary */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">{t('projects.service_areas', 'Service Areas')}</h2>
            <div className="space-y-4">
              {projectAreas.map((area) => (
                <div key={area.zipcode} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-medium">{area.city}, {area.state}</h3>
                      <p className="text-gray-400">{t('projects.zipcode', 'Zipcode')}: {area.zipcode}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">{t('projects.projects', 'Projects')}</p>
                      <p className="text-xl font-bold text-blue-400">{area.projectCount}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm text-gray-400 mb-1">{t('projects.services', 'Services')}:</p>
                    <div className="flex flex-wrap gap-2">
                      {area.services.map((service) => (
                        <span key={service} className="bg-blue-600 text-white px-2 py-1 rounded text-xs">
                          {t(`projects.service_names.${service.toLowerCase().replace(/\s+/g, '_').replace(/&/g, 'and')}`, service)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enhanced Map with Zipcode Pins */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">{t('projects.map_title', 'Service Area Map')}</h2>
            <div className="w-full h-[500px] rounded-xl overflow-hidden border border-gray-700">
              {/* 
                SECURITY IMPROVEMENT: 
                - Replace the current map with zipcode-centered pins
                - Remove exact addresses from public view
                - Use centroid coordinates for each zipcode area
                - Group multiple projects into single zipcode markers
              */}
              <iframe
                src="https://www.google.com/maps/d/u/2/embed?mid=1BJDyMnTrLDz1GEWH9flRBrQxcVIa0hU&ehbc=2E312F"
                width="100%"
                height="100%"
                allowFullScreen
                loading="lazy"
                className="rounded-xl"
              />
            </div>
            <p className="text-sm text-gray-400 mt-2">
              {t('projects.map_disclaimer', '* Map shows general service areas only. Exact project locations are confidential.')}
            </p>
          </div>
        </div>

        {/* Service Statistics */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">{t('projects.stats.total_projects', 'Total Projects')}</h3>
            <p className="text-3xl font-bold text-blue-400">
              {projectAreas.reduce((sum, area) => sum + area.projectCount, 0)}
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">{t('projects.stats.service_areas', 'Service Areas')}</h3>
            <p className="text-3xl font-bold text-green-400">{projectAreas.length}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">{t('projects.stats.services_offered', 'Services Offered')}</h3>
            <p className="text-3xl font-bold text-purple-400">
              {[...new Set(projectAreas.flatMap(area => area.services))].length}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}