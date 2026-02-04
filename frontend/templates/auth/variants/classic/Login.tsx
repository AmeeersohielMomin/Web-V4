import React, { useState } from 'react';
import Link from 'next/link';

export default function ClassicLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.data.token);
        window.location.href = '/dashboard';
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full flex bg-white shadow-xl rounded-none">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 to-blue-700 p-12 flex-col justify-between">
          <div>
            <div className="text-white text-4xl font-bold mb-4">
              Enterprise Portal
            </div>
            <p className="text-blue-100 text-lg">
              Secure access to your business dashboard
            </p>
          </div>
          
          <div className="space-y-4 text-blue-100">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-300 rounded-full mr-3"></div>
              <span>Enterprise-grade security</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-300 rounded-full mr-3"></div>
              <span>24/7 customer support</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-300 rounded-full mr-3"></div>
              <span>GDPR compliant</span>
            </div>
          </div>

          <div className="text-blue-200 text-sm">
            Classic Template © 2024
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 p-12">
          <div className="max-w-md mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Sign In
              </h2>
              <p className="text-gray-600">
                Enter your credentials to access your account
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="border-l-4 border-red-500 bg-red-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-red-500">⚠️</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="john.doe@company.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                    Forgot password?
                  </a>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              <div className="border-t border-gray-200 pt-6">
                <p className="text-center text-sm text-gray-600">
                  Don't have an account?{' '}
                  <Link href="/signup" className="font-semibold text-blue-600 hover:text-blue-500">
                    Request Access
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
