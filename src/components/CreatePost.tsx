import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Image, Loader2 } from 'lucide-react';

export default function CreatePost() {
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !file) return;

    setIsLoading(true);
    try {
      let mediaUrl = null;
      
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user?.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(filePath);

        mediaUrl = publicUrl;
      }

      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user?.id,
          content: content.trim(),
          media_url: mediaUrl,
        });

      if (error) throw error;

      setContent('');
      setFile(null);
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <form onSubmit={handleSubmit}>
        <textarea
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={3}
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        
        <div className="mt-4 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-gray-800">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <Image className="h-5 w-5" />
            {file ? 'Image selected' : 'Add image'}
          </label>
          
          <button
            type="submit"
            disabled={isLoading || (!content.trim() && !file)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Post
          </button>
        </div>
      </form>
    </div>
  );
}