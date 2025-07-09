/**
 * Client Training Dashboard Component
 * Interactive training progress tracker and resource center
 */

import React, { useState } from 'react';

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  duration: string;
  completed: boolean;
  videoUrl?: string;
  resources: string[];
  quiz?: Quiz;
}

interface Quiz {
  questions: Array<{
    question: string;
    options: string[];
    correctAnswer: number;
  }>;
}

interface TrainingProgress {
  overallProgress: number;
  modulesCompleted: number;
  totalModules: number;
  currentStreak: number;
  timeSpent: number;
  certificationsEarned: string[];
}

const ClientTrainingDashboard: React.FC = () => {
  const [progress] = useState<TrainingProgress>({
    overallProgress: 0,
    modulesCompleted: 0,
    totalModules: 8,
    currentStreak: 0,
    timeSpent: 0,
    certificationsEarned: []
  });


  const trainingModules: TrainingModule[] = [
    {
      id: 'navigation',
      title: 'Website Navigation Mastery',
      description: 'Learn to navigate all sections of your VSR website efficiently',
      duration: '15 minutes',
      completed: false,
      videoUrl: '/training/navigation-tutorial.mp4',
      resources: [
        'Quick Navigation Guide PDF',
        'Website Map Infographic',
        'Mobile Navigation Tips'
      ],
      quiz: {
        questions: [
          {
            question: 'How do you access the quote request form?',
            options: [
              'From the homepage hero section',
              'Through the navigation menu',
              'On every service page',
              'All of the above'
            ],
            correctAnswer: 3
          },
          {
            question: 'Where can customers view your past projects?',
            options: [
              'Projects page',
              'About page',
              'Service pages',
              'Contact page'
            ],
            correctAnswer: 0
          }
        ]
      }
    },
    {
      id: 'lead-management',
      title: 'Lead Management Excellence',
      description: 'Master the art of converting website visitors into customers',
      duration: '25 minutes',
      completed: false,
      videoUrl: '/training/lead-management.mp4',
      resources: [
        'Response Time Best Practices',
        'Email Templates Collection',
        'Lead Scoring Guide'
      ],
      quiz: {
        questions: [
          {
            question: 'What is the ideal response time for quote requests?',
            options: [
              'Within 24 hours',
              'Within 4 hours',
              'Within 2 hours',
              'Within 1 hour'
            ],
            correctAnswer: 2
          }
        ]
      }
    },
    {
      id: 'service-optimization',
      title: 'Service Page Optimization',
      description: 'Optimize your service descriptions for maximum conversion',
      duration: '20 minutes',
      completed: false,
      resources: [
        'Service Description Templates',
        'Photo Guidelines',
        'SEO Optimization Tips'
      ]
    },
    {
      id: 'customer-communication',
      title: 'Customer Communication',
      description: 'Professional communication strategies that convert',
      duration: '30 minutes',
      completed: false,
      resources: [
        'Communication Scripts',
        'Follow-up Sequences',
        'Objection Handling Guide'
      ]
    },
    {
      id: 'seasonal-marketing',
      title: 'Seasonal Marketing Strategies',
      description: 'Leverage seasonal demand for maximum business growth',
      duration: '25 minutes',
      completed: false,
      resources: [
        'Seasonal Calendar Template',
        'Marketing Message Library',
        'Campaign Planning Guide'
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics & Performance Tracking',
      description: 'Monitor and improve your website performance',
      duration: '20 minutes',
      completed: false,
      resources: [
        'KPI Dashboard Guide',
        'Monthly Report Template',
        'Goal Setting Worksheet'
      ]
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting & Maintenance',
      description: 'Handle common issues and maintain peak performance',
      duration: '15 minutes',
      completed: false,
      resources: [
        'Common Issues Guide',
        'Emergency Contacts List',
        'Backup Procedures'
      ]
    },
    {
      id: 'advanced-strategies',
      title: 'Advanced Growth Strategies',
      description: 'Take your business to the next level with advanced techniques',
      duration: '35 minutes',
      completed: false,
      resources: [
        'Growth Hacking Guide',
        'Partnership Strategies',
        'Automation Setup'
      ]
    }
  ];

  const [modules] = useState(trainingModules);


  const ModuleCard: React.FC<{ module: TrainingModule }> = ({ module }) => (
    <div 
      className={`training-module ${module.completed ? 'completed' : ''}`}
    >
      <div className="module-header">
        <h3>{module.title}</h3>
        <div className="module-status">
          {module.completed ? (
            <span className="status-completed">✅ Completed</span>
          ) : (
            <span className="status-pending">📚 {module.duration}</span>
          )}
        </div>
      </div>
      
      <p className="module-description">{module.description}</p>
      
      <div className="module-resources">
        <span className="resource-count">
          📄 {module.resources.length} resources
        </span>
        {module.quiz && (
          <span className="quiz-indicator">🧠 Quiz included</span>
        )}
      </div>
      
      <div className="module-actions">
        <button 
          className="btn-start"
          onClick={(e) => {
            e.stopPropagation();
            // Module interaction logic would go here
          }}
        >
          {module.completed ? 'Review' : 'Start Module'}
        </button>
      </div>
    </div>
  );

  const ProgressOverview: React.FC = () => (
    <div className="progress-overview">
      <div className="progress-card">
        <h2>Training Progress</h2>
        <div className="progress-circle">
          <svg viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="8"
              strokeDasharray={`${progress.overallProgress * 2.83} 283`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="progress-text">
            <span className="progress-percent">{progress.overallProgress}%</span>
            <span className="progress-label">Complete</span>
          </div>
        </div>
        
        <div className="progress-stats">
          <div className="stat">
            <span className="stat-value">{progress.modulesCompleted}</span>
            <span className="stat-label">Modules Completed</span>
          </div>
          <div className="stat">
            <span className="stat-value">{progress.currentStreak}</span>
            <span className="stat-label">Day Streak</span>
          </div>
          <div className="stat">
            <span className="stat-value">{Math.round(progress.timeSpent / 60)}</span>
            <span className="stat-label">Hours Trained</span>
          </div>
        </div>
      </div>
      
      <div className="achievements-card">
        <h3>Achievements</h3>
        <div className="achievements">
          <div className={`achievement ${progress.modulesCompleted >= 1 ? 'earned' : ''}`}>
            🚀 Getting Started
          </div>
          <div className={`achievement ${progress.modulesCompleted >= 4 ? 'earned' : ''}`}>
            📈 Halfway Hero
          </div>
          <div className={`achievement ${progress.modulesCompleted >= 8 ? 'earned' : ''}`}>
            🏆 Training Master
          </div>
          <div className={`achievement ${progress.currentStreak >= 7 ? 'earned' : ''}`}>
            🔥 Week Warrior
          </div>
        </div>
      </div>
    </div>
  );

  const QuickActions: React.FC = () => (
    <div className="quick-actions">
      <h3>Quick Actions</h3>
      <div className="action-buttons">
        <button className="action-btn primary">
          📞 Schedule 1-on-1 Session
        </button>
        <button className="action-btn secondary">
          📚 Download All Resources
        </button>
        <button className="action-btn secondary">
          🎯 Take Skills Assessment
        </button>
        <button className="action-btn secondary">
          💬 Ask a Question
        </button>
      </div>
    </div>
  );

  const ResourceLibrary: React.FC = () => (
    <div className="resource-library">
      <h3>Resource Library</h3>
      <div className="resource-categories">
        <div className="resource-category">
          <h4>📋 Checklists</h4>
          <ul>
            <li>Daily Operations Checklist</li>
            <li>Weekly Performance Review</li>
            <li>Seasonal Marketing Calendar</li>
          </ul>
        </div>
        <div className="resource-category">
          <h4>📧 Templates</h4>
          <ul>
            <li>Quote Response Templates</li>
            <li>Follow-up Email Sequences</li>
            <li>Customer Service Scripts</li>
          </ul>
        </div>
        <div className="resource-category">
          <h4>📊 Analytics</h4>
          <ul>
            <li>KPI Dashboard Setup</li>
            <li>Monthly Report Template</li>
            <li>Performance Tracking Guide</li>
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <div className="training-dashboard">
      <header className="dashboard-header">
        <h1>VSR Training Center</h1>
        <p>Master your website and grow your business</p>
      </header>

      <div className="dashboard-content">
        <div className="main-content">
          <ProgressOverview />
          
          <div className="modules-section">
            <h2>Training Modules</h2>
            <div className="modules-grid">
              {modules.map(module => (
                <ModuleCard key={module.id} module={module} />
              ))}
            </div>
          </div>
        </div>

        <div className="sidebar">
          <QuickActions />
          <ResourceLibrary />
        </div>
      </div>

      <style jsx>{`
        .training-dashboard {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .dashboard-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .dashboard-header h1 {
          color: #1f2937;
          margin-bottom: 8px;
        }

        .dashboard-header p {
          color: #6b7280;
          font-size: 18px;
        }

        .dashboard-content {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 30px;
        }

        .progress-overview {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 40px;
        }

        .progress-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .progress-circle {
          position: relative;
          width: 120px;
          height: 120px;
          margin: 20px auto;
        }

        .progress-circle svg {
          width: 100%;
          height: 100%;
        }

        .progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }

        .progress-percent {
          display: block;
          font-size: 24px;
          font-weight: bold;
          color: #3b82f6;
        }

        .progress-label {
          font-size: 12px;
          color: #6b7280;
        }

        .progress-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 20px;
        }

        .stat {
          text-align: center;
        }

        .stat-value {
          display: block;
          font-size: 20px;
          font-weight: bold;
          color: #1f2937;
        }

        .stat-label {
          font-size: 12px;
          color: #6b7280;
        }

        .achievements-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .achievements {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 16px;
        }

        .achievement {
          padding: 12px;
          border-radius: 8px;
          background: #f3f4f6;
          color: #6b7280;
          transition: all 0.2s;
        }

        .achievement.earned {
          background: #dbeafe;
          color: #1d4ed8;
          border: 1px solid #3b82f6;
        }

        .modules-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .training-module {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: all 0.2s;
          border: 2px solid transparent;
        }

        .training-module:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .training-module.completed {
          border-color: #10b981;
          background: #f0fff4;
        }

        .module-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .module-header h3 {
          margin: 0;
          color: #1f2937;
          font-size: 18px;
        }

        .status-completed {
          color: #10b981;
          font-size: 14px;
        }

        .status-pending {
          color: #6b7280;
          font-size: 14px;
        }

        .module-description {
          color: #6b7280;
          margin-bottom: 16px;
          line-height: 1.5;
        }

        .module-resources {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
          font-size: 14px;
          color: #6b7280;
        }

        .btn-start {
          width: 100%;
          padding: 12px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-start:hover {
          background: #2563eb;
        }

        .training-module.completed .btn-start {
          background: #10b981;
        }

        .sidebar {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .quick-actions,
        .resource-library {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 16px;
        }

        .action-btn {
          padding: 12px 16px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .action-btn.primary {
          background: #3b82f6;
          color: white;
        }

        .action-btn.primary:hover {
          background: #2563eb;
        }

        .action-btn.secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .action-btn.secondary:hover {
          background: #e5e7eb;
        }

        .resource-categories {
          margin-top: 16px;
        }

        .resource-category {
          margin-bottom: 20px;
        }

        .resource-category h4 {
          margin: 0 0 8px 0;
          color: #1f2937;
          font-size: 14px;
        }

        .resource-category ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .resource-category li {
          padding: 6px 0;
          color: #6b7280;
          font-size: 14px;
          cursor: pointer;
          transition: color 0.2s;
        }

        .resource-category li:hover {
          color: #3b82f6;
        }

        @media (max-width: 768px) {
          .dashboard-content {
            grid-template-columns: 1fr;
          }
          
          .progress-overview {
            grid-template-columns: 1fr;
          }
          
          .modules-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default ClientTrainingDashboard;