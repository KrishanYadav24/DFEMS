import React from 'react';
import { AlertOctagon, RefreshCw, LogOut } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('DFEMS Application Error Boundary Caught an Uncaught Exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleLogout = () => {
    localStorage.removeItem('dfems_token');
    localStorage.removeItem('dfems_user');
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || String(this.state.error) || 'An unexpected runtime error occurred.';

      return (
        <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex items-center justify-center p-6 select-none">
          <div className="max-w-lg w-full bg-[#121826] border border-gray-800 rounded-2xl p-8 shadow-2xl text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-950/50 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-white tracking-tight">Application Interface Notice</h2>
            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
              A rendering exception occurred in the forensic console. Your session and cryptographic data in Oracle 26ai remain completely protected.
            </p>

            <div className="mt-5 p-3.5 bg-gray-900/90 rounded-xl border border-gray-800 text-left font-mono text-xs text-rose-300 break-all max-h-36 overflow-y-auto">
              {errorMessage}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>
              <button
                type="button"
                onClick={this.handleLogout}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-medium text-xs flex items-center justify-center gap-2 border border-gray-700 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Return to Login</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
