import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import CreatePost from '../components/CreatePost';
import Post from '../components/Post';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Post {
  id: string;
  content: string;
  media_url: string | null;
  created_at: string;
  user_id: string;
  user: {
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

  useEffect(() => {
    if (user) {
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
          () => {
            fetchPosts();
          }
        )
        .subscribe();

      return () => {
        postsSubscription.unsubscribe();
      };
    }
  }, [user]);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          user:user_id (
            username,
            avatar_url
          ),
          likes (
            user_id
          ),
          comments (
            id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
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
      <CreatePost />
      
      <div className="space-y-4">
        {posts.map(post => (
          <Post
            key={post.id}
            post={{
              ...post,
              profiles: post.user // Map user to profiles for compatibility
            }}
            onDelete={() => {
              setPosts(posts.filter(p => p.id !== post.id));
            }}
          />
        ))}
        
        {posts.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No posts yet. Be the first to post something!
          </div>
        )}
      </div>
    </div>
  );
}