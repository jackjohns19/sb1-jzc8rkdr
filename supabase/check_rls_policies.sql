-- This script helps check the Row-Level Security (RLS) policies in your Supabase database
-- Run this in the SQL editor in your Supabase dashboard

-- Check if RLS is enabled for the profiles table
SELECT 
    n.nspname as schema,
    c.relname as table_name,
    CASE WHEN c.relrowsecurity THEN 'RLS enabled' ELSE 'RLS disabled' END as rls_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'profiles';

-- List all policies for the profiles table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles';

-- Check if insert policy exists specifically
SELECT 
    EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND cmd = 'INSERT'
    ) as insert_policy_exists;

-- Create policy for inserting if it doesn't exist (uncomment to use)
/*
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can create own profile'
    ) THEN
        CREATE POLICY "Users can create own profile" 
        ON "public"."profiles" 
        FOR INSERT 
        TO authenticated 
        WITH CHECK (auth.uid() = id);
        
        RAISE NOTICE 'Created INSERT policy for profiles table';
    ELSE
        RAISE NOTICE 'INSERT policy for profiles already exists';
    END IF;
END
$$;
*/

-- Display profiles (for debugging)
SELECT * FROM profiles;

-- Count of profiles
SELECT COUNT(*) FROM profiles;

-- Count of auth.users
SELECT COUNT(*) FROM auth.users; 