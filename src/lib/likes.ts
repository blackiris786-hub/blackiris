import { supabase } from './supabase';

// Like a post
export async function likePost(postId: string, userId: string): Promise<{ error: unknown }> {
  try {
    const result = await supabase
      .from('likes')
      .insert({
        user_id: userId,
        post_id: postId,
      });

    if (result.error) {
      console.log('Like failed:', result.error.code);
    }

    return { error: result.error };
  } catch (error) {
    console.log('Like error:', error);
    return { error };
  }
}

// Unlike a post
export async function unlikePost(postId: string, userId: string): Promise<{ error: unknown }> {
  try {
    const result = await supabase
      .from('likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    return { error: result.error };
  } catch (error) {
    return { error };
  }
}

// Check if user liked a post
export async function checkUserLike(postId: string, userId: string): Promise<boolean> {
  try {
    const result = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (result.error && result.error.code !== 'PGRST116') {
      console.error('Error checking like:', result.error);
      return false;
    }

    return !!result.data;
  } catch (error) {
    console.error('Error checking like:', error);
    return false;
  }
}

// Get total likes for a post
export async function getLikesCount(postId: string): Promise<number> {
  try {
    const result = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (result.error) {
      console.error('Error getting likes count:', result.error);
      return 0;
    }

    return result.count || 0;
  } catch (error) {
    console.error('Error getting likes count:', error);
    return 0;
  }
}