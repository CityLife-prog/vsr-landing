import { useEffect, useState } from 'react';
import { FaCog, FaTools, FaExclamationTriangle } from 'react-icons/fa';

interface MaintenanceConfig {
  enabled: boolean;
  message: string;
  enabledAt: string;
  enabledBy: string;
}

export default function MaintenanceMode() {
  const [maintenanceConfig, setMaintenanceConfig] = useState<MaintenanceConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkMaintenanceStatus();
    
    // Check every 30 seconds
    const interval = setInterval(checkMaintenanceStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const checkMaintenanceStatus = async () => {
    try {
      const response = await fetch('/api/maintenance-status');
      if (response.ok) {
        const data = await response.json();
        setMaintenanceConfig(data.maintenance);
      } else {
        setMaintenanceConfig(null);
      }
    } catch (error) {
      console.error('Failed to check maintenance status:', error);
      setMaintenanceConfig(null);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <FaCog className="animate-spin mx-auto text-4xl mb-4" />
          <p>Checking system status...</p>
        </div>
      </div>
    );
  }

  if (!maintenanceConfig) {
    return null; // No maintenance mode
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="relative">
            <FaTools className="text-6xl text-yellow-500 mx-auto mb-4" />
            <FaExclamationTriangle className="text-2xl text-red-500 absolute -top-2 -right-2" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-4">
          System Maintenance
        </h1>
        
        <p className="text-gray-300 mb-6">
          {maintenanceConfig.message}
        </p>
        
        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <div className="text-sm text-gray-400">
            <p><strong>Maintenance started:</strong></p>
            <p>{new Date(maintenanceConfig.enabledAt).toLocaleString()}</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={checkMaintenanceStatus}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
          >
            <FaCog className="inline mr-2" />
            Check Status
          </button>
          
          <p className="text-xs text-gray-500">
            This page will automatically refresh when maintenance is complete.
          </p>
        </div>
      </div>
    </div>
  );
}