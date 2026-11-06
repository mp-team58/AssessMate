import React from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown } from 'lucide-react';
import Button from './ui/Button';

/**
 * Root and Route-level Error Boundary for AssessMate.
 * Catches JavaScript errors anywhere in their child component tree,
 * logs those errors in development, and displays a graceful fallback UI
 * instead of blanking out the entire application.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    if (import.meta.env.DEV) {
      console.error('[AssessMate ErrorBoundary caught an unhandled error]:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoDashboard = () => {
    const role = localStorage.getItem('role');
    if (role === 'ADMIN') {
      window.location.href = '/admin/dashboard';
    } else if (role === 'HOST') {
      window.location.href = '/host/dashboard';
    } else if (role === 'CANDIDATE') {
      window.location.href = '/candidate/dashboard';
    } else {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      const isRouteLevel = Boolean(this.props.routeLevel);
      const isDev = Boolean(import.meta.env.DEV);
      const errorMessage = this.state.error?.message || 'An unexpected rendering error occurred.';

      if (isRouteLevel) {
        return (
          <div
            role="alert"
            className="w-full p-6 md:p-8 bg-white border border-red-200 rounded-3xl shadow-sm text-center max-w-2xl mx-auto my-8 animate-in fade-in duration-200"
          >
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-bold text-secondary-900 mb-2">
              Unable to Load This Section
            </h2>

            <p className="text-sm text-secondary-600 leading-relaxed max-w-md mx-auto mb-6">
              A temporary issue occurred while rendering this page content. Your session and credentials remain active.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={this.handleReset}
                className="flex items-center gap-1.5 text-xs font-bold px-4 py-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </Button>

              <Button
                onClick={this.handleGoDashboard}
                className="flex items-center gap-1.5 text-xs font-bold px-4 py-2"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Return to Dashboard</span>
              </Button>
            </div>

            {isDev && (
              <details className="mt-6 text-left bg-secondary-900 text-secondary-100 rounded-2xl p-4 text-xs font-mono overflow-x-auto">
                <summary className="font-bold text-red-400 cursor-pointer flex items-center gap-1.5 mb-2 select-none">
                  <ChevronDown className="w-4 h-4" />
                  <span>Technical Diagnostics (Development Only)</span>
                </summary>
                <p className="text-amber-300 font-bold mb-2">{errorMessage}</p>
                <pre className="text-[11px] leading-relaxed text-secondary-300 whitespace-pre-wrap">
                  {this.state.error?.stack || 'No stack trace available'}
                </pre>
                {this.state.errorInfo?.componentStack && (
                  <div className="mt-3 pt-3 border-t border-secondary-800">
                    <p className="text-secondary-400 font-bold mb-1">Component Stack:</p>
                    <pre className="text-[10px] text-secondary-400 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </details>
            )}
          </div>
        );
      }

      // Root-level full screen fallback
      return (
        <div
          role="alert"
          className="min-h-screen bg-surface flex flex-col items-center justify-center p-4 font-sans text-center"
        >
          <div className="bg-white rounded-3xl shadow-xl border border-secondary-200 max-w-lg w-full p-8 md:p-10 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h1 className="text-2xl font-black text-secondary-900 tracking-tight mb-2">
                AssessMate encountered an error
              </h1>
              <p className="text-sm text-secondary-600 leading-relaxed">
                We encountered an unexpected problem rendering the requested screen. You can try refreshing the page or return to the main dashboard.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={this.handleReload}
                className="w-full sm:w-auto flex items-center justify-center gap-2 text-xs font-bold py-2.5 px-5"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </Button>

              <Button
                onClick={this.handleGoDashboard}
                className="w-full sm:w-auto flex items-center justify-center gap-2 text-xs font-bold py-2.5 px-5 shadow-sm"
              >
                <Home className="w-4 h-4" />
                <span>Go to Dashboard</span>
              </Button>
            </div>

            {isDev && (
              <details className="mt-4 text-left bg-secondary-900 text-secondary-100 rounded-2xl p-4 text-xs font-mono overflow-x-auto">
                <summary className="font-bold text-red-400 cursor-pointer flex items-center gap-1.5 mb-2 select-none">
                  <ChevronDown className="w-4 h-4" />
                  <span>Technical Diagnostics (Development Only)</span>
                </summary>
                <p className="text-amber-300 font-bold mb-2">{errorMessage}</p>
                <pre className="text-[11px] leading-relaxed text-secondary-300 whitespace-pre-wrap">
                  {this.state.error?.stack || 'No stack trace available'}
                </pre>
                {this.state.errorInfo?.componentStack && (
                  <div className="mt-3 pt-3 border-t border-secondary-800">
                    <p className="text-secondary-400 font-bold mb-1">Component Stack:</p>
                    <pre className="text-[10px] text-secondary-400 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

