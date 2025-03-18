import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username?: string) => Promise<void>;
  signOut: () => Promise<void>;
  ensureProfileExists: (userId: string, email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Method to check if a profile exists for a user and create one if not
  const ensureProfileExists = async (userId: string, email: string) => {
    try {
      console.log('Checking if profile exists for user:', userId);
      
      // First check if profile exists
      const { data: existingProfile, error: queryError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      
      // If no profile exists, create one
      if (!existingProfile && (queryError?.code === 'PGRST116' || queryError?.message?.includes('No rows found'))) {
        const defaultUsername = email.split('@')[0] || `user_${Math.floor(Math.random() * 10000)}`;
        
        console.log('Creating profile for user:', userId, 'with username:', defaultUsername);
        
        // Try to insert profile using multiple approaches to handle RLS issues
        try {
          // First attempt - direct insert
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              username: defaultUsername,
              created_at: new Date().toISOString(),
            });
          
          if (insertError) {
            console.warn('Direct profile insert failed, trying localStorage fallback:', insertError);
            
            // Fallback to localStorage if database insert fails
            const profileData = {
              id: userId,
              username: defaultUsername,
              created_at: new Date().toISOString(),
            };
            
            localStorage.setItem(`profile_${userId}`, JSON.stringify(profileData));
            console.log('Profile saved to localStorage as fallback');
          } else {
            console.log('Profile created successfully in database');
          }
        } catch (createError) {
          console.error('Error creating profile:', createError);
        }
      } else if (existingProfile) {
        console.log('Profile already exists for user:', userId);
      } else if (queryError) {
        console.error('Error checking for profile:', queryError);
      }
    } catch (err) {
      console.error('ensureProfileExists error:', err);
    }
  };

  const initializeAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        // Ensure profile exists when session is initialized
        await ensureProfileExists(session.user.id, session.user.email || '');
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initialize auth state
    initializeAuth();

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Ensure profile exists when auth state changes
        await ensureProfileExists(session.user.id, session.user.email || '');
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username?: string) => {
    console.log('Signing up user with email:', email);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error('Sign up error:', error);
      throw error;
    }

    console.log('Sign up successful, user data:', data);

    // If user was created successfully, create a profile for them
    if (data?.user) {
      await ensureProfileExists(data.user.id, email);
      
      // If username was provided, update the profile with it
      if (username) {
        try {
          console.log('Updating profile with provided username:', username);
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ username })
            .eq('id', data.user.id);
          
          if (updateError) {
            console.error('Error updating username during signup:', updateError);
            
            // Try localStorage fallback if database update fails
            const profileData = localStorage.getItem(`profile_${data.user.id}`);
            if (profileData) {
              const updatedProfile = JSON.parse(profileData);
              updatedProfile.username = username;
              localStorage.setItem(`profile_${data.user.id}`, JSON.stringify(updatedProfile));
              console.log('Updated username in localStorage as fallback');
            }
          } else {
            console.log('Username updated successfully during signup');
          }
        } catch (err) {
          console.error('Error in username update:', err);
        }
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    // Ensure profile exists after sign in
    if (data?.user) {
      await ensureProfileExists(data.user.id, email);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    ensureProfileExists,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}