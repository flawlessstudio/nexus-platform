import React from 'react';
import useAuth from '../hooks/useAuth';
import Header from '../components/Layout/Header';

const DashboardPage = () => {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={logout} />
      <main className="max-w-7xl mx-auto py-6 px-4">
        <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome to your Dashboard, {user?.firstName}!
          </h2>
        </div>
      </main>
    </div>
  );
};
export default DashboardPage;
