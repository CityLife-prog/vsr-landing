import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { FaSnowflake, FaMapMarkerAlt, FaCalendarAlt, FaTools, FaFileExcel } from 'react-icons/fa';

interface SnowRemovalForm {
  propertyCode: string;
  clientName: string;
  serviceAddress: string;
  zipcode: string;
  serviceType: string;
  priority: string;
  scheduledDate: string;
  estimatedHours: number;
  specialInstructions: string;
  equipmentRequired: string[];
  weatherConditions: string;
  accessNotes: string;
}

export default function SnowRemovalTool() {
  const router = useRouter();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<SnowRemovalForm>({
    propertyCode: '',
    clientName: '',
    serviceAddress: '',
    zipcode: '',
    serviceType: 'snow-removal',
    priority: 'standard',
    scheduledDate: '',
    estimatedHours: 2,
    specialInstructions: '',
    equipmentRequired: [],
    weatherConditions: '',
    accessNotes: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    checkEmployeeAuth();
  }, []);

  const checkEmployeeAuth = async () => {
    const token = localStorage.getItem('employeeToken') || localStorage.getItem('accessToken');
    if (!token) {
      router.push('/portal/employee/login');
      return;
    }

    try {
      const response = await fetch('/api/employee/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEmployee(data.employee);
      } else {
        // Try admin dashboard if employee fails
        const adminResponse = await fetch('/api/admin/dashboard', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (adminResponse.ok) {
          const adminData = await adminResponse.json();
          setEmployee({ ...adminData.user, role: 'admin' });
        } else {
          router.push('/portal/employee/login');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/portal/employee/login');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEquipmentChange = (equipment: string) => {
    setFormData(prev => ({
      ...prev,
      equipmentRequired: prev.equipmentRequired.includes(equipment)
        ? prev.equipmentRequired.filter(e => e !== equipment)
        : [...prev.equipmentRequired, equipment]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem('employeeToken') || localStorage.getItem('accessToken');
      const response = await fetch('/api/snow-removal/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          submittedBy: employee.email,
          submittedAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        setStatusMessage('Snow removal service request submitted successfully!');
        // Reset form
        setFormData({
          propertyCode: '',
          clientName: '',
          serviceAddress: '',
          zipcode: '',
          serviceType: 'snow-removal',
          priority: 'standard',
          scheduledDate: '',
          estimatedHours: 2,
          specialInstructions: '',
          equipmentRequired: [],
          weatherConditions: '',
          accessNotes: ''
        });
      } else {
        setStatusMessage('Failed to submit request. Please try again.');
      }
    } catch (error) {
      console.error('Submit error:', error);
      setStatusMessage('Network error. Please try again.');
    } finally {
      setSubmitting(false);
      setTimeout(() => setStatusMessage(''), 5000);
    }
  };

  const exportToExcel = () => {
    // This will trigger the Excel export functionality
    const csvContent = [
      ['Property Code', 'Client Name', 'Service Address', 'Zipcode', 'Service Type', 'Priority', 'Scheduled Date', 'Estimated Hours', 'Equipment Required', 'Weather Conditions', 'Access Notes', 'Special Instructions'],
      [
        formData.propertyCode,
        formData.clientName,
        formData.serviceAddress,
        formData.zipcode,
        formData.serviceType,
        formData.priority,
        formData.scheduledDate,
        formData.estimatedHours,
        formData.equipmentRequired.join(', '),
        formData.weatherConditions,
        formData.accessNotes,
        formData.specialInstructions
      ]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snow-removal-${formData.propertyCode}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Loading snow removal tool...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Snow Removal Services | VSR Construction</title>
        <meta name="description" content="Snow removal service management tool" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FaSnowflake className="h-8 w-8 text-blue-400" />
                <h1 className="text-3xl font-bold text-white">Snow Removal Services</h1>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={exportToExcel}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <FaFileExcel className="h-4 w-4" />
                  <span>Export to Excel</span>
                </button>
                <button
                  onClick={() => router.back()}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className="mb-6 p-4 rounded-lg bg-blue-600 text-white">
              {statusMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6 space-y-6">
            {/* Property Information */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Property Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Property Code *</label>
                  <input
                    type="text"
                    name="propertyCode"
                    value={formData.propertyCode}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter property code"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Client Name *</label>
                  <input
                    type="text"
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter client name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Service Address *</label>
                  <input
                    type="text"
                    name="serviceAddress"
                    value={formData.serviceAddress}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter service address"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Zipcode *</label>
                  <input
                    type="text"
                    name="zipcode"
                    value={formData.zipcode}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter zipcode"
                    pattern="[0-9]{5}"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Service Details */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Service Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Service Type</label>
                  <select
                    name="serviceType"
                    value={formData.serviceType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="snow-removal">Snow Removal</option>
                    <option value="ice-treatment">Ice Treatment</option>
                    <option value="sidewalk-clearing">Sidewalk Clearing</option>
                    <option value="parking-lot-clearing">Parking Lot Clearing</option>
                    <option value="emergency-response">Emergency Response</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="standard">Standard</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Scheduled Date *</label>
                  <input
                    type="datetime-local"
                    name="scheduledDate"
                    value={formData.scheduledDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Estimated Hours</label>
                  <input
                    type="number"
                    name="estimatedHours"
                    value={formData.estimatedHours}
                    onChange={handleInputChange}
                    min="0.5"
                    step="0.5"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Equipment Required */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Equipment Required</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['Snow Plow', 'Salt Spreader', 'Snow Blower', 'Shovel', 'Ice Melt', 'Tractor', 'Loader', 'Other'].map((equipment) => (
                  <label key={equipment} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.equipmentRequired.includes(equipment)}
                      onChange={() => handleEquipmentChange(equipment)}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-300">{equipment}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Additional Information */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Additional Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Weather Conditions</label>
                  <input
                    type="text"
                    name="weatherConditions"
                    value={formData.weatherConditions}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Current weather conditions"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Access Notes</label>
                  <input
                    type="text"
                    name="accessNotes"
                    value={formData.accessNotes}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Gate codes, key locations, etc."
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Special Instructions</label>
                <textarea
                  name="specialInstructions"
                  value={formData.specialInstructions}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any special instructions or notes for the service team"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit Snow Removal Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}