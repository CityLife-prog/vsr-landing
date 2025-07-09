/**
 * Employee Projects Component
 * Interface for managing service data entries and project records
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaArrowLeft,
  FaSave,
  FaTimes,
  FaClipboardList
} from 'react-icons/fa';

// Service Type Legend (A-U)
const SERVICE_TYPE_LEGEND = {
  'A': 'Snow Plowing - Parking Lots',
  'B': 'Snow Plowing - Driveways',
  'C': 'Snow Plowing - Sidewalks',
  'D': 'Ice Control - Rock Salt',
  'E': 'Ice Control - Liquid Deicer',
  'F': 'Ice Control - Ice Melt',
  'G': 'Ice Control - Sand/Salt Mix',
  'H': 'Snow Removal - Loading',
  'I': 'Snow Removal - Hauling',
  'J': 'Snow Removal - Disposal',
  'K': 'Sidewalk Clearing - Shovel',
  'L': 'Sidewalk Clearing - Blower',
  'M': 'Roof Snow Removal',
  'N': 'Ice Dam Prevention',
  'O': 'Emergency Services',
  'P': 'Equipment Maintenance',
  'Q': 'Site Inspection',
  'R': 'Weather Monitoring',
  'S': 'Site Preparation',
  'T': 'Cleanup Services',
  'U': 'Other Services'
};

const WORKER_TYPES = [
  'Plow Operator',
  'Loader Operator', 
  'Sidewalk Crew',
  'Hand Crew',
  'Equipment Operator',
  'Site Supervisor',
  'Salt Truck Driver',
  'Snow Blower Operator'
];

interface ServiceEntry {
  id: string;
  serviceData: string;
  propertyCode: string;
  locationDescription: string;
  serviceType: string;
  timeIn: string;
  timeOut: string;
  workers: WorkerEntry[];
  contractRate: number;
  totalPayable: number;
  iceMeltBags: number;
  deicerGallons: number;
  iceSlicerTons: number;
  totalHours: number;
  createdAt: Date;
  updatedAt: Date;
}

interface WorkerEntry {
  id: string;
  type: string;
  count: number;
  hourlyRate?: number;
}

const EmployeeProjects: React.FC = () => {
  const router = useRouter();
  const [serviceEntries, setServiceEntries] = useState<ServiceEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ServiceEntry | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    serviceData: '',
    propertyCode: '',
    locationDescription: '',
    serviceType: '',
    timeIn: '',
    timeOut: '',
    contractRate: 0,
    iceMeltBags: 0,
    deicerGallons: 0,
    iceSlicerTons: 0
  });

  const [workers, setWorkers] = useState<WorkerEntry[]>([
    { id: '1', type: '', count: 1, hourlyRate: 0 }
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const newEntry = router.query.new === 'true';
    if (newEntry) {
      setShowForm(true);
    }
    loadServiceEntries();
  }, [router.query]);

  const loadServiceEntries = () => {
    // Mock data - would normally fetch from API
    const mockEntries: ServiceEntry[] = [
      {
        id: '1',
        serviceData: 'Morning snow clearing',
        propertyCode: 'PROP001',
        locationDescription: 'Main parking lot and entrance',
        serviceType: 'A',
        timeIn: '06:00',
        timeOut: '08:30',
        workers: [
          { id: '1', type: 'Plow Operator', count: 2, hourlyRate: 25 },
          { id: '2', type: 'Hand Crew', count: 1, hourlyRate: 18 }
        ],
        contractRate: 150,
        totalPayable: 375,
        iceMeltBags: 5,
        deicerGallons: 20,
        iceSlicerTons: 0.5,
        totalHours: 2.5,
        createdAt: new Date('2024-01-15T06:00:00'),
        updatedAt: new Date('2024-01-15T08:30:00')
      }
    ];
    setServiceEntries(mockEntries);
  };

  const calculateTotalHours = (timeIn: string, timeOut: string): number => {
    if (!timeIn || !timeOut) return 0;
    
    const [inHour, inMin] = timeIn.split(':').map(Number);
    const [outHour, outMin] = timeOut.split(':').map(Number);
    
    const inMinutes = inHour * 60 + inMin;
    const outMinutes = outHour * 60 + outMin;
    
    return Math.max(0, (outMinutes - inMinutes) / 60);
  };

  const calculateTotalPayable = (): number => {
    const hours = calculateTotalHours(formData.timeIn, formData.timeOut);
    const workerCosts = workers.reduce((total, worker) => {
      return total + (worker.count * (worker.hourlyRate || 0) * hours);
    }, 0);
    
    return formData.contractRate + workerCosts;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.serviceData.trim()) {
      newErrors.serviceData = 'Service data is required';
    }
    if (!formData.propertyCode.trim()) {
      newErrors.propertyCode = 'Property code is required';
    }
    if (!formData.locationDescription.trim()) {
      newErrors.locationDescription = 'Location description is required';
    }
    if (!formData.serviceType) {
      newErrors.serviceType = 'Service type is required';
    }
    if (!formData.timeIn) {
      newErrors.timeIn = 'Time in is required';
    }
    if (!formData.timeOut) {
      newErrors.timeOut = 'Time out is required';
    }
    if (formData.contractRate < 0) {
      newErrors.contractRate = 'Contract rate must be positive';
    }

    // Validate workers
    workers.forEach((worker, index) => {
      if (!worker.type) {
        newErrors[`worker_${index}_type`] = 'Worker type is required';
      }
      if (worker.count <= 0) {
        newErrors[`worker_${index}_count`] = 'Worker count must be positive';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const totalHours = calculateTotalHours(formData.timeIn, formData.timeOut);
    const totalPayable = calculateTotalPayable();

    const newEntry: ServiceEntry = {
      id: editingEntry?.id || Date.now().toString(),
      ...formData,
      workers: [...workers],
      totalHours,
      totalPayable,
      createdAt: editingEntry?.createdAt || new Date(),
      updatedAt: new Date()
    };

    if (editingEntry) {
      setServiceEntries(prev => 
        prev.map(entry => entry.id === editingEntry.id ? newEntry : entry)
      );
    } else {
      setServiceEntries(prev => [newEntry, ...prev]);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      serviceData: '',
      propertyCode: '',
      locationDescription: '',
      serviceType: '',
      timeIn: '',
      timeOut: '',
      contractRate: 0,
      iceMeltBags: 0,
      deicerGallons: 0,
      iceSlicerTons: 0
    });
    setWorkers([{ id: '1', type: '', count: 1, hourlyRate: 0 }]);
    setEditingEntry(null);
    setShowForm(false);
    setErrors({});
  };

  const addWorker = () => {
    setWorkers(prev => [
      ...prev,
      { 
        id: Date.now().toString(), 
        type: '', 
        count: 1, 
        hourlyRate: 0 
      }
    ]);
  };

  const updateWorker = (id: string, field: keyof WorkerEntry, value: string | number) => {
    setWorkers(prev => 
      prev.map(worker => 
        worker.id === id ? { ...worker, [field]: value } : worker
      )
    );
  };

  const removeWorker = (id: string) => {
    if (workers.length > 1) {
      setWorkers(prev => prev.filter(worker => worker.id !== id));
    }
  };

  const editEntry = (entry: ServiceEntry) => {
    setFormData({
      serviceData: entry.serviceData,
      propertyCode: entry.propertyCode,
      locationDescription: entry.locationDescription,
      serviceType: entry.serviceType,
      timeIn: entry.timeIn,
      timeOut: entry.timeOut,
      contractRate: entry.contractRate,
      iceMeltBags: entry.iceMeltBags,
      deicerGallons: entry.deicerGallons,
      iceSlicerTons: entry.iceSlicerTons
    });
    setWorkers([...entry.workers]);
    setEditingEntry(entry);
    setShowForm(true);
  };

  const deleteEntry = (id: string) => {
    if (confirm('Are you sure you want to delete this service entry?')) {
      setServiceEntries(prev => prev.filter(entry => entry.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link 
                href="/employee/dashboard"
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <FaArrowLeft />
                <span>Back to Dashboard</span>
              </Link>
              <h1 className="text-xl font-bold text-gray-900">Service Data Management</h1>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <FaPlus />
              <span>New Service Entry</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!showForm ? (
          <>
            {/* Service Entries List */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Recent Service Entries</h2>
              </div>
              
              {serviceEntries.length === 0 ? (
                <div className="text-center py-12">
                  <FaClipboardList className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No service entries</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating your first service entry.</p>
                  <div className="mt-6">
                    <button
                      onClick={() => setShowForm(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <FaPlus className="mr-2" />
                      New Service Entry
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Service Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Property
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Workers
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {serviceEntries.map((entry) => (
                        <tr key={entry.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {entry.serviceData}
                              </div>
                              <div className="text-sm text-gray-500">
                                Type: {entry.serviceType} - {SERVICE_TYPE_LEGEND[entry.serviceType as keyof typeof SERVICE_TYPE_LEGEND]}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{entry.propertyCode}</div>
                            <div className="text-sm text-gray-500">{entry.locationDescription}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {entry.timeIn} - {entry.timeOut}
                            </div>
                            <div className="text-sm text-gray-500">
                              {entry.totalHours}h total
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {entry.workers.reduce((sum, w) => sum + w.count, 0)} workers
                            </div>
                            <div className="text-sm text-gray-500">
                              {entry.workers.map(w => `${w.count} ${w.type}`).join(', ')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              ${entry.totalPayable.toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-500">
                              Contract: ${entry.contractRate}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => editEntry(entry)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                <FaEdit />
                              </button>
                              <button
                                onClick={() => deleteEntry(entry.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Service Entry Form */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium text-gray-900">
                    {editingEntry ? 'Edit Service Entry' : 'New Service Entry'}
                  </h2>
                  <button
                    onClick={resetForm}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Service Data *
                    </label>
                    <input
                      type="text"
                      value={formData.serviceData}
                      onChange={(e) => setFormData(prev => ({ ...prev, serviceData: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.serviceData ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Brief description of service performed"
                    />
                    {errors.serviceData && (
                      <p className="mt-1 text-sm text-red-600">{errors.serviceData}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Property Code *
                    </label>
                    <input
                      type="text"
                      value={formData.propertyCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, propertyCode: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.propertyCode ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., PROP001"
                    />
                    {errors.propertyCode && (
                      <p className="mt-1 text-sm text-red-600">{errors.propertyCode}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brief Description of Location *
                  </label>
                  <textarea
                    value={formData.locationDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, locationDescription: e.target.value }))}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.locationDescription ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Detailed description of the service location"
                  />
                  {errors.locationDescription && (
                    <p className="mt-1 text-sm text-red-600">{errors.locationDescription}</p>
                  )}
                </div>

                {/* Service Type with Legend */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Type of Service (A-U) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowLegend(!showLegend)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {showLegend ? 'Hide' : 'Show'} Legend
                    </button>
                  </div>
                  <select
                    value={formData.serviceType}
                    onChange={(e) => setFormData(prev => ({ ...prev, serviceType: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.serviceType ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Service Type</option>
                    {Object.entries(SERVICE_TYPE_LEGEND).map(([code, description]) => (
                      <option key={code} value={code}>
                        {code} - {description}
                      </option>
                    ))}
                  </select>
                  {errors.serviceType && (
                    <p className="mt-1 text-sm text-red-600">{errors.serviceType}</p>
                  )}

                  {showLegend && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">Service Type Legend</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {Object.entries(SERVICE_TYPE_LEGEND).map(([code, description]) => (
                          <div key={code} className="text-sm">
                            <span className="font-medium">{code}:</span> {description}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Time Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time In *
                    </label>
                    <input
                      type="time"
                      value={formData.timeIn}
                      onChange={(e) => setFormData(prev => ({ ...prev, timeIn: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.timeIn ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.timeIn && (
                      <p className="mt-1 text-sm text-red-600">{errors.timeIn}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time Out *
                    </label>
                    <input
                      type="time"
                      value={formData.timeOut}
                      onChange={(e) => setFormData(prev => ({ ...prev, timeOut: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.timeOut ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.timeOut && (
                      <p className="mt-1 text-sm text-red-600">{errors.timeOut}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Hours
                    </label>
                    <input
                      type="number"
                      value={calculateTotalHours(formData.timeIn, formData.timeOut).toFixed(2)}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>
                </div>

                {/* Workers Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Workers</h3>
                    <button
                      type="button"
                      onClick={addWorker}
                      className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                    >
                      <FaPlus />
                      <span>Add Worker Type</span>
                    </button>
                  </div>

                  {workers.map((worker, index) => (
                    <div key={worker.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 border border-gray-200 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Worker Type *
                        </label>
                        <select
                          value={worker.type}
                          onChange={(e) => updateWorker(worker.id, 'type', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`worker_${index}_type`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select Type</option>
                          {WORKER_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                        {errors[`worker_${index}_type`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`worker_${index}_type`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Number of Workers *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={worker.count}
                          onChange={(e) => updateWorker(worker.id, 'count', parseInt(e.target.value))}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`worker_${index}_count`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors[`worker_${index}_count`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`worker_${index}_count`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Hourly Rate ($)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={worker.hourlyRate || 0}
                          onChange={(e) => updateWorker(worker.id, 'hourlyRate', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex items-end">
                        {workers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeWorker(worker.id)}
                            className="w-full px-3 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Financial Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contract Rate ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.contractRate}
                      onChange={(e) => setFormData(prev => ({ ...prev, contractRate: parseFloat(e.target.value) }))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.contractRate ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.contractRate && (
                      <p className="mt-1 text-sm text-red-600">{errors.contractRate}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Payable ($)
                    </label>
                    <input
                      type="number"
                      value={calculateTotalPayable().toFixed(2)}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>
                </div>

                {/* Materials Used */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Materials Used</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bags of Ice Melt Used
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.iceMeltBags}
                        onChange={(e) => setFormData(prev => ({ ...prev, iceMeltBags: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gallons of Deicer Used
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={formData.deicerGallons}
                        onChange={(e) => setFormData(prev => ({ ...prev, deicerGallons: parseFloat(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tons of Ice Slicer
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.iceSlicerTons}
                        onChange={(e) => setFormData(prev => ({ ...prev, iceSlicerTons: parseFloat(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <FaSave />
                    <span>{editingEntry ? 'Update Entry' : 'Save Entry'}</span>
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EmployeeProjects;