/**
 * Observability Dashboard - Comprehensive monitoring visualizations
 * Real-time dashboards for metrics, traces, logs, and system health
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { observability, ObservabilityHealth } from './ObservabilityCore';
import { logger } from './Logger';
import { metricsCollector, AggregatedMetric } from './MetricsCollector';
import { distributedTracing, TraceSpan } from './DistributedTracing';
import { resilienceObservability } from './ResilienceIntegration';
import { getResilience, ResilienceMetrics } from '../resilience';

export interface DashboardConfig {
  refreshInterval: number;
  timeRange: {
    start: number;
    end: number;
  };
  autoRefresh: boolean;
  theme: 'light' | 'dark';
}

export interface MetricVisualization {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'gauge' | 'counter' | 'histogram';
  metricName: string;
  tags?: Record<string, string>;
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count';
  timeWindow: number;
}

export interface DashboardTab {
  id: string;
  title: string;
  icon: string;
  component: React.ComponentType<any>;
}

const ObservabilityDashboard: React.FC = () => {
  const [config, setConfig] = useState<DashboardConfig>({
    refreshInterval: 10000, // 10 seconds
    timeRange: {
      start: Date.now() - 3600000, // Last hour
      end: Date.now()
    },
    autoRefresh: true,
    theme: 'light'
  });

  const [activeTab, setActiveTab] = useState('overview');
  const [systemHealth, setSystemHealth] = useState<ObservabilityHealth | null>(null);
  const [resilienceMetrics, setResilienceMetrics] = useState<ResilienceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refresh data
  const refreshData = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const [health, resilience] = await Promise.all([
        observability.getHealthStatus(),
        getResilience().getComprehensiveMetrics()
      ]);

      setSystemHealth(health);
      setResilienceMetrics(resilience);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh dashboard data';
      setError(errorMessage);
      logger.error('Dashboard refresh failed', err as Error, {
        component: 'observability_dashboard'
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // Auto-refresh effect
  useEffect(() => {
    if (config.autoRefresh) {
      const interval = setInterval(refreshData, config.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [config.autoRefresh, config.refreshInterval, refreshData]);

  // Initial load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const tabs: DashboardTab[] = [
    {
      id: 'overview',
      title: 'Overview',
      icon: '📊',
      component: OverviewPanel
    },
    {
      id: 'metrics',
      title: 'Metrics',
      icon: '📈',
      component: MetricsPanel
    },
    {
      id: 'traces',
      title: 'Traces',
      icon: '🔍',
      component: TracesPanel
    },
    {
      id: 'logs',
      title: 'Logs',
      icon: '📝',
      component: LogsPanel
    },
    {
      id: 'resilience',
      title: 'Resilience',
      icon: '🛡️',
      component: ResiliencePanel
    },
    {
      id: 'performance',
      title: 'Performance',
      icon: '⚡',
      component: PerformancePanel
    },
    {
      id: 'alerts',
      title: 'Alerts',
      icon: '🚨',
      component: AlertsPanel
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || OverviewPanel;

  return (
    <div className={`observability-dashboard theme-${config.theme}`}>
      <header className="dashboard-header">
        <div className="header-content">
          <h1>📊 Observability Dashboard</h1>
          <div className="header-controls">
            <SystemHealthIndicator health={systemHealth} />
            <TimeRangeSelector config={config} onChange={setConfig} />
            <RefreshControls 
              config={config} 
              onChange={setConfig} 
              onRefresh={refreshData}
              isLoading={isLoading} 
            />
          </div>
        </div>
        
        <nav className="dashboard-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-title">{tab.title}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="dashboard-content">
        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{error}</span>
            <button onClick={refreshData} className="error-retry">
              Retry
            </button>
          </div>
        )}

        <ActiveComponent
          config={config}
          systemHealth={systemHealth}
          resilienceMetrics={resilienceMetrics}
          onRefresh={refreshData}
          isLoading={isLoading}
        />
      </main>

      <style jsx>{`
        .observability-dashboard {
          min-height: 100vh;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .theme-light {
          --bg-primary: #ffffff;
          --bg-secondary: #f8fafc;
          --bg-tertiary: #f1f5f9;
          --text-primary: #1e293b;
          --text-secondary: #64748b;
          --border: #e2e8f0;
          --success: #10b981;
          --warning: #f59e0b;
          --error: #ef4444;
          --info: #3b82f6;
        }

        .theme-dark {
          --bg-primary: #0f172a;
          --bg-secondary: #1e293b;
          --bg-tertiary: #334155;
          --text-primary: #f8fafc;
          --text-secondary: #94a3b8;
          --border: #475569;
          --success: #10b981;
          --warning: #f59e0b;
          --error: #ef4444;
          --info: #3b82f6;
        }

        .dashboard-header {
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border);
          padding: 0;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
        }

        .header-content h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .header-controls {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .dashboard-tabs {
          display: flex;
          padding: 0 24px;
          gap: 4px;
          border-top: 1px solid var(--border);
        }

        .tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab:hover {
          color: var(--text-primary);
          background: var(--bg-tertiary);
        }

        .tab.active {
          color: var(--info);
          border-bottom-color: var(--info);
        }

        .tab-icon {
          font-size: 16px;
        }

        .tab-title {
          font-size: 14px;
          font-weight: 500;
        }

        .dashboard-content {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .error-icon {
          font-size: 20px;
        }

        .error-message {
          flex: 1;
          color: #dc2626;
          font-weight: 500;
        }

        .error-retry {
          padding: 6px 12px;
          background: #dc2626;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
        }

        .error-retry:hover {
          background: #b91c1c;
        }

        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            gap: 16px;
            align-items: stretch;
          }

          .header-controls {
            justify-content: space-between;
          }

          .dashboard-tabs {
            overflow-x: auto;
            padding: 0 16px;
          }

          .dashboard-content {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
};

// System Health Indicator Component
const SystemHealthIndicator: React.FC<{ health: ObservabilityHealth | null }> = ({ health }) => {
  if (!health) {
    return (
      <div className="health-indicator loading">
        <div className="health-dot"></div>
        <span>Loading...</span>
      </div>
    );
  }

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#10b981';
      case 'degraded': return '#f59e0b';
      case 'unhealthy': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className="health-indicator">
      <div 
        className="health-dot"
        style={{ backgroundColor: getHealthColor(health.status) }}
      ></div>
      <span>System {health.status}</span>
      
      <style jsx>{`
        .health-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: var(--bg-tertiary);
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
        }

        .health-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .health-indicator.loading .health-dot {
          background: #6b7280;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

// Time Range Selector Component
const TimeRangeSelector: React.FC<{
  config: DashboardConfig;
  onChange: (config: DashboardConfig) => void;
}> = ({ config, onChange }) => {
  const timeRanges = [
    { label: '5m', value: 5 * 60 * 1000 },
    { label: '15m', value: 15 * 60 * 1000 },
    { label: '1h', value: 60 * 60 * 1000 },
    { label: '6h', value: 6 * 60 * 60 * 1000 },
    { label: '24h', value: 24 * 60 * 60 * 1000 },
    { label: '7d', value: 7 * 24 * 60 * 60 * 1000 }
  ];

  const currentRange = config.timeRange.end - config.timeRange.start;
  const selectedRange = timeRanges.find(range => range.value === currentRange);

  const handleRangeChange = (value: number) => {
    const end = Date.now();
    const start = end - value;
    onChange({
      ...config,
      timeRange: { start, end }
    });
  };

  return (
    <div className="time-range-selector">
      <label>Time Range:</label>
      <select 
        value={selectedRange?.value || currentRange}
        onChange={(e) => handleRangeChange(Number(e.target.value))}
      >
        {timeRanges.map(range => (
          <option key={range.value} value={range.value}>
            {range.label}
          </option>
        ))}
      </select>
      
      <style jsx>{`
        .time-range-selector {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .time-range-selector label {
          color: var(--text-secondary);
          font-weight: 500;
        }

        .time-range-selector select {
          padding: 6px 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 4px;
          color: var(--text-primary);
          font-size: 14px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

// Refresh Controls Component
const RefreshControls: React.FC<{
  config: DashboardConfig;
  onChange: (config: DashboardConfig) => void;
  onRefresh: () => void;
  isLoading: boolean;
}> = ({ config, onChange, onRefresh, isLoading }) => {
  return (
    <div className="refresh-controls">
      <button
        onClick={onRefresh}
        disabled={isLoading}
        className="refresh-button"
      >
        <span className={`refresh-icon ${isLoading ? 'spinning' : ''}`}>🔄</span>
        Refresh
      </button>
      
      <label className="auto-refresh-toggle">
        <input
          type="checkbox"
          checked={config.autoRefresh}
          onChange={(e) => onChange({
            ...config,
            autoRefresh: e.target.checked
          })}
        />
        Auto-refresh
      </label>
      
      <style jsx>{`
        .refresh-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .refresh-button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: var(--info);
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .refresh-button:hover:not(:disabled) {
          background: #2563eb;
        }

        .refresh-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .refresh-icon {
          font-size: 14px;
          transition: transform 0.2s;
        }

        .refresh-icon.spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .auto-refresh-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .auto-refresh-toggle input {
          margin: 0;
        }
      `}</style>
    </div>
  );
};

// Placeholder components for dashboard panels
const OverviewPanel: React.FC<any> = ({ systemHealth, resilienceMetrics }) => (
  <div className="panel overview-panel">
    <h2>System Overview</h2>
    <div className="overview-grid">
      <div className="overview-card">
        <h3>📊 Observability Health</h3>
        <div className="card-content">
          {systemHealth ? (
            <>
              <div className="metric">
                <span className="metric-label">Status:</span>
                <span className={`metric-value status-${systemHealth.status}`}>
                  {systemHealth.status}
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">Uptime:</span>
                <span className="metric-value">
                  {Math.floor(systemHealth.uptime / 60000)}m
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">Active Spans:</span>
                <span className="metric-value">{systemHealth.activeSpans}</span>
              </div>
            </>
          ) : (
            <div>Loading...</div>
          )}
        </div>
      </div>

      <div className="overview-card">
        <h3>🛡️ Resilience Status</h3>
        <div className="card-content">
          {resilienceMetrics ? (
            <>
              <div className="metric">
                <span className="metric-label">Circuit Breakers:</span>
                <span className="metric-value">
                  {resilienceMetrics.summary.totalCircuitBreakers}
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">Open:</span>
                <span className={`metric-value ${resilienceMetrics.summary.openCircuitBreakers > 0 ? 'error' : 'success'}`}>
                  {resilienceMetrics.summary.openCircuitBreakers}
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">Health:</span>
                <span className={`metric-value status-${resilienceMetrics.summary.overallHealth}`}>
                  {resilienceMetrics.summary.overallHealth}
                </span>
              </div>
            </>
          ) : (
            <div>Loading...</div>
          )}
        </div>
      </div>
    </div>

    <style jsx>{`
      .overview-panel {
        padding: 24px;
      }

      .overview-panel h2 {
        margin: 0 0 24px 0;
        font-size: 24px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .overview-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 24px;
      }

      .overview-card {
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 20px;
      }

      .overview-card h3 {
        margin: 0 0 16px 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .card-content {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .metric {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .metric-label {
        color: var(--text-secondary);
        font-size: 14px;
      }

      .metric-value {
        font-weight: 600;
        font-size: 16px;
      }

      .metric-value.success, .status-healthy {
        color: var(--success);
      }

      .metric-value.error, .status-unhealthy {
        color: var(--error);
      }

      .status-degraded {
        color: var(--warning);
      }
    `}</style>
  </div>
);

// Placeholder implementations for other panels
const MetricsPanel: React.FC<any> = () => <div className="panel">Metrics Panel - Coming Soon</div>;
const TracesPanel: React.FC<any> = () => <div className="panel">Traces Panel - Coming Soon</div>;
const LogsPanel: React.FC<any> = () => <div className="panel">Logs Panel - Coming Soon</div>;
const ResiliencePanel: React.FC<any> = () => <div className="panel">Resilience Panel - Coming Soon</div>;
const PerformancePanel: React.FC<any> = () => <div className="panel">Performance Panel - Coming Soon</div>;
const AlertsPanel: React.FC<any> = () => <div className="panel">Alerts Panel - Coming Soon</div>;

export default ObservabilityDashboard;