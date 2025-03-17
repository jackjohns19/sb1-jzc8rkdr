import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Image, Loader2 } from 'lucide-react';

interface CreatePostProps {
  onPostCreated?: () => void;
}

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !file) return;
    if (!user) return;

    setIsLoading(true);
    try {
      // First, ensure the user has a profile
      console.log('Checking for existing profile...');
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profileCheckError) {
        console.error('Error checking profile:', profileCheckError);
      }
      
      // If no profile exists, create one with default values
      if (!existingProfile) {
        console.log('No profile found, creating one...');
        
        const defaultUsername = user.email?.split('@')[0] || `user_${Math.floor(Math.random() * 10000)}`;
        
        const { data: newProfile, error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: defaultUsername,
            avatar_url: null
          })
          .select()
          .single();
        
        if (createProfileError) {
          console.error('Error creating profile:', createProfileError);
        } else {
          console.log('Profile created successfully:', newProfile);
        }
      } else {
        console.log('Using existing profile:', existingProfile);
      }

      // Now handle media upload if there's a file
      let mediaUrl = null;
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(filePath);

        mediaUrl = publicUrl;
      }

      // Finally, create the post
      console.log('Creating post...');
      const { data: newPost, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: content.trim(),
          media_url: mediaUrl,
        })
        .select()
        .single();

      if (postError) {
        console.error('Error creating post:', postError);
        throw postError;
      }
      
      console.log('Post created successfully:', newPost);

      setContent('');
      setFile(null);
      
      // Call the callback if it exists
      if (onPostCreated) {
        onPostCreated();
      }
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