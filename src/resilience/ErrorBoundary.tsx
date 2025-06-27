/**
 * Error Boundary System - Resilience Layer
 * React error boundaries with fault tolerance and recovery
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
  lastErrorTime: number;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, errorInfo: ErrorInfo, retry: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  enableRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  isolateFailures?: boolean;
  errorBoundaryId?: string;
  reportErrors?: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeout?: NodeJS.Timeout;
  private readonly errorReporter: ErrorReporter;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
      lastErrorTime: 0
    };

    this.errorReporter = new ErrorReporter();
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = generateErrorId();
    const now = Date.now();

    return {
      hasError: true,
      error,
      errorId,
      lastErrorTime: now
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError, reportErrors = true, errorBoundaryId } = this.props;
    const { errorId } = this.state;

    // Enhanced error info
    const enhancedErrorInfo = {
      ...errorInfo,
      boundaryId: errorBoundaryId,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    };

    // Update state with error info
    this.setState({ errorInfo: enhancedErrorInfo });

    // Report error
    if (reportErrors) {
      this.errorReporter.reportError(error, enhancedErrorInfo, errorId);
    }

    // Call custom error handler
    if (onError) {
      onError(error, enhancedErrorInfo, errorId);
    }

    // Log error for debugging
    console.error(`Error Boundary [${errorBoundaryId || 'default'}]:`, error);
    console.error('Error Info:', enhancedErrorInfo);
  }

  componentWillUnmount(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  handleRetry = (): void => {
    const { maxRetries = 3, retryDelay = 1000 } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      console.warn('Maximum retry attempts reached');
      return;
    }

    // Clear existing timeout
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    // Exponential backoff delay
    const delay = retryDelay * Math.pow(2, retryCount);

    this.retryTimeout = setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: '',
        retryCount: prevState.retryCount + 1,
        lastErrorTime: 0
      }));
    }, delay);
  };

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
      lastErrorTime: 0
    });
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, retryCount } = this.state;
    const { children, fallback, enableRetry = true, maxRetries = 3 } = this.props;

    if (hasError && error && errorInfo) {
      // Custom fallback component
      if (typeof fallback === 'function') {
        return fallback(error, errorInfo, this.handleRetry);
      }

      // Custom fallback element
      if (fallback && React.isValidElement(fallback)) {
        return fallback;
      }

      // Default error UI
      return (
        <DefaultErrorFallback
          error={error}
          errorInfo={errorInfo}
          onRetry={enableRetry && retryCount < maxRetries ? this.handleRetry : undefined}
          onReset={this.handleReset}
          retryCount={retryCount}
          maxRetries={maxRetries}
        />
      );
    }

    return children;
  }
}

interface DefaultErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo;
  onRetry?: () => void;
  onReset: () => void;
  retryCount: number;
  maxRetries: number;
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({
  error,
  errorInfo,
  onRetry,
  onReset,
  retryCount,
  maxRetries
}) => {
  return (
    <div className="error-boundary-fallback">
      <div className="error-boundary-content">
        <div className="error-boundary-icon">⚠️</div>
        <h2 className="error-boundary-title">Something went wrong</h2>
        <p className="error-boundary-message">
          We apologize for the inconvenience. An unexpected error has occurred.
        </p>
        
        <div className="error-boundary-actions">
          {onRetry && (
            <button 
              onClick={onRetry}
              className="error-boundary-retry-btn"
              disabled={retryCount >= maxRetries}
            >
              {retryCount > 0 ? `Retry (${retryCount}/${maxRetries})` : 'Try Again'}
            </button>
          )}
          
          <button 
            onClick={onReset}
            className="error-boundary-reset-btn"
          >
            Reset
          </button>
          
          <button 
            onClick={() => window.location.reload()}
            className="error-boundary-reload-btn"
          >
            Reload Page
          </button>
        </div>

        <details className="error-boundary-details">
          <summary>Error Details</summary>
          <div className="error-boundary-error-info">
            <div className="error-boundary-error-message">
              <strong>Error:</strong> {error.message}
            </div>
            <div className="error-boundary-error-stack">
              <strong>Stack Trace:</strong>
              <pre>{error.stack}</pre>
            </div>
            <div className="error-boundary-component-stack">
              <strong>Component Stack:</strong>
              <pre>{errorInfo.componentStack}</pre>
            </div>
          </div>
        </details>
      </div>

      <style jsx>{`
        .error-boundary-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          padding: 20px;
          background-color: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          margin: 20px;
        }

        .error-boundary-content {
          text-align: center;
          max-width: 600px;
        }

        .error-boundary-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .error-boundary-title {
          color: #dc3545;
          margin-bottom: 16px;
          font-size: 24px;
          font-weight: 600;
        }

        .error-boundary-message {
          color: #6c757d;
          margin-bottom: 24px;
          font-size: 16px;
          line-height: 1.5;
        }

        .error-boundary-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .error-boundary-retry-btn,
        .error-boundary-reset-btn,
        .error-boundary-reload-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .error-boundary-retry-btn {
          background-color: #007bff;
          color: white;
        }

        .error-boundary-retry-btn:hover:not(:disabled) {
          background-color: #0056b3;
        }

        .error-boundary-retry-btn:disabled {
          background-color: #6c757d;
          cursor: not-allowed;
        }

        .error-boundary-reset-btn {
          background-color: #6c757d;
          color: white;
        }

        .error-boundary-reset-btn:hover {
          background-color: #545b62;
        }

        .error-boundary-reload-btn {
          background-color: #28a745;
          color: white;
        }

        .error-boundary-reload-btn:hover {
          background-color: #1e7e34;
        }

        .error-boundary-details {
          text-align: left;
          margin-top: 24px;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          padding: 16px;
          background-color: white;
        }

        .error-boundary-details summary {
          cursor: pointer;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .error-boundary-error-info div {
          margin-bottom: 12px;
        }

        .error-boundary-error-info strong {
          display: block;
          margin-bottom: 4px;
          color: #495057;
        }

        .error-boundary-error-info pre {
          background-color: #f8f9fa;
          padding: 8px;
          border-radius: 4px;
          overflow-x: auto;
          font-size: 12px;
          white-space: pre-wrap;
          word-break: break-word;
        }
      `}</style>
    </div>
  );
};

// Higher-order component for easy error boundary wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Error reporter for centralized error handling
class ErrorReporter {
  private errorQueue: ErrorReport[] = [];
  private isReporting = false;

  reportError(error: Error, errorInfo: any, errorId: string): void {
    const errorReport: ErrorReport = {
      id: errorId,
      message: error.message,
      stack: error.stack || '',
      errorInfo,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    };

    this.errorQueue.push(errorReport);
    this.processErrorQueue();
  }

  private async processErrorQueue(): Promise<void> {
    if (this.isReporting || this.errorQueue.length === 0) {
      return;
    }

    this.isReporting = true;

    try {
      while (this.errorQueue.length > 0) {
        const errorReport = this.errorQueue.shift()!;
        await this.sendErrorReport(errorReport);
      }
    } catch (error) {
      console.error('Failed to send error report:', error);
    } finally {
      this.isReporting = false;
    }
  }

  private async sendErrorReport(errorReport: ErrorReport): Promise<void> {
    try {
      // In a real application, send to error tracking service
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport)
      // });

      console.log('Error Report:', errorReport);
    } catch (error) {
      console.error('Failed to send error report:', error);
      // Could implement retry logic here
    }
  }
}

interface ErrorReport {
  id: string;
  message: string;
  stack: string;
  errorInfo: any;
  timestamp: string;
  userAgent: string;
  url: string;
}

// Utility function to generate unique error IDs
function generateErrorId(): string {
  return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Hook for using error boundaries in functional components
export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo?: any) => {
    // Throw error to be caught by nearest error boundary
    throw error;
  }, []);
}

// Async error boundary for handling Promise rejections
export class AsyncErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
      lastErrorTime: 0
    };
  }

  componentDidMount(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  componentWillUnmount(): void {
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    const error = new Error(event.reason || 'Unhandled Promise Rejection');
    const errorInfo = {
      componentStack: 'Async operation outside component tree',
      promiseRejection: true
    };

    this.setState({
      hasError: true,
      error,
      errorInfo,
      errorId: generateErrorId(),
      lastErrorTime: Date.now()
    });

    // Prevent default browser behavior
    event.preventDefault();
  };

  render(): ReactNode {
    // Use the same render logic as ErrorBoundary
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error && errorInfo) {
      if (fallback && React.isValidElement(fallback)) {
        return fallback;
      }

      return (
        <DefaultErrorFallback
          error={error}
          errorInfo={errorInfo}
          onRetry={() => this.setState({ hasError: false, error: null, errorInfo: null })}
          onReset={() => this.setState({ hasError: false, error: null, errorInfo: null })}
          retryCount={0}
          maxRetries={3}
        />
      );
    }

    return children;
  }
}