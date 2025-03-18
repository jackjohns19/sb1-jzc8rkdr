/*
  Add missing INSERT policy for profiles table
  to allow users to create their own profiles
*/

-- Check if policy already exists to avoid errors
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Users can create own profile'
    ) THEN
        CREATE POLICY "Users can create own profile"
            ON profiles FOR INSERT
            WITH CHECK (auth.uid() = id);
    END IF;
END
$$; 