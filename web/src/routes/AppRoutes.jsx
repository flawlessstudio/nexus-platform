import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Import your page components
import HomePage from '../pages/HomePage.jsx'; // Placeholder
import LoginPage from '../pages/LoginPage.jsx'; // Placeholder
import ProfilePage from '../pages/ProfilePage';
import Header from '../components/Layout/Header.jsx'; // New Header component

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

const AppRoutes = () => {
  return (
    <>
      <Header />
      <main className="pt-16"> {/* Add padding to offset fixed header */}
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Private Routes */}
          <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />

          {/* Add other routes here */}
        </Routes>
      </main>
    </>
  );
};

export default AppRoutes;
