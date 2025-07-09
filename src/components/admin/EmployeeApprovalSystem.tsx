/**
 * Enhanced Employee Approval System Component
 * Advanced approval workflow with bulk actions and detailed review
 */

import React, { useState, useEffect } from 'react';
import { 
  FaCheck, 
  FaTimes, 
  FaEye, 
  FaEnvelope, 
  FaCalendarAlt,
  FaUser,
  FaBuilding,
  FaBriefcase,
  FaClipboardCheck,
  FaExclamationCircle,
  FaSort,
  FaSearch,
  FaUserClock,
  FaInfoCircle
} from 'react-icons/fa';
import { EmployeeAccount } from '../../types/admin';

interface EmployeeApprovalSystemProps {
  employees: EmployeeAccount[];
  onApprove: (employeeId: string, notes?: string) => void;
  onReject: (employeeId: string, reason: string) => void;
  onBulkApprove: (employeeIds: string[], notes?: string) => void;
  onBulkReject: (employeeIds: string[], reason: string) => void;
  loading?: boolean;
}

interface ApprovalModal {
  type: 'approve' | 'reject' | 'bulk_approve' | 'bulk_reject';
  employeeIds: string[];
  employees: EmployeeAccount[];
  show: boolean;
}

const EmployeeApprovalSystem: React.FC<EmployeeApprovalSystemProps> = ({
  employees,
  onApprove,
  onReject,
  onBulkApprove,
  onBulkReject,
  loading = false
}) => {
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeAccount[]>(employees);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'firstName' | 'department' | 'position'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeAccount | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [approvalModal, setApprovalModal] = useState<ApprovalModal>({
    type: 'approve',
    employeeIds: [],
    employees: [],
    show: false
  });

  // Get unique departments for filter
  const departments = Array.from(new Set(employees.map(emp => emp.department)));

  useEffect(() => {
    let filtered = employees;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(emp => 
        emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.position.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply department filter
    if (filterDepartment !== 'all') {
      filtered = filtered.filter(emp => emp.department === filterDepartment);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'firstName':
          aValue = a.firstName.toLowerCase();
          bValue = b.firstName.toLowerCase();
          break;
        case 'department':
          aValue = a.department.toLowerCase();
          bValue = b.department.toLowerCase();
          break;
        case 'position':
          aValue = a.position.toLowerCase();
          bValue = b.position.toLowerCase();
          break;
        default:
          aValue = a.createdAt;
          bValue = b.createdAt;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredEmployees(filtered);
  }, [employees, searchTerm, filterDepartment, sortBy, sortOrder]);

  const handleSelectEmployee = (employeeId: string) => {
    setSelectedEmployees(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(employeeId)) {
        newSelected.delete(employeeId);
      } else {
        newSelected.add(employeeId);
      }
      return newSelected;
    });
  };

  const handleSelectAll = () => {
    if (selectedEmployees.size === filteredEmployees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(filteredEmployees.map(emp => emp.id)));
    }
  };

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const openApprovalModal = (type: ApprovalModal['type'], employeeIds: string[]) => {
    const employeesToProcess = employees.filter(emp => employeeIds.includes(emp.id));
    setApprovalModal({
      type,
      employeeIds,
      employees: employeesToProcess,
      show: true
    });
  };

  const closeApprovalModal = () => {
    setApprovalModal({ ...approvalModal, show: false });
  };

  const handleApprovalSubmit = (notes?: string, reason?: string) => {
    const { type, employeeIds } = approvalModal;
    
    switch (type) {
      case 'approve':
        onApprove(employeeIds[0], notes);
        break;
      case 'reject':
        onReject(employeeIds[0], reason || '');
        break;
      case 'bulk_approve':
        onBulkApprove(employeeIds, notes);
        break;
      case 'bulk_reject':
        onBulkReject(employeeIds, reason || '');
        break;
    }
    
    closeApprovalModal();
    setSelectedEmployees(new Set());
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'email_verified': return 'bg-green-100 text-green-800';
      case 'unverified': return 'bg-red-100 text-red-800';
      case 'admin_approved': return 'bg-blue-100 text-blue-800';
      case 'fully_verified': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <FaUserClock className="h-6 w-6 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Pending Approval</p>
              <p className="text-xl font-semibold text-gray-900">{filteredEmployees.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <FaBuilding className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Departments</p>
              <p className="text-xl font-semibold text-gray-900">{departments.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <FaClipboardCheck className="h-6 w-6 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Email Verified</p>
              <p className="text-xl font-semibold text-gray-900">
                {filteredEmployees.filter(emp => emp.verificationStatus === 'email_verified').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <FaExclamationCircle className="h-6 w-6 text-red-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Unverified</p>
              <p className="text-xl font-semibold text-gray-900">
                {filteredEmployees.filter(emp => emp.verificationStatus === 'unverified').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {selectedEmployees.size > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {selectedEmployees.size} selected
              </span>
              <button
                onClick={() => openApprovalModal('bulk_approve', Array.from(selectedEmployees))}
                className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              >
                <FaCheck />
                <span>Approve All</span>
              </button>
              <button
                onClick={() => openApprovalModal('bulk_reject', Array.from(selectedEmployees))}
                className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                <FaTimes />
                <span>Reject All</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading employees...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedEmployees.size === filteredEmployees.length && filteredEmployees.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('firstName')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Employee</span>
                      <FaSort className="h-3 w-3" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('department')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Department</span>
                      <FaSort className="h-3 w-3" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('position')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Position</span>
                      <FaSort className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Verification
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Applied</span>
                      <FaSort className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.has(employee.id)}
                        onChange={() => handleSelectEmployee(employee.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <FaUser className="h-5 w-5 text-gray-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {employee.firstName} {employee.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{employee.email}</div>
                          <div className="text-xs text-gray-400">ID: {employee.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{employee.department}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{employee.position}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getVerificationStatusColor(employee.verificationStatus)}`}>
                        {employee.verificationStatus.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{getTimeAgo(employee.createdAt)}</div>
                      <div className="text-xs text-gray-400">{formatDate(employee.createdAt)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setShowDetailModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => openApprovalModal('approve', [employee.id])}
                          className="text-green-600 hover:text-green-900"
                          title="Approve"
                        >
                          <FaCheck />
                        </button>
                        <button
                          onClick={() => openApprovalModal('reject', [employee.id])}
                          className="text-red-600 hover:text-red-900"
                          title="Reject"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredEmployees.length === 0 && !loading && (
          <div className="text-center py-12">
            <FaUserClock className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No pending employees</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterDepartment !== 'all'
                ? 'No employees match your current filters.'
                : 'All employee applications have been processed.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-90vh overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-lg font-medium text-gray-900">Employee Details</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Personal Information</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <FaUser className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {selectedEmployee.firstName} {selectedEmployee.lastName}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FaEnvelope className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{selectedEmployee.email}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FaInfoCircle className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">ID: {selectedEmployee.employeeId}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Employment Details</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <FaBuilding className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{selectedEmployee.department}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FaBriefcase className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{selectedEmployee.position}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FaCalendarAlt className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          Hire Date: {formatDate(selectedEmployee.hireDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Status Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Verification Status:</span>
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getVerificationStatusColor(selectedEmployee.verificationStatus)}`}>
                        {selectedEmployee.verificationStatus.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Applied:</span>
                      <span className="ml-2 text-sm text-gray-900">{formatDate(selectedEmployee.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {selectedEmployee.notes && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Notes</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedEmployee.notes}</p>
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    openApprovalModal('reject', [selectedEmployee.id]);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <FaTimes />
                  <span>Reject</span>
                </button>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    openApprovalModal('approve', [selectedEmployee.id]);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <FaCheck />
                  <span>Approve</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {approvalModal.show && (
        <ApprovalModal
          type={approvalModal.type}
          employees={approvalModal.employees}
          onSubmit={handleApprovalSubmit}
          onClose={closeApprovalModal}
        />
      )}
    </div>
  );
};

// Approval Modal Component
const ApprovalModal: React.FC<{
  type: 'approve' | 'reject' | 'bulk_approve' | 'bulk_reject';
  employees: EmployeeAccount[];
  onSubmit: (notes?: string, reason?: string) => void;
  onClose: () => void;
}> = ({ type, employees, onSubmit, onClose }) => {
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');

  const isReject = type === 'reject' || type === 'bulk_reject';
  const isBulk = type === 'bulk_approve' || type === 'bulk_reject';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {isReject ? 'Reject' : 'Approve'} Employee{isBulk ? 's' : ''}
          </h3>

          {isBulk && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                You are about to {isReject ? 'reject' : 'approve'} {employees.length} employee{employees.length > 1 ? 's' : ''}:
              </p>
              <div className="max-h-32 overflow-y-auto bg-gray-50 p-3 rounded-lg">
                {employees.map(emp => (
                  <div key={emp.id} className="text-sm text-gray-700">
                    {emp.firstName} {emp.lastName} - {emp.department}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isReject ? 'Rejection Reason' : 'Approval Notes'} {isReject ? '(Required)' : '(Optional)'}
            </label>
            <textarea
              value={isReject ? reason : notes}
              onChange={(e) => isReject ? setReason(e.target.value) : setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={isReject ? 'Please provide a reason for rejection...' : 'Optional notes for approval...'}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={() => onSubmit(notes, reason)}
              disabled={isReject && !reason.trim()}
              className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                isReject 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isReject ? 'Reject' : 'Approve'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeApprovalSystem;