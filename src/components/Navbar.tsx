import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, User, LogOut } from 'lucide-react';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex items-center px-2 py-2 text-gray-700 hover:text-gray-900">
              <Home className="h-5 w-5" />
              <span className="ml-2 font-medium">Home</span>
            </Link>
          </div>
          
          <div className="flex items-center">
            {user && (
              <>
                <Link
                  to={`/profile/${user.id}`}
                  className="flex items-center px-3 py-2 text-gray-700 hover:text-gray-900"
                >
                  <User className="h-5 w-5" />
                  <span className="ml-2 font-medium">Profile</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center px-3 py-2 text-gray-700 hover:text-gray-900"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="ml-2 font-medium">Sign Out</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}