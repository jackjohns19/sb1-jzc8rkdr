import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Initialize the necessary storage buckets if they don't exist
const initializeStorage = async (client: any) => {
  try {
    // Check if profiles bucket exists
    const { data: buckets } = await client.storage.listBuckets();
    
    // Create profiles bucket if it doesn't exist
    if (!buckets.find((bucket: any) => bucket.name === 'profiles')) {
      console.log('Creating profiles bucket');
      await client.storage.createBucket('profiles', {
        public: true,
        fileSizeLimit: 1024 * 1024 * 2, // 2MB limit
      });
    }
    
    // Make sure posts bucket exists too
    if (!buckets.find((bucket: any) => bucket.name === 'posts')) {
      console.log('Creating posts bucket');
      await client.storage.createBucket('posts', {
        public: true,
        fileSizeLimit: 1024 * 1024 * 5, // 5MB limit
      });
    }
  } catch (error) {
    console.error('Error setting up storage buckets:', error);
  }
};

// Initialize storage buckets when this module is imported
initializeStorage(supabase);

export { supabase };