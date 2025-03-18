-- Add RLS policies for the comments table to handle different operations

DO $$
BEGIN
    -- Enable RLS on the comments table if not already enabled
    ALTER TABLE IF EXISTS public.comments ENABLE ROW LEVEL SECURITY;

    -- Check if SELECT policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'comments' 
        AND policyname = 'Comments are viewable by everyone'
    ) THEN
        -- Create policy for viewing comments
        CREATE POLICY "Comments are viewable by everyone" 
        ON "public"."comments" 
        FOR SELECT 
        USING (true);
        
        RAISE NOTICE 'Created SELECT policy for comments table';
    END IF;

    -- Check if INSERT policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'comments' 
        AND policyname = 'Users can add comments'
    ) THEN
        -- Create policy for adding comments
        CREATE POLICY "Users can add comments" 
        ON "public"."comments" 
        FOR INSERT 
        TO authenticated 
        WITH CHECK (auth.uid() = user_id);
        
        RAISE NOTICE 'Created INSERT policy for comments table';
    END IF;

    -- Check if UPDATE policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'comments' 
        AND policyname = 'Users can update own comments'
    ) THEN
        -- Create policy for updating comments
        CREATE POLICY "Users can update own comments" 
        ON "public"."comments" 
        FOR UPDATE 
        TO authenticated 
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
        
        RAISE NOTICE 'Created UPDATE policy for comments table';
    END IF;

    -- Check if DELETE policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'comments' 
        AND policyname = 'Users can delete own comments'
    ) THEN
        -- Create policy for deleting comments
        CREATE POLICY "Users can delete own comments" 
        ON "public"."comments" 
        FOR DELETE 
        TO authenticated 
        USING (auth.uid() = user_id);
        
        RAISE NOTICE 'Created DELETE policy for comments table';
    END IF;
END
$$; 