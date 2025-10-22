import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import UserListPage from './pages/UserListPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  return (
    <Router>
      <div className="flex">
        <nav className="w-64 h-screen bg-gray-800 text-white p-4">
          <h1 className="text-2xl font-bold mb-8">👑 NEXUS Admin</h1>
          <ul>
            <li className="mb-4"><Link to="/" className="hover:text-blue-300">Dashboard</Link></li>
            <li className="mb-4"><Link to="/users" className="hover:text-blue-300">User Management</Link></li>
          </ul>
        </nav>
        <main className="flex-1 p-8">
          <Routes>
            <Route path="/users" element={<UserListPage />} />
            <Route path="/" element={<DashboardPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
