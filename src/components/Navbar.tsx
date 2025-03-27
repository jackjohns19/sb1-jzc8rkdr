import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, User, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  
  useEffect(() => {
    if (user) {
      const fetchUserProfile = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', user.id)
          .single();
        
        if (!error && data) {
          setUsername(data.username);
          setProfileImage(data.avatar_url);
        }
      };
      
      fetchUserProfile();
    }
  }, [user]);

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
          <div className="flex items-center">
            <Link to="/" className="flex items-center px-2 py-2 text-gray-700 hover:text-gray-900">
              <Home className="h-5 w-5" />
              <span className="ml-2 font-medium hidden sm:inline">Home</span>
            </Link>
          </div>
          
          <div className="flex justify-center flex-1">
            <h1 className="text-xl font-bold text-gray-800 flex items-center">FacePlace</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {user && (
              <>
                <Link
                  to={`/profile/${user.id}`}
                  className="flex items-center text-gray-700 hover:text-gray-900"
                >
                  {profileImage ? (
                    <img 
                      src={profileImage} 
                      alt={username || 'Profile'} 
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                  <span className="ml-2 font-medium hidden sm:inline">{username || 'Profile'}</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center text-gray-700 hover:text-gray-900"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="ml-2 font-medium hidden sm:inline">Sign Out</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}