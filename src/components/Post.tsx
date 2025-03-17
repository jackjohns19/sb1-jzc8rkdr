import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

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
}

export default function Post({ post, onDelete }: PostProps) {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = React.useState(
    post.likes.some(like => like.user_id === user?.id)
  );
  const [likesCount, setLikesCount] = React.useState(post.likes.length);
  const [commentsCount] = React.useState(post.comments.length);

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

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-4">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center">
          <img
            src={post.profiles.avatar_url || `https://ui-avatars.com/api/?name=${post.profiles.username}`}
            alt={post.profiles.username}
            className="w-10 h-10 rounded-full"
          />
          <div className="ml-3">
            <p className="font-medium">{post.profiles.username}</p>
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

      <p className="mb-4">{post.content}</p>
      
      {post.media_url && (
        <img
          src={post.media_url}
          alt="Post attachment"
          className="rounded-lg mb-4 max-h-96 w-full object-cover"
        />
      )}

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

        <button className="flex items-center gap-2 text-gray-500">
          <MessageCircle className="h-5 w-5" />
          <span>{commentsCount}</span>
        </button>
      </div>
    </div>
  );
}