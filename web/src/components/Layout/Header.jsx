import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-md fixed top-0 left-0 right-0 z-50">
      <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-indigo-600">
          NEXUS
        </Link>
        <div className="flex items-center space-x-6">
          <NavLink to="/" className={({ isActive }) => isActive ? "text-indigo-600" : "text-gray-600 hover:text-indigo-600"}>Home</NavLink>
          {user ? (
            <>
              <NavLink to="/profile" className={({ isActive }) => isActive ? "text-indigo-600" : "text-gray-600 hover:text-indigo-600"}>
                Profile
              </NavLink>
              <button onClick={logout} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">
                Logout
              </button>
            </>
          ) : (
            <NavLink to="/login" className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">
              Login
            </NavLink>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;
