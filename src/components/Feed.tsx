import { useEffect, useState } from 'react';
import { supabase, Post } from '../lib/supabase';
import { PostCard } from './PostCard';
import { useLanguage } from '../contexts/LanguageContext';
import { Logo } from './Logo';

export function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const auth = await supabase.auth.getUser();
      const user = auth.data.user;

      // check if likes table is available
      let hasLikes = true;
      try {
        const check = await supabase.from('likes').select('id').limit(1);
        if (check.error) {
          hasLikes = false;
        }
      } catch {
        hasLikes = false;
      }

      // build query based on what's available
      let query = supabase.from('posts');
      if (hasLikes) {
        query = query.select(`
          *,
          profiles (
            id,
            username,
            points
          ),
          likes (
            id,
            user_id
          )
        `);
      } else {
        query = query.select(`
          *,
          profiles (
            id,
            username,
            points
          )
        `);
      }

      const result = await query.order('created_at', { ascending: false });

      if (result.error) {
        throw result.error;
      }

      // process posts with like counts
      const processed = (result.data || []).map((post: Post) => ({
        ...post,
        likes_count: hasLikes ? ((post as any).likes?.length || 0) : 0,
        is_liked: hasLikes && user ? ((post as any).likes?.some((like: { user_id: string }) => like.user_id === user.id)) : false
      }));

      setPosts(processed);
    } catch (error) {
      console.error('Error loading posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshPosts = () => {
    loadPosts();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Logo className="w-12 h-12 text-greenyellow" iconClassName="w-full h-full" animate />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">{t('noPosts')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onLikeUpdate={refreshPosts} />
      ))}
    </div>
  );
}
