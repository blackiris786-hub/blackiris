import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface PostViewTrackerProps {
  postId: string;
}

export function PostViewTracker({ postId }: PostViewTrackerProps) {
  const incrementView = async (id: string) => {
    try {
      await supabase.rpc('increment_post_views', { post_id: id });
    } catch (e) {
      console.warn("View increment failed", e);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => incrementView(postId), 2000);
    return () => clearTimeout(timer);
  }, [postId]);

  return null; // This component doesn't render anything visible
}