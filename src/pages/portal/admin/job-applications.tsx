import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { 
  FaTrashAlt, 
  FaEye, 
  FaCheck, 
  FaTimes, 
  FaUserTie,
  FaSearch,
  FaFilter,
  FaSort,
  FaUser
} from 'react-icons/fa';

interface JobApplication {
  id: string;
  name: string;
  email: string;
  phone: string;
  experience: string;
  resumeFilename?: string;
  status: 'pending' | 'reviewing' | 'interviewed' | 'hired' | 'declined';
  submittedAt: Date;
  reviewedAt?: Date;
  assignedTo?: string;
  adminNotes?: string;
  submittedBy?: string;
  updatedBy?: string;
  updatedAt?: Date;
}

export default function JobApplicationsManagement() {
  const router = useRouter();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('submittedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewingApplication, setViewingApplication] = useState<JobApplication | null>(null);
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);

  useEffect(() => {
    checkAdminAuth();
    loadApplications();
  }, []);

  const checkAdminAuth = async () => {
    try {
      const response = await fetch('/api/admin/dashboard', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentAdmin(data.admin);
      } else {
        router.push('/portal/admin/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/portal/admin/login');
    }
  };

  const loadApplications = async () => {
    try {
      const response = await fetch('/api/admin/job-applications', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setApplications(data.data.jobApplications.map((app: any) => ({
          ...app,
          submittedAt: new Date(app.submittedAt),
          reviewedAt: app.reviewedAt ? new Date(app.reviewedAt) : null,
          updatedAt: app.updatedAt ? new Date(app.updatedAt) : null
        })));
      } else {
        console.error('Failed to load job applications');
      }
    } catch (error) {
      console.error('Error loading job applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (applicationId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/job-applications?id=${applicationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          status: newStatus,
          updatedBy: currentAdmin?.email || 'Unknown Admin'
        }),
      });

      if (response.ok) {
        loadApplications();
      } else {
        console.error('Failed to update application status');
      }
    } catch (error) {
      console.error('Error updating application status:', error);
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedApplications.length === 0) {
      alert('Please select applications first');
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to change ${selectedApplications.length} application(s) to ${newStatus}?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch('/api/admin/job-applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          applicationIds: selectedApplications,
          bulkStatus: newStatus,
          updatedBy: currentAdmin?.email || 'Unknown Admin'
        }),
      });

      if (response.ok) {
        setSelectedApplications([]);
        loadApplications();
      } else {
        console.error('Failed to bulk update applications');
      }
    } catch (error) {
      console.error('Error bulk updating applications:', error);
    }
  };

  const handleDeleteApplication = async (applicationId: string) => {
    const confirmed = confirm('Are you sure you want to delete this job application? This action cannot be undone.');
    
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/job-applications?id=${applicationId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        loadApplications();
      } else {
        console.error('Failed to delete application');
      }
    } catch (error) {
      console.error('Error deleting application:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'reviewing': return 'bg-blue-100 text-blue-800';
      case 'interviewed': return 'bg-purple-100 text-purple-800';
      case 'hired': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredApplications = applications
    .filter(app => {
      const matchesSearch = searchTerm === '' || 
        app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const aValue = a[sortBy as keyof JobApplication];
      const bValue = b[sortBy as keyof JobApplication];
      
      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading job applications...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Job Applications Management | VSR Admin</title>
        <meta name="description" content="Manage job applications" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <FaUserTie className="h-8 w-8 text-blue-500 mr-3" />
              Job Applications Management
            </h1>
            <p className="text-gray-600 mt-2">Manage and review job applications</p>
          </div>

          {/* Controls */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search applications..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="relative">
                <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 w-full appearance-none"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="interviewed">Interviewed</option>
                  <option value="hired">Hired</option>
                  <option value="declined">Declined</option>
                </select>
              </div>

              <div className="relative">
                <FaSort className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 w-full appearance-none"
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field);
                    setSortOrder(order as 'asc' | 'desc');
                  }}
                >
                  <option value="submittedAt-desc">Newest First</option>
                  <option value="submittedAt-asc">Oldest First</option>
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                  <option value="status-asc">Status A-Z</option>
                </select>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedApplications.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4 p-4 bg-blue-50 rounded-lg">
                <span className="text-sm text-blue-700 mr-4">
                  {selectedApplications.length} selected
                </span>
                <button
                  onClick={() => handleBulkStatusChange('reviewing')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  Mark as Reviewing
                </button>
                <button
                  onClick={() => handleBulkStatusChange('interviewed')}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  Mark as Interviewed
                </button>
                <button
                  onClick={() => handleBulkStatusChange('hired')}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  Mark as Hired
                </button>
                <button
                  onClick={() => handleBulkStatusChange('declined')}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  Mark as Declined
                </button>
              </div>
            )}
          </div>

          {/* Applications Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedApplications(filteredApplications.map(app => app.id));
                          } else {
                            setSelectedApplications([]);
                          }
                        }}
                        checked={selectedApplications.length === filteredApplications.length && filteredApplications.length > 0}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Applicant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Applied
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredApplications.map((application) => (
                    <tr key={application.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedApplications.includes(application.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedApplications([...selectedApplications, application.id]);
                            } else {
                              setSelectedApplications(selectedApplications.filter(id => id !== application.id));
                            }
                          }}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <FaUser className="h-5 w-5 text-gray-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{application.name}</div>
                            {application.resumeFilename && (
                              <div className="text-sm text-gray-500">Resume: {application.resumeFilename}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{application.email}</div>
                        <div className="text-sm text-gray-500">{application.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={application.status}
                          onChange={(e) => handleStatusChange(application.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded-full border-0 ${getStatusColor(application.status)} cursor-pointer`}
                        >
                          <option value="pending">Pending</option>
                          <option value="reviewing">Reviewing</option>
                          <option value="interviewed">Interviewed</option>
                          <option value="hired">Hired</option>
                          <option value="declined">Declined</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {application.submittedAt.toLocaleDateString()}
                        <br />
                        <span className="text-xs text-gray-400">
                          {application.submittedAt.toLocaleTimeString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setViewingApplication(application)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="View Details"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => handleDeleteApplication(application.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Delete"
                          >
                            <FaTrashAlt />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredApplications.length === 0 && (
              <div className="text-center py-12">
                <FaUserTie className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No job applications found</p>
                <p className="text-gray-400">Applications will appear here when submitted through the website.</p>
              </div>
            )}
          </div>
        </div>

        {/* Application Detail Modal */}
        {viewingApplication && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Application Details</h3>
                  <button
                    onClick={() => setViewingApplication(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FaTimes />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingApplication.name}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingApplication.email}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingApplication.phone}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Experience</label>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{viewingApplication.experience}</p>
                  </div>
                  
                  {viewingApplication.resumeFilename && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Resume</label>
                      <p className="mt-1 text-sm text-gray-900">{viewingApplication.resumeFilename}</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getStatusColor(viewingApplication.status)}`}>
                      {viewingApplication.status}
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Applied</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {viewingApplication.submittedAt.toLocaleString()}
                    </p>
                  </div>
                  
                  {viewingApplication.adminNotes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Admin Notes</label>
                      <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{viewingApplication.adminNotes}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end mt-6 space-x-3">
                  <button
                    onClick={() => setViewingApplication(null)}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}