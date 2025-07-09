import React, { useState } from 'react';
import { FaCamera, FaFileAlt, FaEdit, FaCheck, FaTimes } from 'react-icons/fa';

interface ProjectStatusSliderProps {
  projectId: string;
  currentStatus: number;
  statusLabels: string[];
  onStatusChange: (newStatus: number, photos?: File[], notes?: string, adminNotes?: string) => void;
  showStatusBar?: boolean;
  adminNotes?: string;
}

const ProjectStatusSlider: React.FC<ProjectStatusSliderProps> = ({
  projectId,
  currentStatus,
  statusLabels,
  onStatusChange,
  showStatusBar = true,
  adminNotes = ''
}) => {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState('');
  const [adminNotesText, setAdminNotesText] = useState(adminNotes);
  const [photos, setPhotos] = useState<File[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handleSliderChange = (newStatus: number) => {
    setSelectedStatus(newStatus);
    setIsEditing(true);
  };

  const handleSave = () => {
    onStatusChange(selectedStatus, photos, notes, adminNotesText);
    setIsEditing(false);
    setShowUploadModal(false);
    setNotes('');
    setPhotos([]);
  };

  const handleCancel = () => {
    setSelectedStatus(currentStatus);
    setIsEditing(false);
    setShowUploadModal(false);
    setNotes('');
    setAdminNotesText(adminNotes);
    setPhotos([]);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files);
      setPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const getStatusColor = (index: number) => {
    if (index < currentStatus) return 'bg-green-500';
    if (index === currentStatus) return 'bg-blue-500';
    return 'bg-gray-300';
  };

  const getSliderColor = (index: number) => {
    if (index < selectedStatus) return 'bg-green-500';
    if (index === selectedStatus) return 'bg-blue-500';
    return 'bg-gray-300';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Project Status</h3>
        {isEditing && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              <FaCheck className="h-3 w-3" />
              <span>Save</span>
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center space-x-1 px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
            >
              <FaTimes className="h-3 w-3" />
              <span>Cancel</span>
            </button>
          </div>
        )}
      </div>

      {/* Status Labels */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-600 mb-2">
          {statusLabels.map((label, index) => (
            <span key={index} className="text-center max-w-24 truncate" title={label}>
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Status Progress Bar (if enabled) */}
      {showStatusBar && (
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            {statusLabels.map((_, index) => (
              <div
                key={index}
                className={`flex-1 h-2 rounded-full ${getStatusColor(index)}`}
              />
            ))}
          </div>
          <div className="text-sm text-gray-600">
            Current: {statusLabels[currentStatus]} ({Math.round(((currentStatus + 1) / statusLabels.length) * 100)}%)
          </div>
        </div>
      )}

      {/* Admin Slider */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Update Status (Admin Only)
        </label>
        <div className="space-y-4">
          {/* Slider */}
          <div className="relative">
            <input
              type="range"
              min="0"
              max={statusLabels.length - 1}
              value={selectedStatus}
              onChange={(e) => handleSliderChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              {statusLabels.map((_, index) => (
                <span key={index}>•</span>
              ))}
            </div>
          </div>

          {/* Selected Status Display */}
          <div className="text-center">
            <span className="inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
              {statusLabels[selectedStatus]}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {isEditing && (
        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-medium text-gray-900">Update Details</h4>
            <button
              onClick={() => setShowUploadModal(!showUploadModal)}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              <FaCamera className="h-4 w-4" />
              <span>Add Photos & Notes</span>
            </button>
          </div>

          {/* Upload Modal */}
          {showUploadModal && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="space-y-4">
                {/* Photo Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Photos
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  
                  {/* Photo Preview */}
                  {photos.length > 0 && (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {photos.map((photo, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(photo)}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-20 object-cover rounded-md"
                          />
                          <button
                            onClick={() => removePhoto(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add notes about this status update..."
                  />
                </div>

                {/* Admin Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Notes (Internal Only)
                  </label>
                  <textarea
                    value={adminNotesText}
                    onChange={(e) => setAdminNotesText(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-red-50"
                    placeholder="Add internal admin notes (not visible to client)..."
                  />
                  <p className="text-xs text-red-600 mt-1">
                    ⚠️ These notes are for internal use only and will not be visible to the client
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Display Current Admin Notes */}
      {adminNotes && !isEditing && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <h4 className="text-sm font-medium text-red-800 mb-2">Admin Notes (Internal)</h4>
          <p className="text-sm text-red-700">{adminNotes}</p>
        </div>
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
};

export default ProjectStatusSlider;