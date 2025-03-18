import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Eye, RefreshCw, Loader2 } from 'lucide-react';

export default function Debug() {
  const { user, ensureProfileExists } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profileCount, setProfileCount] = useState<number | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [localStorageProfiles, setLocalStorageProfiles] = useState<any[]>([]);
  const [storageBuckets, setStorageBuckets] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Function to fetch diagnostic data
  const fetchDiagnosticData = async () => {
    try {
      setLoading(true);
      
      // Fetch profile count
      const { count: profileCountResult, error: profileCountError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (profileCountError) {
        console.error('Error fetching profile count:', profileCountError);
      } else {
        setProfileCount(profileCountResult);
      }
      
      // Check if current user has a profile
      if (user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profileError && !profileError.message.includes('No rows found')) {
          console.error('Error fetching user profile:', profileError);
        } else {
          setProfileData(profileData);
        }
      }
      
      // Get localStorage profiles
      const localProfiles = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('profile_')) {
          try {
            const profile = JSON.parse(localStorage.getItem(key) || '{}');
            localProfiles.push(profile);
          } catch (e) {
            console.error('Error parsing localStorage profile:', e);
          }
        }
      }
      setLocalStorageProfiles(localProfiles);
      
      // Get storage buckets
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      if (bucketsError) {
        console.error('Error fetching storage buckets:', bucketsError);
      } else {
        setStorageBuckets(buckets);
      }
      
      // Get user count from auth.users table - this may not work due to RLS
      try {
        const { count: userCountResult, error: userCountError } = await supabase
          .from('auth.users')
          .select('*', { count: 'exact', head: true });
        
        if (!userCountError) {
          setUserCount(userCountResult);
        }
      } catch (e) {
        console.log('Could not fetch user count, likely due to RLS restrictions');
      }
    } catch (error) {
      console.error('Error in diagnostic data fetching:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create profile for current user
  const createProfileForCurrentUser = async () => {
    if (!user) return;
    
    setRefreshing(true);
    try {
      await ensureProfileExists(user.id, user.email || '');
      // Wait a moment before refreshing data
      setTimeout(() => {
        fetchDiagnosticData();
        setRefreshing(false);
      }, 1000);
    } catch (error) {
      console.error('Error creating profile:', error);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDiagnosticData();
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto p-4 my-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Debug Information</h1>
        <button 
          onClick={() => {
            setRefreshing(true);
            fetchDiagnosticData().finally(() => setRefreshing(false));
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Authentication Status */}
          <section className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Authenticated:</span>{' '}
                <span className={user ? 'text-green-600 font-bold' : 'text-red-600'}>
                  {user ? 'Yes' : 'No'}
                </span>
              </p>
              {user && (
                <>
                  <p><span className="font-medium">User ID:</span> {user.id}</p>
                  <p><span className="font-medium">Email:</span> {user.email}</p>
                  <p>
                    <span className="font-medium">Email Confirmed:</span>{' '}
                    <span className={user.email_confirmed_at ? 'text-green-600' : 'text-orange-600'}>
                      {user.email_confirmed_at ? 'Yes' : 'No'}
                    </span>
                  </p>
                </>
              )}
            </div>
          </section>

          {/* Database Status */}
          <section className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Database Status</h2>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Total Profiles:</span>{' '}
                {profileCount !== null ? profileCount : 'Unable to fetch'}
              </p>
              <p>
                <span className="font-medium">Total Users:</span>{' '}
                {userCount !== null ? userCount : 'Unable to fetch (requires admin access)'}
              </p>
              <p>
                <span className="font-medium">Storage Buckets:</span>{' '}
                {storageBuckets.length > 0 
                  ? storageBuckets.map(b => b.name).join(', ')
                  : 'None found or unable to fetch'}
              </p>
            </div>
          </section>

          {/* User Profile */}
          {user && (
            <section className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Current User Profile</h2>
                <div className="flex gap-2">
                  {profileData ? (
                    <Link 
                      to={`/profile/${user.id}`}
                      className="flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-800"
                    >
                      <Eye className="h-4 w-4" />
                      View Profile
                    </Link>
                  ) : (
                    <button
                      onClick={createProfileForCurrentUser}
                      className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 rounded-md text-white"
                      disabled={refreshing}
                    >
                      {refreshing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        '+ Create Profile'
                      )}
                    </button>
                  )}
                </div>
              </div>
              
              {profileData ? (
                <div className="border rounded-md p-4">
                  <pre className="whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(profileData, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 text-yellow-700 rounded-md">
                  No profile found for this user in the database.
                </div>
              )}
              
              {localStorageProfiles.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2">LocalStorage Profiles:</h3>
                  <div className="border rounded-md p-4 bg-gray-50">
                    <pre className="whitespace-pre-wrap overflow-x-auto text-sm">
                      {JSON.stringify(localStorageProfiles, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </section>
          )}
          
          {/* RLS Explainer */}
          <section className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Row-Level Security Information</h2>
            <div className="prose">
              <p>
                Supabase uses Row-Level Security (RLS) to control access to table rows. If you're experiencing 
                permission issues, you might need to adjust the RLS policies in your database.
              </p>
              <h3 className="text-lg font-medium mt-4 mb-2">Common RLS Policies for Profiles:</h3>
              <ul className="list-disc ml-6 space-y-2">
                <li>
                  <strong>SELECT policy</strong> - Allows users to view profiles (often public)
                  <pre className="text-xs bg-gray-100 p-2 mt-1 rounded">
                    {`CREATE POLICY "Public profiles are viewable by everyone" 
ON "public"."profiles" FOR SELECT USING (true);`}
                  </pre>
                </li>
                <li>
                  <strong>INSERT policy</strong> - Allows users to create their own profile
                  <pre className="text-xs bg-gray-100 p-2 mt-1 rounded">
                    {`CREATE POLICY "Users can create own profile" 
ON "public"."profiles" FOR INSERT 
TO authenticated WITH CHECK (auth.uid() = id);`}
                  </pre>
                </li>
                <li>
                  <strong>UPDATE policy</strong> - Allows users to update their own profile
                  <pre className="text-xs bg-gray-100 p-2 mt-1 rounded">
                    {`CREATE POLICY "Users can update own profile" 
ON "public"."profiles" FOR UPDATE 
USING (auth.uid() = id) WITH CHECK (auth.uid() = id);`}
                  </pre>
                </li>
              </ul>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 text-blue-700 rounded-md">
              <p className="font-medium">How to Fix Missing RLS Policies:</p>
              <ol className="list-decimal ml-6 mt-2 space-y-1">
                <li>Go to your Supabase Dashboard</li>
                <li>Navigate to SQL Editor</li>
                <li>Run the SQL queries from <code>supabase/check_rls_policies.sql</code> to check your policies</li>
                <li>Run the migration <code>supabase/migrations/20240520000000_add_profile_insert_policy.sql</code> to fix the insert policy</li>
              </ol>
            </div>
          </section>
        </div>
      )}
    </div>
  );
} 