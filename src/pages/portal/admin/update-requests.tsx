/**
 * Admin Update Requests Management Page
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { 
  FaArrowLeft,
  FaEnvelope, 
  FaPhone, 
  FaFile, 
  FaCheck, 
  FaClock, 
  FaUser,
  FaExclamationTriangle,
  FaCheckCircle,
  FaSpinner,
  FaTimes,
  FaEdit,
  FaEye,
  FaFilter
} from 'react-icons/fa';

interface UpdateRequest {
  id: string;
  contractId: string;
  customerName: string;
  email: string;
  phone: string;
  reasonForContact: string;
  jobDescription: string;
  notes: string;
  files: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'resolved';
  submittedAt: Date;
  completedAt?: Date;
  assignedTo?: string;
  adminNotes?: string;
}

export default function UpdateRequestsPage() {
  const router = useRouter();
  const [updateRequests, setUpdateRequests] = useState<UpdateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<UpdateRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0
  });

  useEffect(() => {
    checkAdminAuth();
    loadUpdateRequests();
  }, [filterStatus]);

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

      if (!response.ok) {
        router.push('/portal/admin/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/portal/admin/login');
    }
  };

  const loadUpdateRequests = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/update-requests?status=${filterStatus}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const requests = data.data.updateRequests.map((req: any) => ({
          ...req,
          submittedAt: new Date(req.submittedAt),
          completedAt: req.completedAt ? new Date(req.completedAt) : undefined
        }));
        setUpdateRequests(requests);
        setSummary(data.data.summary);
      }
    } catch (error) {
      console.error('Failed to load update requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async (requestId: string, notes?: string) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const response = await fetch(`/api/admin/update-requests?id=${requestId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'completed',
          adminNotes: notes
        })
      });

      if (response.ok) {
        await loadUpdateRequests();
        setShowCompleteModal(false);
        setSelectedRequest(null);
        setAdminNotes('');
      }
    } catch (error) {
      console.error('Failed to mark request as complete:', error);
    }
  };

  const handleBulkComplete = async () => {
    if (selectedRequests.length === 0) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const response = await fetch('/api/admin/update-requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requestIds: selectedRequests,
          bulkStatus: 'completed'
        })
      });

      if (response.ok) {
        await loadUpdateRequests();
        setSelectedRequests([]);
      }
    } catch (error) {
      console.error('Failed to bulk complete requests:', error);
    }
  };

  const handleStatusChange = async (requestId: string, newStatus: string) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const response = await fetch(`/api/admin/update-requests?id=${requestId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        await loadUpdateRequests();
      }
    } catch (error) {
      console.error('Failed to update request status:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <FaClock className="text-yellow-500" />;
      case 'in_progress':
        return <FaSpinner className="text-blue-500" />;
      case 'completed':
        return <FaCheckCircle className="text-green-500" />;
      default:
        return <FaExclamationTriangle className="text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };


  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      return 'Just now';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading update requests...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Update Requests | Admin Portal</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center space-x-4 mb-4">
              <Link
                href="/portal/admin/dashboard"
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <FaArrowLeft />
                <span>Back to Admin Portal</span>
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Update Requests Management</h1>
            <p className="text-gray-600 mt-1">Review and manage client update requests</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaEnvelope className="h-6 w-6 text-blue-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total Requests</p>
                  <p className="text-lg font-bold text-gray-900">{summary.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaClock className="h-6 w-6 text-yellow-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Pending</p>
                  <p className="text-lg font-bold text-gray-900">{summary.pending}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaSpinner className="h-6 w-6 text-blue-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">In Progress</p>
                  <p className="text-lg font-bold text-gray-900">{summary.inProgress}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaCheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Completed</p>
                  <p className="text-lg font-bold text-gray-900">{summary.completed}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Actions */}
          <div className="bg-white rounded-lg shadow mb-6 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <FaFilter className="h-4 w-4 text-gray-400 mr-2" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 sm:mt-0 flex space-x-2">
                {selectedRequests.length > 0 && (
                  <button
                    onClick={handleBulkComplete}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
                  >
                    <FaCheck className="mr-2" />
                    Mark {selectedRequests.length} as Complete
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Update Requests Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRequests(updateRequests.map(req => req.id));
                            } else {
                              setSelectedRequests([]);
                            }
                          }}
                          checked={selectedRequests.length === updateRequests.length && updateRequests.length > 0}
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Request Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {updateRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedRequests.includes(request.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRequests([...selectedRequests, request.id]);
                              } else {
                                setSelectedRequests(selectedRequests.filter(id => id !== request.id));
                              }
                            }}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {request.contractId} - {request.reasonForContact.replace(/-/g, ' ')}
                            </div>
                            <div className="text-gray-500 truncate max-w-xs">
                              {request.jobDescription}
                            </div>
                            {request.files.length > 0 && (
                              <div className="flex items-center mt-1">
                                <FaFile className="h-3 w-3 text-gray-400 mr-1" />
                                <span className="text-xs text-gray-500">{request.files.length} files</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{request.customerName}</div>
                            <div className="text-gray-500 flex items-center">
                              <FaEnvelope className="h-3 w-3 mr-1" />
                              {request.email}
                            </div>
                            <div className="text-gray-500 flex items-center">
                              <FaPhone className="h-3 w-3 mr-1" />
                              {request.phone}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(request.status)}
                            <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                              {request.status.replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>{formatDate(request.submittedAt)}</div>
                          <div className="text-xs text-gray-400">{formatTimeAgo(request.submittedAt)}</div>
                          {request.assignedTo && (
                            <div className="flex items-center mt-1">
                              <FaUser className="h-3 w-3 text-gray-400 mr-1" />
                              <span className="text-xs">{request.assignedTo}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {request.status !== 'completed' && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setAdminNotes(request.adminNotes || '');
                                    setShowCompleteModal(true);
                                  }}
                                  className="text-green-600 hover:text-green-900"
                                  title="Mark as Complete"
                                >
                                  <FaCheck />
                                </button>
                                <select
                                  value={request.status}
                                  onChange={(e) => handleStatusChange(request.id, e.target.value)}
                                  className="text-xs border border-gray-300 rounded px-2 py-1"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="completed">Completed</option>
                                </select>
                              </>
                            )}
                            <button
                              onClick={() => {
                                // View details functionality
                                alert(`View details for request ${request.id}`);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Details"
                            >
                              <FaEye />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {updateRequests.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No update requests found for the selected filter.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Complete Modal */}
          {showCompleteModal && selectedRequest && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Complete Request
                    </h3>
                    <button
                      onClick={() => setShowCompleteModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <FaTimes />
                    </button>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">
                      Request: {selectedRequest.contractId} - {selectedRequest.customerName}
                    </p>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Notes (optional)
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="Add any notes about the completion..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowCompleteModal(false)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleMarkComplete(selectedRequest.id, adminNotes)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Mark Complete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}