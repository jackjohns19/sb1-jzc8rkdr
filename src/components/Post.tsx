import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';

interface PostProps {
  post: {
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
  };
  onDelete?: () => void;
  isDetailView?: boolean;
}

export default function Post({ post, onDelete, isDetailView = false }: PostProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(
    post.likes && Array.isArray(post.likes) 
      ? post.likes.some(like => like.user_id === user?.id)
      : false
  );
  const [likesCount, setLikesCount] = useState(
    post.likes && Array.isArray(post.likes) ? post.likes.length : 0
  );
  const [commentsCount, setCommentsCount] = useState(
    post.comments && Array.isArray(post.comments) ? post.comments.length : 0
  );

  // Ensure we have profile data, even if it's missing
  const profileData = post.profiles || { username: 'Unknown User', avatar_url: null };

  // Set up subscription to watch for comment changes
  useEffect(() => {
    // Set up initial comment count
    setCommentsCount(post.comments?.length || 0);

    // Set up subscription for comment changes
    const commentSubscription = supabase
      .channel(`post-comments-${post.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${post.id}`
        },
        () => {
          // When a comment is added, increment the count
          setCommentsCount(prevCount => prevCount + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${post.id}`
        },
        () => {
          // When a comment is deleted, decrement the count
          setCommentsCount(prevCount => Math.max(0, prevCount - 1));
        }
      )
      .subscribe();

    return () => {
      commentSubscription.unsubscribe();
    };
  }, [post.id, post.comments]);

  const handleLike = async () => {
    if (!user) return;

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .match({ post_id: post.id, user_id: user.id });

        if (error) throw error;
        setLikesCount(prev => prev - 1);
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ post_id: post.id, user_id: user.id });

        if (error) throw error;
        setLikesCount(prev => prev + 1);
      }
      setIsLiked(!isLiked);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleDelete = async () => {
    if (!user || user.id !== post.user_id) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .match({ id: post.id });

      if (error) throw error;
      onDelete?.();
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };
  
  const handlePostClick = () => {
    if (!isDetailView) {
      navigate(`/post/${post.id}`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-4">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center">
          <img
            src={profileData.avatar_url || `https://ui-avatars.com/api/?name=${profileData.username}`}
            alt={profileData.username}
            className="w-10 h-10 rounded-full"
          />
          <div className="ml-3">
            <p className="font-medium">{profileData.username}</p>
            <p className="text-sm text-gray-500">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        
        {user?.id === post.user_id && (
          <button
            onClick={handleDelete}
            className="text-gray-400 hover:text-red-500"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        )}
      </div>

      <div 
        className={!isDetailView ? "cursor-pointer" : ""}
        onClick={handlePostClick}
      >
        <p className="mb-4">{post.content}</p>
        
        {post.media_url && (
          <img
            src={post.media_url}
            alt="Post attachment"
            className="rounded-lg mb-4 max-h-96 w-full object-cover"
          />
        )}
      </div>

      <div className="flex items-center gap-6">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 ${
            isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
          }`}
        >
          <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
          <span>{likesCount}</span>
        </button>

        {!isDetailView ? (
          <button 
            onClick={() => navigate(`/post/${post.id}`)}
            className="flex items-center gap-2 text-gray-500 hover:text-blue-500"
          >
            <MessageCircle className="h-5 w-5" />
            <span>{commentsCount}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 text-gray-500">
            <MessageCircle className="h-5 w-5" />
            <span>{commentsCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}