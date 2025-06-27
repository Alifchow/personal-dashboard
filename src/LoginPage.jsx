import React, { useState } from "react";

export default function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Simple authentication - you can modify these credentials
    if (username === "admin" && password === "password123") {
      // Simulate loading
      setTimeout(() => {
        const userData = {
          name: "Dashboard User",
          email: "user@dashboard.com",
          sub: "dashboard-user"
        };
        onLoginSuccess(userData, "dashboard-access-token");
        setIsLoading(false);
      }, 1000);
    } else {
      setTimeout(() => {
        setError("Invalid username or password");
        setIsLoading(false);
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Personal Dashboard</h1>
          <p className="text-gray-300">Sign in to access your dashboard</p>
        </div>

        {/* Login Card */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl shadow-2xl border border-gray-700">
          {isLoading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-300">Signing you in...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username Field */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your username"
                  required
                />
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                  required
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition duration-200"
              >
                Sign In
              </button>
            </form>
          )}

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-400 text-center">
              <strong>Demo Credentials:</strong><br />
              Username: <code className="bg-gray-800 px-1 rounded">admin</code><br />
              Password: <code className="bg-gray-800 px-1 rounded">password123</code>
            </p>
          </div>

          {/* Info */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              After login, you can connect Google Calendar and Spotify
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-400 text-sm">
            Secure • Private • Local
          </p>
        </div>
      </div>
    </div>
  );
} 