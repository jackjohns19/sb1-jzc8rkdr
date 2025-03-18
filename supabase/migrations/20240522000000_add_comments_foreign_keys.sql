-- Add proper foreign key relationships for the comments table

DO $$
BEGIN
    -- Check if the foreign key from comments to profiles already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'comments_user_id_fkey'
        AND table_name = 'comments'
    ) THEN
        -- Add foreign key constraint to link comments to profiles
        ALTER TABLE IF EXISTS public.comments
        ADD CONSTRAINT comments_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint from comments to profiles';
    ELSE 
        RAISE NOTICE 'Foreign key constraint from comments to profiles already exists';
    END IF;

    -- Check if the foreign key from comments to posts already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'comments_post_id_fkey'
        AND table_name = 'comments'
    ) THEN
        -- Add foreign key constraint to link comments to posts
        ALTER TABLE IF EXISTS public.comments
        ADD CONSTRAINT comments_post_id_fkey
        FOREIGN KEY (post_id)
        REFERENCES public.posts(id)
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint from comments to posts';
    ELSE 
        RAISE NOTICE 'Foreign key constraint from comments to posts already exists';
    END IF;
END
$$; 