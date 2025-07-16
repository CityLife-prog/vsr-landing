import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { 
  FaProjectDiagram, 
  FaComments, 
  FaUser,
  FaCalendarAlt,
  FaFileAlt,
  FaCamera,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaPhone,
  FaEnvelope
} from 'react-icons/fa';

export default function ClientDashboard() {
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([
    {
      id: 1,
      title: 'Commercial Snow Removal',
      status: 'active',
      progress: 0, // Long-term contract, no progress bar
      nextVisit: '2024-01-15',
      description: 'Complete snow removal service for office complex parking lot',
      serviceClass: 'commercial',
      showProgress: false
    },
    {
      id: 2,
      title: 'Residential Landscaping',
      status: 'scheduled',
      progress: 0,
      nextVisit: '2024-03-01',
      description: 'Garden design and planting for front yard',
      serviceClass: 'residential',
      showProgress: true
    }
  ]);

  useEffect(() => {
    checkClientAuth();
  }, []);

  const checkClientAuth = async () => {
    const token = localStorage.getItem('clientToken');
    if (!token) {
      router.push('/portal/client/login');
      return;
    }

    try {
      const response = await fetch('/api/client/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setClient(data.client);
      } else {
        router.push('/portal/client/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/portal/client/login');
    } finally {
      setLoading(false);
    }
  };

  // Logout handled by main Header component

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'scheduled': return 'bg-blue-500';
      case 'completed': return 'bg-gray-500';
      default: return 'bg-yellow-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return FaClock;
      case 'scheduled': return FaCalendarAlt;
      case 'completed': return FaCheckCircle;
      default: return FaExclamationTriangle;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-white">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Client Dashboard | VSR Construction</title>
        <meta name="description" content="Client dashboard for VSR Construction" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-100">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Welcome to Your Project Portal</h2>
            <p className="text-gray-300 mb-4">
              Stay updated on your VSR Construction projects, view progress, and communicate with our team.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-2">Active Projects</h3>
                <p className="text-3xl font-bold text-green-400">{projects.filter(p => p.status === 'active').length}</p>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-2">Scheduled Projects</h3>
                <p className="text-3xl font-bold text-blue-400">{projects.filter(p => p.status === 'scheduled').length}</p>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-2">Completed Projects</h3>
                <p className="text-3xl font-bold text-gray-400">{projects.filter(p => p.status === 'completed').length}</p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Projects Section */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-white mb-4">Your Projects</h2>
                <div className="space-y-4">
                  {projects.map((project) => {
                    const StatusIcon = getStatusIcon(project.status);
                    return (
                      <div key={project.id} className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <StatusIcon className="h-5 w-5 text-green-400" />
                            <h3 className="text-lg font-medium text-white">{project.title}</h3>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs text-white ${getStatusColor(project.status)}`}>
                            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm mb-3">{project.description}</p>
                        
                        {/* Service Class Badge */}
                        <div className="mb-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            project.serviceClass === 'commercial' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {project.serviceClass.charAt(0).toUpperCase() + project.serviceClass.slice(1)}
                          </span>
                        </div>
                        
                        {project.status === 'active' && project.showProgress && (
                          <div className="mb-3">
                            <div className="flex justify-between text-sm text-gray-400 mb-1">
                              <span>Progress</span>
                              <span>{project.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-600 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${project.progress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                        
                        {project.status === 'active' && !project.showProgress && (
                          <div className="mb-3">
                            <div className="text-sm text-gray-400">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Long-term Contract Active
                              </span>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-gray-400 text-sm">
                            <FaCalendarAlt className="h-4 w-4" />
                            <span>Next visit: {project.nextVisit}</span>
                          </div>
                          <Link
                            href={`/portal/client/project/${project.id}`}
                            className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded transition-colors"
                          >
                            View Details
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-4">
                  <Link
                    href="/portal/client/messages"
                    className="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <FaComments className="h-8 w-8 text-green-400 mb-2" />
                    <span className="text-sm text-white">Messages</span>
                  </Link>
                  
                  <Link
                    href="/portal/client/photos"
                    className="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <FaCamera className="h-8 w-8 text-blue-400 mb-2" />
                    <span className="text-sm text-white">Project Photos</span>
                  </Link>
                  
                  <Link
                    href="/portal/client/documents"
                    className="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <FaFileAlt className="h-8 w-8 text-purple-400 mb-2" />
                    <span className="text-sm text-white">Documents</span>
                  </Link>
                  
                  <Link
                    href="/quote"
                    className="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <FaProjectDiagram className="h-8 w-8 text-yellow-400 mb-2" />
                    <span className="text-sm text-white">New Quote</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div>
              {/* Contact Information */}
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-white mb-4">Contact Your Team</h2>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <FaPhone className="h-5 w-5 text-green-400" />
                    <div>
                      <p className="text-white text-sm">Phone</p>
                      <p className="text-gray-400 text-xs">(720) 838-5807</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <FaEnvelope className="h-5 w-5 text-blue-400" />
                    <div>
                      <p className="text-white text-sm">Email</p>
                      <p className="text-gray-400 text-xs">contact@vsrsnow.com</p>
                    </div>
                  </div>
                  <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors">
                    Send Message
                  </button>
                </div>
              </div>

              {/* Recent Updates */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Recent Updates</h2>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="text-white text-sm">Snow removal completed</p>
                      <p className="text-gray-400 text-xs">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="text-white text-sm">Project photos uploaded</p>
                      <p className="text-gray-400 text-xs">1 day ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div>
                      <p className="text-white text-sm">Schedule updated</p>
                      <p className="text-gray-400 text-xs">2 days ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}