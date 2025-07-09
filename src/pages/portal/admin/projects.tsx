import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import ProjectStatusSlider from '@/components/ProjectStatusSlider';
import { FaArrowLeft, FaEdit, FaEye, FaPlus, FaTimes } from 'react-icons/fa';

interface Project {
  id: string;
  title: string;
  client: string;
  serviceClass: 'commercial' | 'residential';
  serviceType: string;
  currentStatus: number;
  statusLabels: string[];
  showStatusBar: boolean;
  createdDate: string;
  lastUpdated: string;
  adminNotes?: string;
}

export default function AdminProjects() {
  const router = useRouter();
  const [admin, setAdmin] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');
  const [serviceClassFilter, setServiceClassFilter] = useState<string>('all');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProjectForDetails, setSelectedProjectForDetails] = useState<Project | null>(null);
  const [newProjectData, setNewProjectData] = useState({
    title: '',
    client: '',
    serviceClass: 'commercial' as 'commercial' | 'residential',
    serviceType: 'snow-ice-removal',
    statusLabels: ['Quote Request', 'Quote Response', 'Scheduled Review', 'Started Service', 'Service Complete'],
    showStatusBar: true
  });

  useEffect(() => {
    checkAdminAuth();
    loadProjects();
  }, []);

  const checkAdminAuth = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/portal/admin/login');
      return;
    }

    try {
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAdmin(data.admin);
      } else {
        router.push('/portal/admin/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/portal/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = () => {
    // Mock project data
    const mockProjects: Project[] = [
      {
        id: '1',
        title: 'Commercial Snow Removal - Office Complex',
        client: 'ABC Corporation',
        serviceClass: 'commercial',
        serviceType: 'snow-ice-removal',
        currentStatus: 3,
        statusLabels: ['Quote Request', 'Quote Response', 'Contract Signed', 'Service Active', 'Service Complete'],
        showStatusBar: false, // Long-term contract
        createdDate: '2024-01-15',
        lastUpdated: '2024-01-20',
        adminNotes: 'Priority client - requires weekly updates'
      },
      {
        id: '2',
        title: 'Residential Landscaping Project',
        client: 'John Smith',
        serviceClass: 'residential',
        serviceType: 'landscaping',
        currentStatus: 2,
        statusLabels: ['Quote Request', 'Quote Response', 'Scheduled Review', 'Service Phase 1', 'Service Phase 2', 'Service Complete'],
        showStatusBar: true,
        createdDate: '2024-01-10',
        lastUpdated: '2024-01-18',
        adminNotes: 'Client requested specific plant varieties'
      },
      {
        id: '3',
        title: 'Commercial Concrete Repair',
        client: 'XYZ Industries',
        serviceClass: 'commercial',
        serviceType: 'concrete-asphalt',
        currentStatus: 1,
        statusLabels: ['Quote Request', 'Quote Response', 'Scheduled Review', 'Started Service', 'Service Complete'],
        showStatusBar: true,
        createdDate: '2024-01-12',
        lastUpdated: '2024-01-16',
        adminNotes: 'Requires special equipment - coordinate with team lead'
      }
    ];
    setProjects(mockProjects);
  };

  const handleStatusChange = (projectId: string, newStatus: number, photos?: File[], notes?: string, adminNotes?: string) => {
    setProjects(prev => prev.map(project => 
      project.id === projectId 
        ? { ...project, currentStatus: newStatus, lastUpdated: new Date().toISOString().split('T')[0], adminNotes }
        : project
    ));

    // Here you would typically send the update to your backend
    console.log('Status updated:', { projectId, newStatus, photos, notes, adminNotes });
  };

  const getServiceClassBadge = (serviceClass: string) => {
    const colors = {
      commercial: 'bg-blue-100 text-blue-800',
      residential: 'bg-green-100 text-green-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[serviceClass as keyof typeof colors]}`}>
        {serviceClass.charAt(0).toUpperCase() + serviceClass.slice(1)}
      </span>
    );
  };

  const filteredProjects = projects.filter(project => {
    const matchesServiceType = serviceTypeFilter === 'all' || project.serviceType === serviceTypeFilter;
    const matchesServiceClass = serviceClassFilter === 'all' || project.serviceClass === serviceClassFilter;
    return matchesServiceType && matchesServiceClass;
  });

  const handleNewProject = () => {
    setShowNewProjectModal(true);
  };

  const handleCreateProject = () => {
    const newProject: Project = {
      id: (projects.length + 1).toString(),
      title: newProjectData.title,
      client: newProjectData.client,
      serviceClass: newProjectData.serviceClass,
      serviceType: newProjectData.serviceType,
      currentStatus: 0,
      statusLabels: newProjectData.statusLabels,
      showStatusBar: newProjectData.showStatusBar,
      createdDate: new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString().split('T')[0]
    };

    setProjects(prev => [...prev, newProject]);
    setShowNewProjectModal(false);
    setNewProjectData({
      title: '',
      client: '',
      serviceClass: 'commercial',
      serviceType: 'snow-ice-removal',
      statusLabels: ['Quote Request', 'Quote Response', 'Scheduled Review', 'Started Service', 'Service Complete'],
      showStatusBar: true
    });
  };

  const handleCancelNewProject = () => {
    setShowNewProjectModal(false);
    setNewProjectData({
      title: '',
      client: '',
      serviceClass: 'commercial',
      serviceType: 'snow-ice-removal',
      statusLabels: ['Quote Request', 'Quote Response', 'Scheduled Review', 'Started Service', 'Service Complete'],
      showStatusBar: true
    });
  };

  const handleViewDetails = (project: Project) => {
    setSelectedProjectForDetails(project);
    setShowDetailsModal(true);
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedProjectForDetails(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Project Management - Admin Portal | VSR Construction</title>
        <meta name="description" content="Manage projects and status updates" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-100">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Link
                href="/portal/admin/dashboard"
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <FaArrowLeft />
                <span>Back to Dashboard</span>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Project Management</h1>
            </div>
            <button
              onClick={handleNewProject}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <FaPlus />
              <span>New Project</span>
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center space-x-2">
                <label htmlFor="serviceClass" className="text-sm font-medium text-gray-700">
                  Service Class:
                </label>
                <select
                  id="serviceClass"
                  value={serviceClassFilter}
                  onChange={(e) => setServiceClassFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                >
                  <option value="all">All Classes</option>
                  <option value="commercial">Commercial</option>
                  <option value="residential">Residential</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <label htmlFor="serviceType" className="text-sm font-medium text-gray-700">
                  Service Type:
                </label>
                <select
                  id="serviceType"
                  value={serviceTypeFilter}
                  onChange={(e) => setServiceTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                >
                  <option value="all">All Types</option>
                  <option value="snow-ice-removal">Snow & Ice Removal</option>
                  <option value="landscaping">Landscaping</option>
                  <option value="concrete-asphalt">Concrete & Asphalt</option>
                  <option value="demolition">Demolition</option>
                  <option value="painting">Painting</option>
                  <option value="general-construction">General Construction</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>Showing {filteredProjects.length} of {projects.length} projects</span>
              </div>
            </div>
          </div>

          {/* Projects List */}
          <div className="space-y-6">
            {filteredProjects.map((project) => (
              <div key={project.id} className="bg-white rounded-lg shadow-md">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{project.title}</h3>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-sm text-gray-600">Client: {project.client}</span>
                        {getServiceClassBadge(project.serviceClass)}
                        <span className="text-sm text-gray-500">Last updated: {project.lastUpdated}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedProject(selectedProject?.id === project.id ? null : project)}
                        className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        <FaEdit />
                        <span>Manage Status</span>
                      </button>
                      <button 
                        onClick={() => handleViewDetails(project)}
                        className="flex items-center space-x-1 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                      >
                        <FaEye />
                        <span>View Details</span>
                      </button>
                    </div>
                  </div>

                  {/* Project Status Slider */}
                  {selectedProject?.id === project.id && (
                    <div className="border-t pt-4">
                      <ProjectStatusSlider
                        projectId={project.id}
                        currentStatus={project.currentStatus}
                        statusLabels={project.statusLabels}
                        showStatusBar={project.showStatusBar}
                        adminNotes={project.adminNotes}
                        onStatusChange={(newStatus, photos, notes, adminNotes) => 
                          handleStatusChange(project.id, newStatus, photos, notes, adminNotes)
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Help Text */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Project Status Management</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use the slider to update project status for clients</li>
              <li>• Long-term contracts (like snow removal) don't show progress bars</li>
              <li>• Add photos and notes when updating status</li>
              <li>• Status labels are customizable per project type</li>
            </ul>
          </div>
        </div>

        {/* Project Details Modal */}
        {showDetailsModal && selectedProjectForDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Project Details</h2>
                <button
                  onClick={handleCloseDetailsModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Title
                    </label>
                    <p className="text-gray-900">{selectedProjectForDetails.title}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client
                    </label>
                    <p className="text-gray-900">{selectedProjectForDetails.client}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Class
                    </label>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedProjectForDetails.serviceClass === 'commercial' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {selectedProjectForDetails.serviceClass.charAt(0).toUpperCase() + selectedProjectForDetails.serviceClass.slice(1)}
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Type
                    </label>
                    <p className="text-gray-900">
                      {selectedProjectForDetails.serviceType.split('-').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Status
                    </label>
                    <p className="text-gray-900">
                      {selectedProjectForDetails.statusLabels[selectedProjectForDetails.currentStatus]}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Progress
                    </label>
                    <p className="text-gray-900">
                      {selectedProjectForDetails.showStatusBar 
                        ? `${Math.round(((selectedProjectForDetails.currentStatus + 1) / selectedProjectForDetails.statusLabels.length) * 100)}%`
                        : 'Long-term contract'
                      }
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Created Date
                    </label>
                    <p className="text-gray-900">{selectedProjectForDetails.createdDate}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Updated
                    </label>
                    <p className="text-gray-900">{selectedProjectForDetails.lastUpdated}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Timeline
                  </label>
                  <div className="space-y-2">
                    {selectedProjectForDetails.statusLabels.map((label, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full ${
                          index <= selectedProjectForDetails.currentStatus
                            ? 'bg-green-500'
                            : 'bg-gray-300'
                        }`}></div>
                        <span className={`text-sm ${
                          index <= selectedProjectForDetails.currentStatus
                            ? 'text-green-700 font-medium'
                            : 'text-gray-500'
                        }`}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={handleCloseDetailsModal}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* New Project Modal */}
        {showNewProjectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Project</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Title
                  </label>
                  <input
                    type="text"
                    value={newProjectData.title}
                    onChange={(e) => setNewProjectData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                    placeholder="Enter project title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={newProjectData.client}
                    onChange={(e) => setNewProjectData(prev => ({ ...prev, client: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                    placeholder="Enter client name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Class
                  </label>
                  <select
                    value={newProjectData.serviceClass}
                    onChange={(e) => setNewProjectData(prev => ({ ...prev, serviceClass: e.target.value as 'commercial' | 'residential' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                  >
                    <option value="commercial">Commercial</option>
                    <option value="residential">Residential</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Type
                  </label>
                  <select
                    value={newProjectData.serviceType}
                    onChange={(e) => setNewProjectData(prev => ({ ...prev, serviceType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                  >
                    <option value="snow-ice-removal">Snow & Ice Removal</option>
                    <option value="landscaping">Landscaping</option>
                    <option value="concrete-asphalt">Concrete & Asphalt</option>
                    <option value="demolition">Demolition</option>
                    <option value="painting">Painting</option>
                    <option value="general-construction">General Construction</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newProjectData.showStatusBar}
                      onChange={(e) => setNewProjectData(prev => ({ ...prev, showStatusBar: e.target.checked }))}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">Show progress bar for this project</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={handleCancelNewProject}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectData.title || !newProjectData.client}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Project
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}