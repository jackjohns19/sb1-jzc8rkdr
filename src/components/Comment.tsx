import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface CommentProps {
  comment: {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    profiles: {
      id: string;
      username: string;
      avatar_url: string | null;
    };
  };
  onDelete?: () => void;
}

export default function Comment({ comment, onDelete }: CommentProps) {
  const { user } = useAuth();
  const isOwner = user?.id === comment.user_id;
  
  return (
    <div className="py-4 border-b border-gray-100 last:border-b-0">
      <div className="flex items-start gap-3">
        {/* User avatar */}
        <Link to={`/profile/${comment.profiles.id}`}>
          <img
            src={comment.profiles.avatar_url || `https://ui-avatars.com/api/?name=${comment.profiles.username}`}
            alt={comment.profiles.username}
            className="w-8 h-8 rounded-full"
          />
        </Link>
        
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <Link 
                to={`/profile/${comment.profiles.id}`}
                className="font-medium text-gray-900 hover:underline"
              >
                {comment.profiles.username}
              </Link>
              <p className="text-sm text-gray-600 mt-0.5">{comment.content}</p>
            </div>
            
            {isOwner && onDelete && (
              <button
                onClick={onDelete}
                className="text-gray-400 hover:text-red-500"
                aria-label="Delete comment"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <p className="text-xs text-gray-500 mt-1">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    </div>
  );
} 