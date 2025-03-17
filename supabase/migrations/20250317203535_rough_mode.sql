/*
  # Initial Facebook Clone Schema

  1. New Tables
    - `profiles`
      - Extended user profile information
      - Linked to auth.users
    - `posts`
      - Social media posts
      - Contains text content and optional media URL
    - `comments`
      - Post comments
      - Linked to posts and users
    - `likes`
      - Post likes tracking
      - Ensures unique likes per user/post
    - `friendships`
      - Manages friend relationships
      - Tracks friendship status
    - `notifications`
      - System notifications
      - Tracks read/unread status

  2. Security
    - Enable RLS on all tables
    - Policies for authenticated access
    - Friend-only access where appropriate
*/

-- Profiles table for extended user information
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  bio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Posts table for social media content
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  media_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Comments on posts
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Likes for posts
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Friendships between users
CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  friend_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('pending', 'accepted', 'rejected')) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  message text NOT NULL,
  related_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Posts policies
CREATE POLICY "Posts are viewable by friends"
  ON posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM friendships
      WHERE (user_id = auth.uid() AND friend_id = posts.user_id AND status = 'accepted')
      OR (friend_id = auth.uid() AND user_id = posts.user_id AND status = 'accepted')
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can create posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Comments are viewable by friends"
  ON comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = comments.post_id
      AND (
        EXISTS (
          SELECT 1 FROM friendships
          WHERE (user_id = auth.uid() AND friend_id = posts.user_id AND status = 'accepted')
          OR (friend_id = auth.uid() AND user_id = posts.user_id AND status = 'accepted')
        )
        OR posts.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create comments"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Likes policies
CREATE POLICY "Likes are viewable by friends"
  ON likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = likes.post_id
      AND (
        EXISTS (
          SELECT 1 FROM friendships
          WHERE (user_id = auth.uid() AND friend_id = posts.user_id AND status = 'accepted')
          OR (friend_id = auth.uid() AND user_id = posts.user_id AND status = 'accepted')
        )
        OR posts.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create likes"
  ON likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes"
  ON likes FOR DELETE
  USING (auth.uid() = user_id);

-- Friendships policies
CREATE POLICY "Friendships are viewable by involved users"
  ON friendships FOR SELECT
  USING (auth.uid() IN (user_id, friend_id));

CREATE POLICY "Users can create friendship requests"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their friendship status"
  ON friendships FOR UPDATE
  USING (auth.uid() IN (user_id, friend_id));

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own notification read status"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);