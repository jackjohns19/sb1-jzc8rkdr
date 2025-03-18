-- Add INSERT policy for profiles table to allow users to create their own profile
-- This will enable authenticated users to create a profile linked to their user ID

DO $$
BEGIN
    -- Check if the policy already exists to avoid errors
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can create own profile'
    ) THEN
        -- Create policy to allow users to insert their own profile
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