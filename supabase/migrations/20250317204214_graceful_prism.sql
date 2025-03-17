/*
  # Create posts schema with safe policy creation

  1. New Tables
    - `posts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `content` (text)
      - `media_url` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `likes`
      - `id` (uuid, primary key)
      - `post_id` (uuid, references posts)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamp)
    - `comments`
      - `id` (uuid, primary key)
      - `post_id` (uuid, references posts)
      - `user_id` (uuid, references auth.users)
      - `content` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  content text NOT NULL,
  media_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create likes table
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Safely create policies using DO blocks
DO $$
BEGIN
    -- Posts policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'posts' AND policyname = 'Anyone can view posts'
    ) THEN
        CREATE POLICY "Anyone can view posts"
            ON posts FOR SELECT
            TO authenticated
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'posts' AND policyname = 'Users can create posts'
    ) THEN
        CREATE POLICY "Users can create posts"
            ON posts FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'posts' AND policyname = 'Users can update own posts'
    ) THEN
        CREATE POLICY "Users can update own posts"
            ON posts FOR UPDATE
            TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'posts' AND policyname = 'Users can delete own posts'
    ) THEN
        CREATE POLICY "Users can delete own posts"
            ON posts FOR DELETE
            TO authenticated
            USING (auth.uid() = user_id);
    END IF;

    -- Likes policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'likes' AND policyname = 'Anyone can view likes'
    ) THEN
        CREATE POLICY "Anyone can view likes"
            ON likes FOR SELECT
            TO authenticated
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'likes' AND policyname = 'Users can create likes'
    ) THEN
        CREATE POLICY "Users can create likes"
            ON likes FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'likes' AND policyname = 'Users can delete own likes'
    ) THEN
        CREATE POLICY "Users can delete own likes"
            ON likes FOR DELETE
            TO authenticated
            USING (auth.uid() = user_id);
    END IF;

    -- Comments policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'comments' AND policyname = 'Anyone can view comments'
    ) THEN
        CREATE POLICY "Anyone can view comments"
            ON comments FOR SELECT
            TO authenticated
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'comments' AND policyname = 'Users can create comments'
    ) THEN
        CREATE POLICY "Users can create comments"
            ON comments FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'comments' AND policyname = 'Users can update own comments'
    ) THEN
        CREATE POLICY "Users can update own comments"
            ON comments FOR UPDATE
            TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'comments' AND policyname = 'Users can delete own comments'
    ) THEN
        CREATE POLICY "Users can delete own comments"
            ON comments FOR DELETE
            TO authenticated
            USING (auth.uid() = user_id);
    END IF;
END
$$;