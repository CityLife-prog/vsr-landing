/**
 * Admin Quote Requests Management Page
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { 
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
  FaFilter,
  FaDollarSign,
  FaArrowLeft,
  FaTrash,
  FaUserCheck,
  FaBan,
  FaRedoAlt
} from 'react-icons/fa';

interface QuoteRequest {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  serviceClass: string;
  service: string;
  details: string;
  photoFiles: string[];
  status: 'pending' | 'review' | 'quoted' | 'accepted' | 'declined';
  submittedAt: Date;
  reviewedAt?: Date;
  quotedAt?: Date;
  quotedAmount?: number;
  estimatedValue?: number;
  assignedTo?: string;
  adminNotes?: string;
  submittedBy?: string;
  updatedBy?: string;
  updatedAt?: Date;
}

export default function QuoteRequestsPage() {
  const router = useRouter();
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [hideDeclined, setHideDeclined] = useState<boolean>(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<QuoteRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [quotedAmount, setQuotedAmount] = useState('');
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    review: 0,
    quoted: 0,
    accepted: 0,
    declined: 0
  });
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsRequest, setDetailsRequest] = useState<QuoteRequest | null>(null);
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);

  useEffect(() => {
    checkAdminAuth();
    loadQuoteRequests();
    loadCurrentAdmin();
    
    // Set up polling for real-time updates
    const interval = setInterval(() => {
      loadQuoteRequests();
    }, 30000); // Poll every 30 seconds
    
    return () => clearInterval(interval);
  }, [filterStatus]);

  const checkAdminAuth = async () => {
    try {
      const response = await fetch('/api/admin/dashboard', {
        credentials: 'include' // Use cookies instead of tokens
      });

      if (!response.ok) {
        router.push('/portal/admin/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/portal/admin/login');
    }
  };

  const loadCurrentAdmin = async () => {
    try {
      const response = await fetch('/api/admin/dashboard', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentAdmin(data.admin);
      }
    } catch (error) {
      console.error('Failed to load admin info:', error);
    }
  };

  const loadQuoteRequests = async () => {
    try {
      setLoading(true);
      
      // For open/closed filters, fetch all requests. For individual status filters, pass the status to API
      let url = `/api/admin/quote-requests`;
      if (filterStatus !== 'all' && filterStatus !== 'open' && filterStatus !== 'closed') {
        url += `?status=${filterStatus}`;
      } else {
        url += '?status=all';
      }
      
      if (hideDeclined) {
        url += url.includes('?') ? '&hideDeclined=true' : '?hideDeclined=true';
      }
      
      const response = await fetch(url, {
        credentials: 'include' // Use cookies instead of tokens
      });

      if (response.ok) {
        const data = await response.json();
        let requests = data.data.quoteRequests.map((req: any) => ({
          ...req,
          submittedAt: new Date(req.submittedAt),
          reviewedAt: req.reviewedAt ? new Date(req.reviewedAt) : undefined,
          quotedAt: req.quotedAt ? new Date(req.quotedAt) : undefined,
          updatedAt: req.updatedAt ? new Date(req.updatedAt) : undefined,
          // Map old under_review to new review status
          status: req.status === 'under_review' ? 'review' : req.status
        }));

        // Apply frontend filtering for open/closed
        if (filterStatus === 'open') {
          // Open: Pending, Review, Quoted
          requests = requests.filter((req: any) => 
            req.status === 'pending' || req.status === 'review' || req.status === 'quoted'
          );
        } else if (filterStatus === 'closed') {
          // Closed: Accepted, Declined
          requests = requests.filter((req: any) => 
            req.status === 'accepted' || req.status === 'declined'
          );
        }
        // For individual status filters and 'all', the API already handles the filtering

        setQuoteRequests(requests);
        setSummary(data.data.summary);
      }
    } catch (error) {
      console.error('Failed to load quote requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendQuote = async (requestId: string, amount: number, notes?: string) => {
    try {
      const response = await fetch(`/api/admin/quote-requests?id=${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          status: 'quoted',
          adminNotes: notes,
          quotedAmount: amount,
          updatedBy: currentAdmin?.email || 'Admin'
        })
      });

      if (response.ok) {
        await loadQuoteRequests();
        setShowQuoteModal(false);
        setSelectedRequest(null);
        setAdminNotes('');
        setQuotedAmount('');
      }
    } catch (error) {
      console.error('Failed to send quote:', error);
    }
  };

  const handleBulkAction = async (status: string) => {
    if (selectedRequests.length === 0) return;

    try {
      const response = await fetch('/api/admin/quote-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          requestIds: selectedRequests,
          bulkStatus: status,
          updatedBy: currentAdmin?.email || 'Admin'
        })
      });

      if (response.ok) {
        await loadQuoteRequests();
        setSelectedRequests([]);
      }
    } catch (error) {
      console.error('Failed to bulk update requests:', error);
    }
  };

  const handleStatusChange = async (requestId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/quote-requests?id=${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          status: newStatus,
          updatedBy: currentAdmin?.email || 'Admin'
        })
      });

      if (response.ok) {
        await loadQuoteRequests();
      }
    } catch (error) {
      console.error('Failed to update request status:', error);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this quote request? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/quote-requests?id=${requestId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        await loadQuoteRequests();
      } else {
        alert('Failed to delete quote request');
      }
    } catch (error) {
      console.error('Failed to delete request:', error);
      alert('Error deleting quote request');
    }
  };

  const handleQuickAction = async (requestId: string, action: string) => {
    let newStatus = '';
    switch (action) {
      case 'pending':
        newStatus = 'pending';
        break;
      case 'review':
        newStatus = 'review';
        break;
      case 'quoted':
        newStatus = 'quoted';
        break;
      case 'accept':
        newStatus = 'accepted';
        break;
      case 'accepted':
        newStatus = 'accepted';
        break;
      case 'decline':
        newStatus = 'declined';
        break;
      case 'declined':
        newStatus = 'declined';
        break;
      default:
        return;
    }

    try {
      const response = await fetch(`/api/admin/quote-requests?id=${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          status: newStatus,
          updatedBy: currentAdmin?.email || 'Admin'
        })
      });

      if (response.ok) {
        await loadQuoteRequests();
      }
    } catch (error) {
      console.error('Failed to update request status:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedRequests.length} quote request(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      for (const requestId of selectedRequests) {
        await fetch(`/api/admin/quote-requests?id=${requestId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
      }
      
      await loadQuoteRequests();
      setSelectedRequests([]);
    } catch (error) {
      console.error('Failed to delete requests:', error);
      alert('Error deleting quote requests');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <FaClock className="text-yellow-500 text-lg" title="Pending" />;
      case 'review':
        return <FaSpinner className="text-blue-500 text-lg" title="Under Review" />;
      case 'quoted':
        return <FaDollarSign className="text-green-500 text-lg" title="Quoted" />;
      case 'accepted':
        return <FaCheckCircle className="text-green-600 text-lg" title="Accepted" />;
      case 'declined':
        return <FaTimes className="text-red-500 text-lg" title="Declined" />;
      default:
        return <FaExclamationTriangle className="text-gray-500 text-lg" title="Unknown" />;
    }
  };

  const viewRequestDetails = (request: QuoteRequest) => {
    setDetailsRequest(request);
    setShowDetailsModal(true);
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
          <p className="text-gray-600">Loading quote requests...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Quote Requests | Admin Portal</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Quote Requests Management</h1>
                <p className="text-gray-600 mt-1">Review and process customer quote requests</p>
              </div>
              <button
                onClick={() => router.push('/portal/admin/dashboard')}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaArrowLeft className="mr-2" />
                Back to Admin Portal
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaEnvelope className="h-6 w-6 text-blue-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total</p>
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
                  <p className="text-sm font-medium text-gray-500">Review</p>
                  <p className="text-lg font-bold text-gray-900">{summary.review}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaDollarSign className="h-6 w-6 text-green-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Quoted</p>
                  <p className="text-lg font-bold text-gray-900">{summary.quoted}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaCheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Accepted</p>
                  <p className="text-lg font-bold text-gray-900">{summary.accepted}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaTimes className="h-6 w-6 text-red-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Declined</p>
                  <p className="text-lg font-bold text-gray-900">{summary.declined}</p>
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
                    <option value="open">Open (Pending, Review, Quoted)</option>
                    <option value="closed">Closed (Accepted, Declined)</option>
                    <option value="pending">Pending</option>
                    <option value="review">Review</option>
                    <option value="quoted">Quoted</option>
                    <option value="accepted">Accepted</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>
                
                {selectedRequests.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleBulkAction('pending')}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded-md text-sm font-medium flex items-center"
                    >
                      <FaClock className="mr-1" />
                      Pending {selectedRequests.length}
                    </button>
                    <button
                      onClick={() => handleBulkAction('review')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm font-medium flex items-center"
                    >
                      <FaUserCheck className="mr-1" />
                      Review {selectedRequests.length}
                    </button>
                    <button
                      onClick={() => handleBulkAction('quoted')}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm font-medium flex items-center"
                    >
                      <FaDollarSign className="mr-1" />
                      Quoted {selectedRequests.length}
                    </button>
                    <button
                      onClick={() => handleBulkAction('accepted')}
                      className="bg-green-800 hover:bg-green-900 text-white px-3 py-1 rounded-md text-sm font-medium flex items-center"
                    >
                      <FaCheck className="mr-1" />
                      Accepted {selectedRequests.length}
                    </button>
                    <button
                      onClick={() => handleBulkAction('declined')}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm font-medium flex items-center"
                    >
                      <FaBan className="mr-1" />
                      Declined {selectedRequests.length}
                    </button>
                    <button
                      onClick={() => handleBulkDelete()}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm font-medium flex items-center"
                    >
                      <FaTrash className="mr-1" />
                      Delete {selectedRequests.length}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quote Requests Table */}
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
                              setSelectedRequests(quoteRequests.map(req => req.id));
                            } else {
                              setSelectedRequests([]);
                            }
                          }}
                          checked={selectedRequests.length === quoteRequests.length && quoteRequests.length > 0}
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
                        Submitted By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Updated
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {quoteRequests.map((request) => (
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
                        <td className="px-3 py-4 w-48">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900 text-xs">
                              {request.serviceClass} - {request.service.replace(/-/g, ' ')}
                            </div>
                            <div className="text-gray-500 truncate text-xs" title={request.details}>
                              {request.details.length > 50 ? request.details.substring(0, 50) + '...' : request.details}
                            </div>
                            {request.photoFiles.length > 0 && (
                              <div className="flex items-center mt-1">
                                <FaFile className="h-3 w-3 text-gray-400 mr-1" />
                                <span className="text-xs text-gray-500">{request.photoFiles.length} files</span>
                              </div>
                            )}
                            {request.quotedAmount && (
                              <div className="flex items-center mt-1">
                                <FaDollarSign className="h-3 w-3 text-green-500 mr-1" />
                                <span className="text-xs text-green-600">${request.quotedAmount.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{request.fullName}</div>
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
                          <div className="flex items-center justify-center">
                            {getStatusIcon(request.status)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="font-medium text-gray-900">{request.fullName}</div>
                          <div className="text-xs text-gray-400">{formatDate(request.submittedAt)}</div>
                          <div className="text-xs text-gray-400">{formatTimeAgo(request.submittedAt)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="font-medium text-gray-900">{request.updatedBy || 'System'}</div>
                          <div className="text-xs text-gray-400">
                            {request.updatedAt ? formatDate(request.updatedAt) : formatDate(request.submittedAt)}
                          </div>
                          {request.assignedTo && (
                            <div className="text-xs text-blue-600">
                              Assigned: {request.assignedTo}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2 items-center">
                            {/* Show only the correct status icon based on current status */}
                            {request.status === 'pending' && (
                              <button
                                onClick={() => handleQuickAction(request.id, 'review')}
                                className="text-blue-600 hover:text-blue-900 p-1"
                                title="Mark as Review"
                              >
                                <FaUserCheck className="h-4 w-4" />
                              </button>
                            )}

                            {request.status === 'review' && (
                              <button
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setAdminNotes(request.adminNotes || '');
                                  setQuotedAmount(request.quotedAmount?.toString() || '');
                                  setShowQuoteModal(true);
                                }}
                                className="text-green-600 hover:text-green-900 p-1"
                                title="Send Quote"
                              >
                                <FaDollarSign className="h-4 w-4" />
                              </button>
                            )}

                            {request.status === 'quoted' && (
                              <button
                                onClick={() => handleQuickAction(request.id, 'accept')}
                                className="text-green-600 hover:text-green-900 p-1"
                                title="Accept Quote"
                              >
                                <FaCheck className="h-4 w-4" />
                              </button>
                            )}

                            {(request.status === 'accepted' || request.status === 'declined') && (
                              <button
                                onClick={() => handleQuickAction(request.id, 'review')}
                                className="text-yellow-600 hover:text-yellow-900 p-1"
                                title="Reopen for Review"
                              >
                                <FaRedoAlt className="h-4 w-4" />
                              </button>
                            )}

                            {/* Status dropdown */}
                            <select
                              value={request.status}
                              onChange={(e) => handleStatusChange(request.id, e.target.value)}
                              className="text-xs border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="pending">Pending</option>
                              <option value="review">Review</option>
                              <option value="quoted">Quoted</option>
                              <option value="accepted">Accepted</option>
                              <option value="declined">Declined</option>
                            </select>

                            {/* View Details button - always show */}
                            <button
                              onClick={() => viewRequestDetails(request)}
                              className="text-blue-600 hover:text-blue-900 p-1"
                              title="View Details"
                            >
                              <FaEye className="h-4 w-4" />
                            </button>

                            {/* Delete button - available to all admin users */}
                            <button
                              onClick={() => handleDeleteRequest(request.id)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Delete Request"
                            >
                              <FaTrash className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {quoteRequests.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No quote requests found for the selected filter.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Send Quote Modal */}
          {showQuoteModal && selectedRequest && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Send Quote
                    </h3>
                    <button
                      onClick={() => setShowQuoteModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <FaTimes />
                    </button>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">
                      Customer: {selectedRequest.fullName}
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      Service: {selectedRequest.service.replace(/-/g, ' ')}
                    </p>
                    
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quote Amount ($)
                    </label>
                    <input
                      type="number"
                      value={quotedAmount}
                      onChange={(e) => setQuotedAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter quote amount"
                      min="0"
                      step="0.01"
                    />
                    
                    <label className="block text-sm font-medium text-gray-700 mb-2 mt-4">
                      Admin Notes (optional)
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="Add any notes about the quote..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowQuoteModal(false)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const amount = parseFloat(quotedAmount);
                        if (amount > 0) {
                          handleSendQuote(selectedRequest.id, amount, adminNotes);
                        }
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      disabled={!quotedAmount || parseFloat(quotedAmount) <= 0}
                    >
                      Send Quote
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* View Details Modal */}
          {showDetailsModal && detailsRequest && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Quote Request Details - {detailsRequest.id}
                    </h3>
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <FaTimes />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Customer Information */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3">Customer Information</h4>
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium text-gray-700">Name:</span>
                          <span className="ml-2 text-gray-900">{detailsRequest.fullName}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Email:</span>
                          <span className="ml-2 text-gray-900">{detailsRequest.email}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Phone:</span>
                          <span className="ml-2 text-gray-900">{detailsRequest.phone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Service Information */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3">Service Information</h4>
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium text-gray-700">Service Class:</span>
                          <span className="ml-2 text-gray-900 capitalize">{detailsRequest.serviceClass}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Service Type:</span>
                          <span className="ml-2 text-gray-900">{detailsRequest.service.replace(/-/g, ' ')}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Status:</span>
                          <span className="ml-2">{getStatusIcon(detailsRequest.status)}</span>
                          <span className="ml-1 text-gray-900 capitalize">{detailsRequest.status}</span>
                        </div>
                      </div>
                    </div>

                    {/* Project Details */}
                    <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3">Project Details</h4>
                      <p className="text-gray-900 whitespace-pre-wrap">{detailsRequest.details}</p>
                    </div>

                    {/* Files */}
                    {detailsRequest.photoFiles.length > 0 && (
                      <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-3">Attached Files</h4>
                        <div className="flex flex-wrap gap-2">
                          {detailsRequest.photoFiles.map((file, index) => (
                            <div key={index} className="flex items-center bg-white px-3 py-2 rounded border">
                              <FaFile className="text-gray-400 mr-2" />
                              <span className="text-sm text-gray-900">{file}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quote Information */}
                    {detailsRequest.quotedAmount && (
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-3">Quote Information</h4>
                        <div className="space-y-2">
                          <div>
                            <span className="font-medium text-gray-700">Quoted Amount:</span>
                            <span className="ml-2 text-green-600 font-semibold">${detailsRequest.quotedAmount.toLocaleString()}</span>
                          </div>
                          {detailsRequest.quotedAt && (
                            <div>
                              <span className="font-medium text-gray-700">Quoted On:</span>
                              <span className="ml-2 text-gray-900">{formatDate(detailsRequest.quotedAt)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Admin Information */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3">Admin Information</h4>
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium text-gray-700">Submitted:</span>
                          <span className="ml-2 text-gray-900">{formatDate(detailsRequest.submittedAt)}</span>
                        </div>
                        {detailsRequest.reviewedAt && (
                          <div>
                            <span className="font-medium text-gray-700">Reviewed:</span>
                            <span className="ml-2 text-gray-900">{formatDate(detailsRequest.reviewedAt)}</span>
                          </div>
                        )}
                        {detailsRequest.assignedTo && (
                          <div>
                            <span className="font-medium text-gray-700">Assigned To:</span>
                            <span className="ml-2 text-gray-900">{detailsRequest.assignedTo}</span>
                          </div>
                        )}
                        {detailsRequest.submittedBy && (
                          <div>
                            <span className="font-medium text-gray-700">Last Updated By:</span>
                            <span className="ml-2 text-gray-900">{detailsRequest.submittedBy}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Admin Notes */}
                    {detailsRequest.adminNotes && (
                      <div className="md:col-span-2 bg-yellow-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-3">Admin Notes</h4>
                        <p className="text-gray-900 whitespace-pre-wrap">{detailsRequest.adminNotes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end mt-6">
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Close
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