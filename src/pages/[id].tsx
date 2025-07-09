import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface Project {
  id: string;
  title: string;
  description: string;
  location: string;
  serviceType: string;
  status: 'completed' | 'in-progress' | 'planned';
  images?: string[];
}

const ProjectPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    // Mock project data - in production this would come from an API
    const mockProjects: Record<string, Project> = {
      '1': {
        id: '1',
        title: 'Commercial Snow Removal',
        description: 'Complete snow removal services for commercial properties throughout the Denver Metro area.',
        location: 'Denver Metro Area',
        serviceType: 'Snow Removal',
        status: 'completed',
        images: ['/contact_photo.png']
      },
      '2': {
        id: '2',
        title: 'Commercial Landscaping Project',
        description: 'Large-scale landscaping and hardscaping project for commercial office complex.',
        location: 'Aurora, CO',
        serviceType: 'Landscaping',
        status: 'in-progress',
        images: ['/contact_photo2.png']
      },
      '3': {
        id: '3',
        title: 'Concrete Driveway Repair',
        description: 'Residential driveway repair and resurfacing project with decorative concrete finishing.',
        location: 'Westminster, CO',
        serviceType: 'Concrete Repair',
        status: 'completed'
      },
      '4': {
        id: '4',
        title: 'Commercial Painting Project',
        description: 'Interior and exterior painting services for multi-story commercial building.',
        location: 'Lakewood, CO',
        serviceType: 'Painting',
        status: 'planned'
      },
      '5': {
        id: '5',
        title: 'Demolition Services',
        description: 'Safe and efficient demolition of old warehouse structure with environmental considerations.',
        location: 'Commerce City, CO',
        serviceType: 'Demolition',
        status: 'in-progress'
      }
    };

    const projectData = mockProjects[id as string];
    
    if (projectData) {
      setProject(projectData);
    } else {
      setError('Project not found');
    }
    
    setLoading(false);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <>
        <Head>
          <title>Project Not Found | VSR Construction</title>
        </Head>
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Project Not Found</h1>
            <p className="text-gray-400 mb-8">The project you're looking for doesn't exist.</p>
            <Link 
              href="/projects"
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg transition-colors"
            >
              Back to Projects
            </Link>
          </div>
        </div>
      </>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-600';
      case 'in-progress': return 'bg-yellow-600';
      case 'planned': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <>
      <Head>
        <title>{project.title} | VSR Construction</title>
        <meta name="description" content={project.description} />
      </Head>
      
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-6">
            <Link 
              href="/projects"
              className="text-blue-400 hover:text-blue-300 flex items-center mb-4"
            >
              ← Back to Projects
            </Link>
            
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-4xl font-bold">{project.title}</h1>
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(project.status)} text-white`}>
                {project.status.charAt(0).toUpperCase() + project.status.slice(1).replace('-', ' ')}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Location</h3>
                <p className="text-gray-300">{project.location}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Service Type</h3>
                <p className="text-gray-300">{project.serviceType}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Project Description</h2>
            <p className="text-gray-300 leading-relaxed">{project.description}</p>
          </div>

          {project.images && project.images.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-6 mb-8">
              <h2 className="text-2xl font-semibold mb-4">Project Images</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {project.images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`${project.title} - Image ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                ))}
              </div>
            </div>
          )}

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Interested in Similar Work?</h2>
            <p className="text-gray-300 mb-6">
              Contact us to discuss your project requirements and get a custom quote.
            </p>
            <div className="flex gap-4">
              <Link 
                href="/quote"
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg transition-colors"
              >
                Get Quote
              </Link>
              <Link 
                href="/apply"
                className="bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded-lg transition-colors"
              >
                Apply Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProjectPage;