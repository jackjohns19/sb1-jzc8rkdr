import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Comment from './Comment';
import { Send, Loader2 } from 'lucide-react';

interface CommentListProps {
  postId: string;
}

interface CommentData {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

export default function CommentList({ postId }: CommentListProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch comments when the component mounts or postId changes
  useEffect(() => {
    fetchComments();

    // Set up real-time subscription for new comments
    const subscription = supabase
      .channel(`comments-${postId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'comments',
          filter: `post_id=eq.${postId}`
        }, 
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [postId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      
      // First, fetch the comments for the post
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('id, content, created_at, user_id, post_id')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;
      
      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        setLoading(false);
        return;
      }
      
      // Get all user IDs from the comments to fetch their profiles
      const userIds = [...new Set(commentsData.map(comment => comment.user_id))];
      
      // Fetch profiles for the users who made comments
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);
        
      if (profilesError) throw profilesError;
      
      // Create a map of user IDs to profile data for quick lookup
      const profilesMap = (profilesData || []).reduce((map, profile) => {
        map[profile.id] = profile;
        return map;
      }, {} as Record<string, any>);
      
      // Combine the comments with their associated profiles
      const commentsWithProfiles = commentsData.map(comment => {
        const profile = profilesMap[comment.user_id] || {
          id: comment.user_id,
          username: 'Unknown User',
          avatar_url: null
        };
        
        return {
          ...comment,
          profiles: {
            id: profile.id,
            username: profile.username,
            avatar_url: profile.avatar_url
          }
        };
      });
      
      setComments(commentsWithProfiles);
      setError(null);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to comment');
      return;
    }

    if (!newComment.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: newComment.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setNewComment('');
      await fetchComments(); // Refresh comments
    } catch (err) {
      console.error('Error submitting comment:', err);
      setError('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .match({ id: commentId, user_id: user.id });

      if (error) throw error;
      
      // Filter out the deleted comment from state
      setComments(comments.filter(comment => comment.id !== commentId));
    } catch (err) {
      console.error('Error deleting comment:', err);
      setError('Failed to delete comment');
    }
  };

  return (
    <div className="mt-6">
      <h3 className="text-xl font-semibold mb-4">
        Comments {!loading && `(${comments.length})`}
      </h3>
      
      {/* Comment form */}
      {user && (
        <form onSubmit={handleSubmitComment} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={submitting}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
              disabled={submitting || !newComment.trim()}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </form>
      )}
      
      {/* Comments list */}
      <div className="space-y-1 bg-gray-50 rounded-lg divide-y divide-gray-100">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : comments.length > 0 ? (
          comments.map(comment => (
            <Comment
              key={comment.id}
              comment={comment}
              onDelete={() => handleDeleteComment(comment.id)}
            />
          ))
        ) : (
          <div className="py-8 text-center text-gray-500">
            No comments yet. Be the first to comment!
          </div>
        )}
      </div>
    </div>
  );
} 