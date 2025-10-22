import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const HomePage = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to Nexus Platform
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Your immigration services platform
          </p>
        </div>
        <div className="mt-8 space-y-6">
          {user ? (
            <div className="text-center">
              <p className="text-lg text-gray-700">Welcome back, {user.email}!</p>
              <Link
                to="/profile"
                className="mt-4 inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
              >
                Go to Profile
              </Link>
            </div>
          ) : (
            <div className="text-center">
              <Link
                to="/login"
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
