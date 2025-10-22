import React from 'react';

const DashboardPage = () => {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Dashboard Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-500">Total Users</h3>
          <p className="text-3xl font-bold mt-2">1,234</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-500">Pending Documents</h3>
          <p className="text-3xl font-bold mt-2">56</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-500">Open Tickets</h3>
          <p className="text-3xl font-bold mt-2">12</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
