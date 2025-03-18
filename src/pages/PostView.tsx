import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Post from '../components/Post';
import CommentList from '../components/CommentList';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface PostData {
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

export default function PostView() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!id) {
      setError('Post ID is required');
      setLoading(false);
      return;
    }

    const fetchPost = async () => {
      try {
        // Fetch the post first
        const { data: postData, error: postError } = await supabase
          .from('posts')
          .select(`
            id,
            content,
            media_url,
            created_at,
            user_id,
            likes (
              user_id
            ),
            comments (
              id
            )
          `)
          .eq('id', id)
          .single();

        if (postError) throw postError;
        
        if (!postData) {
          setError('Post not found');
          setLoading(false);
          return;
        }
        
        // Fetch the profile for the post's user
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('id', postData.user_id)
          .single();
          
        if (profileError) {
          console.error('Error fetching profile:', profileError);
        }
        
        // Combine the post and profile data
        const completePost: PostData = {
          ...postData,
          profiles: profileData || { 
            username: 'Unknown User', 
            avatar_url: null 
          }
        };
        
        setPost(completePost);
      } catch (error) {
        console.error('Error fetching post:', error);
        setError('Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();

    // Subscribe to changes for this post
    const postSubscription = supabase
      .channel(`post-${id}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'posts',
          filter: `id=eq.${id}`
        }, 
        () => {
          fetchPost();
        }
      )
      .subscribe();

    return () => {
      postSubscription.unsubscribe();
    };
  }, [id, user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-lg shadow">
        <div className="flex items-center mb-6">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center text-blue-500 hover:text-blue-700"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </button>
        </div>
        <div className="text-center py-8">
          <h2 className="text-xl font-medium text-gray-800 mb-2">
            {error || 'Post not found'}
          </h2>
          <p className="text-gray-500">
            The post you're looking for might have been removed or doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 pb-16">
      <div className="flex items-center mb-6">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center text-blue-500 hover:text-blue-700"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>
      </div>
      
      <Post 
        post={post} 
        onDelete={() => navigate('/')} 
        isDetailView={true}
      />
      
      {/* Comments section */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <CommentList postId={post.id} />
      </div>
    </div>
  );
} 