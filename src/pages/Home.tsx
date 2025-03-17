import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import CreatePost from '../components/CreatePost';
import Post from '../components/Post';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface Post {
  id: string;
  content: string;
  media_url: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
  likes: { user_id: string }[];
  comments: { id: string }[];
}

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchPosts = useCallback(async () => {
    try {
      console.log('Fetching posts...', user?.id);
      
      // If we're fetching posts for the first time, show loading
      if (posts.length === 0) {
        setLoading(true);
      }
      
      // First, let's check if the posts table has any data
      const { count } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true });
      
      console.log('Posts count:', count);
      
      // Fetch posts with likes and comments, but not profiles
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          media_url,
          created_at,
          user_id,
          likes(user_id),
          comments(id)
        `)
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Error fetching posts:', postsError);
        throw postsError;
      }
      
      if (!postsData || postsData.length === 0) {
        console.log('No posts found.');
        setPosts([]);
        setLoading(false);
        return;
      }
      
      console.log('Posts fetched:', postsData);
      
      // Collect all user_ids from posts to fetch profiles
      const userIds = [...new Set(postsData.map(post => post.user_id))];
      
      // Fetch profiles for all users who have posts
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);
        
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }
      
      // Create a map of user_id to profile for easy lookup
      const profilesMap: Record<string, Profile> = {};
      if (profilesData) {
        profilesData.forEach(profile => {
          profilesMap[profile.id] = profile;
        });
      }
      
      // Transform the data by manually adding profile info
      const transformedPosts = postsData.map(post => {
        const profile = profilesMap[post.user_id] || { 
          id: post.user_id,
          username: 'Unknown User', 
          avatar_url: null 
        };
        
        return {
          ...post,
          profiles: {
            username: profile.username,
            avatar_url: profile.avatar_url
          }
        };
      });
      
      console.log('Transformed posts with profiles:', transformedPosts);
      
      setPosts(transformedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    // We fetch posts even if user is null to handle public posts
    fetchPosts();

    // Subscribe to new posts
    const postsSubscription = supabase
      .channel('public:posts')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'posts' 
        }, 
        (payload) => {
          console.log('Posts changed:', payload);
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      postsSubscription.unsubscribe();
    };
  }, [fetchPosts]);

  const handlePostCreated = () => {
    fetchPosts();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <CreatePost onPostCreated={handlePostCreated} />
      
      <div className="space-y-4">
        {posts && posts.length > 0 ? (
          posts.map(post => (
            <Post
              key={post.id}
              post={post}
              onDelete={() => {
                setPosts(posts.filter(p => p.id !== post.id));
              }}
            />
          ))
        ) : (
          <div className="text-center text-gray-500 py-8">
            No posts yet. Be the first to post something!
          </div>
        )}
      </div>
    </div>
  );
}