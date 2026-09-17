import React, { useState } from 'react';
import { Shield, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { authService } from '../services/authService';

export default function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim() || !password) {
      setErrorMessage('Please enter both your username and password.');
      return;
    }

    setIsLoading(true);

    try {
      const user = await authService.login(username, password);
      if (onLoginSuccess) {
        onLoginSuccess(user);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Authentication failed. Please verify your credentials.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#0B0F19] text-gray-100 p-4 relative overflow-hidden select-none">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10">
        {/* Header / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/20 mb-4 border border-blue-400/30">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">DFEMS Forensic Vault</h1>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-semibold">
            Digital Forensic Evidence Management System
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#121826]/90 backdrop-blur-md rounded-2xl border border-gray-800 p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-white">Sign In to Your Account</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Enter your credentials to access the secure evidence repository.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 flex items-start gap-3 p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5" htmlFor="username">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Krishan"
                  disabled={isLoading}
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1A2234] border border-gray-700/80 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator passphrase"
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#1A2234] border border-gray-700/80 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-200 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 pt-5 border-t border-gray-800 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Oracle 26ai Session Protection</span>
            </div>
            <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
              Authorized personnel only. All access attempts are recorded in the forensic audit ledger (ISO/IEC 27037 compliant).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
