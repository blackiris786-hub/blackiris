import { supabase } from './supabase';
import { Profile, Message, Reel, Notification, POINT_ACTIONS, Post } from './types';
import { secureLog } from './secureLogger';

// Send message to another user
export async function sendMessage(recipientId: string, content: string) {
  const result = await supabase
    .from('messages')
    .insert([{ recipient_id: recipientId, content }])
    .select('*')
    .single();

  return { data: result.data, error: result.error };
}

// Get conversation between two users
export async function getMessages(userId: string, otherUserId: string) {
  const result = await supabase
    .from('messages')
    .select(`
      *,
      sender:sender_id(username, avatar_url),
      recipient:recipient_id(username, avatar_url)
    `)
    .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
    .order('created_at', { ascending: true });

  return { data: result.data as Message[] | null, error: result.error };
}

// Mark a single message as read
export async function markMessageAsRead(messageId: string) {
  const result = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('id', messageId);

  return { error: result.error };
}

// Get all conversations for this user
export async function getConversations(userId: string) {
  const result = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (!result.data) return { data: null, error: result.error };

  const convMap = new Map();
  result.data.forEach((msg: Message) => {
    const other = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
    if (!convMap.has(other)) {
      convMap.set(other, msg);
    }
  });

  return { data: Array.from(convMap.values()), error: result.error };
}

// Get follower and following counts for a user
export async function getProfileCounts(userId: string): Promise<{ followers_count: number; following_count: number; error: Error | null }> {
  const result = await supabase
    .from('profiles')
    .select('followers_count, following_count')
    .eq('id', userId)
    .single();

  if (result.error) return { followers_count: 0, following_count: 0, error: result.error };
  return { 
    followers_count: result.data.followers_count || 0, 
    following_count: result.data.following_count || 0, 
    error: null 
  };
}

// Follow another user
export async function followUser(followingId: string, currentUserId?: string) {
  let userId = currentUserId;
  
  if (!userId) {
    const auth = await supabase.auth.getUser();
    const user = auth.data.user;
    if (!user) {
      return { data: null, error: new Error('Not authenticated') };
    }
    userId = user.id;
  }

  // Can't follow yourself
  if (userId === followingId) {
    return { data: null, error: new Error('Cannot follow yourself') };
  }

  secureLog.logOperation('followUser', userId, followingId);

  const result = await supabase
    .from('followers')
    .insert([{ follower_id: userId, following_id: followingId }])
    .select();

  if (result.error) {
    secureLog.logError('followUser: Insert failed', result.error, userId);
    if (result.error.code === '23505') {
      // Already following, not an error
      return { data: null, error: null };
    }
    return { data: null, error: result.error };
  }

  // Update counts
  try {
    await supabase
      .from('profiles')
      .update({ following_count: supabase.raw('following_count + 1') })
      .eq('id', userId);

    await supabase
      .from('profiles')
      .update({ followers_count: supabase.raw('followers_count + 1') })
      .eq('id', followingId);

    secureLog.debug('[followUser] Profile counts updated');
  } catch (err) {
    console.warn('Failed to update profile counts:', err);
  }

  // Send notifications
  try {
    const auth = await supabase.auth.getUser();
    const user = auth.data.user;
    const name = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Someone';
    
    secureLog.logOperation('followUser: notification', userId, followingId);
    await createNotification(followingId, 'follow', `${name} started following you`, userId);
    
    const follow = await checkFollowStatus(userId, followingId);
    if (follow.isFollowing) {
      secureLog.debug('[followUser] Creating follow_back notification');
      await createNotification(userId, 'follow_back', `${name} followed you back!`, followingId);
    }
  } catch (err) {
    console.warn('Follow notification failed:', err);
  }

  return { data: result.data, error: null };
}

// Unfollow a user
export async function unfollowUser(followingId: string, currentUserId?: string) {
  let userId = currentUserId;
  
  if (!userId) {
    const auth = await supabase.auth.getUser();
    const user = auth.data.user;
    if (!user) {
      return { error: new Error('Not authenticated') };
    }
    userId = user.id;
  }

  const result = await supabase
    .from('followers')
    .delete()
    .match({ follower_id: userId, following_id: followingId });

  if (result.error && result.error.code !== 'PGRST116') {
    return { error: result.error };
  }

  // Decrement counts
  try {
    await supabase
      .from('profiles')
      .update({ following_count: supabase.raw('GREATEST(following_count - 1, 0)') })
      .eq('id', userId);

    await supabase
      .from('profiles')
      .update({ followers_count: supabase.raw('GREATEST(followers_count - 1, 0)') })
      .eq('id', followingId);

    secureLog.debug('[unfollowUser] Profile counts updated');
  } catch (err) {
    console.warn('Failed to update profile counts:', err);
  }

  return { error: null };
}

// Check if user is following another user
export async function checkFollowStatus(followingId: string, followerId?: string) {
  let currentUserId = followerId;

  if (!currentUserId) {
    const auth = await supabase.auth.getUser();
    currentUserId = auth.data.user?.id;
  }

  const result = await supabase
    .from('followers')
    .select('follower_id')
    .match({
      follower_id: currentUserId,
      following_id: followingId
    })
    .maybeSingle();

  return { isFollowing: !!result.data, error: result.error };
}

// Get list of followers for a user
export async function getFollowers(userId: string) {
  const result = await supabase
    .from('followers')
    .select(`
      follower:follower_id(id, username, avatar_url, bio, followers_count, following_count)
    `)
    .eq('following_id', userId);

  return { data: result.data || [], error: result.error };
}

// Get list of users this user is following
export async function getFollowing(userId: string) {
  const result = await supabase
    .from('followers')
    .select(`
      user:following_id(id, username, avatar_url, bio, followers_count, following_count)
    `)
    .eq('follower_id', userId);

  return { data: result.data || [], error: result.error };
}

// Upload a new reel (video story)
export async function uploadReel(videoUrl: string, thumbnailUrl: string | null, caption: string | null) {
  const auth = await supabase.auth.getUser();
  const user = auth.data.user;
  if (!user) return { data: null, error: new Error('Not authenticated') };

  const expireTime = new Date();
  expireTime.setHours(expireTime.getHours() + 24);

  const result = await supabase
    .from('reels')
    .insert([{ 
      user_id: user.id,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      caption,
      approved: false,
      plant_votes_yes: 0,
      plant_votes_no: 0,
      poll_expires_at: expireTime.toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }])
    .select('*')
    .single();

  if (!result.error && result.data) {
    // Award points for uploading reel
    await addPoints('UPLOAD_PHOTO');
  }

  return { data: result.data as Reel | null, error: result.error };
}

// Vote on whether a reel shows a real plant
export async function voteReelPlant(reelId: string, isPlant: boolean) {
  const auth = await supabase.auth.getUser();
  const user = auth.data.user;
  if (!user) return { error: new Error('Not authenticated') };

  const vote = await supabase
    .from('reel_poll_votes')
    .insert([{ user_id: user.id, reel_id: reelId, is_plant: isPlant }]);

  if (vote.error) {
    return { error: vote.error };
  }

  // Fetch current votes
  const reel = await supabase
    .from('reels')
    .select('plant_votes_yes, plant_votes_no')
    .eq('id', reelId)
    .single();

  if (reel.error || !reel.data) {
    return { error: reel.error || new Error('Reel not found') };
  }

  // Update vote count
  const newVotes = isPlant
    ? { plant_votes_yes: (reel.data.plant_votes_yes || 0) + 1 }
    : { plant_votes_no: (reel.data.plant_votes_no || 0) + 1 };

  const update = await supabase
    .from('reels')
    .update(newVotes)
    .eq('id', reelId);

  return { error: update.error };
}

// Like a reel
export async function likeReel(reelId: string) {
  const auth = await supabase.auth.getUser();
  const user = auth.data.user;
  if (!user) return { error: new Error('Not authenticated') };

  const result = await supabase
    .from('reel_likes')
    .insert([{ user_id: user.id, reel_id: reelId }]);

  return { error: result.error };
}

// Unlike a reel
export async function unlikeReel(reelId: string) {
  const auth = await supabase.auth.getUser();
  const user = auth.data.user;
  if (!user) return { error: new Error('Not authenticated') };

  const result = await supabase
    .from('reel_likes')
    .delete()
    .eq('reel_id', reelId)
    .eq('user_id', user.id);

  return { error: result.error };
}

// Check if current user liked a reel
export async function getReelLikeStatus(reelId: string) {
  const auth = await supabase.auth.getUser();
  const user = auth.data.user;
  if (!user) return { isLiked: false, error: null };

  const result = await supabase
    .from('reel_likes')
    .select('id')
    .eq('reel_id', reelId)
    .eq('user_id', user.id)
    .single();

  if (result.error && result.error.code !== 'PGRST116') {
    return { isLiked: false, error: result.error };
  }

  return { isLiked: !!result.data, error: null };
}

// Get total likes count for a reel
export async function getReelLikesCount(reelId: string) {
  const result = await supabase
    .from('reel_likes')
    .select('*', { count: 'exact', head: true })
    .eq('reel_id', reelId);

  return { count: result.count || 0, error: result.error };
}

// Check and approve/reject reels based on poll results
export async function processReelPolls() {
  const result = await supabase
    .from('reels')
    .select('*')
    .lte('poll_expires_at', new Date().toISOString())
    .eq('approved', false);

  if (result.error || !result.data) return { error: result.error };

  for (const reel of result.data as Reel[]) {
    const yesVotes = reel.plant_votes_yes || 0;
    const noVotes = reel.plant_votes_no || 0;

    if (yesVotes >= noVotes && yesVotes > 0) {
      // Reel approved
      await supabase
        .from('reels')
        .update({ approved: true })
        .eq('id', reel.id);

      await addPointsForReel(reel.user_id, 20);
    } else {
      // Reel rejected - delete it
      await supabase
        .from('reels')
        .delete()
        .eq('id', reel.id);
    }
  }

  return { error: null };
}

// Award points when reel is approved
async function addPointsForReel(userId: string, points: number) {
  const profile = await supabase
    .from('profiles')
    .select('points')
    .eq('id', userId)
    .single();

  if (profile.error || !profile.data) return;

  const newPoints = (profile.data.points || 0) + points;
  await supabase.from('profiles').update({ points: newPoints }).eq('id', userId);

  await supabase.from('points_log').insert([{ 
    user_id: userId, 
    action: 'REEL_APPROVED', 
    points_earned: points, 
    description: 'Reel approved by community plant poll' 
  }]);
}


// Get reels for feed
export async function getReels(followingIds: string[] = []) {
  // Clean up expired polls first
  await processReelPolls();

  let query = supabase
    .from('reels')
    .select(`
      *,
      user:user_id(id, username, avatar_url, bio)
    `)
    .or(`approved.eq.true,poll_expires_at.gt.${new Date().toISOString()}`)
    .filter('expires_at', 'gt', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (followingIds.length > 0) {
    query = query.in('user_id', followingIds);
  }

  const result = await query;

  return { data: result.data as Reel[] | null, error: result.error };
}

// Record that user viewed a reel
export async function viewReel(reelId: string, userId: string) {
  const reel = await supabase
    .from('reels')
    .select('*')
    .eq('id', reelId)
    .single();

  if (reel.error || !reel.data) {
    return { error: reel.error };
  }

  const viewers = reel.data.viewers || [];
  
  // Only add if not already viewed
  if (!viewers.includes(userId)) {
    viewers.push(userId);
    const update = await supabase
      .from('reels')
      .update({ viewers })
      .eq('id', reelId);

    return { error: update.error };
  }

  return { error: null };
}

// Search for users
export async function searchUsers(query: string) {
  if (!query.trim()) return { data: [], error: null };

  const result = await supabase
    .from('profiles')
    .select('id, username, email, avatar_url, bio, points, followers_count, following_count')
    .ilike('username', `%${query}%`)
    .limit(20);

  return { data: result.data || [], error: result.error };
}

// Get suggested users to follow
export async function getSuggestedUsers() {
  const auth = await supabase.auth.getUser();
  const user = auth.data.user;
  if (!user) return { data: [], error: null };

  const result = await supabase
    .from('profiles')
    .select('id, username, avatar_url, bio, points')
    .neq('id', user.id)
    .order('points', { ascending: false })
    .limit(5);
    
  return { data: result.data, error: result.error };
}

// Get profile by email
export async function getUserByEmail(email: string) {
  const result = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  return { data: result.data, error: result.error };
}

// Award points for user actions
export async function addPoints(action: keyof typeof POINT_ACTIONS) {
  try {
    const config = POINT_ACTIONS[action];
    if (!config) {
      console.error('Unknown action:', action);
      return { error: new Error('Unknown action') };
    }

    const auth = await supabase.auth.getUser();
    const user = auth.data.user;
    if (!user) {
      secureLog.error('addPoints: Not authenticated', new Error('No auth'));
      return { error: new Error('No authenticated user') };
    }

    // Get current points
    const profile = await supabase
      .from('profiles')
      .select('points')
      .eq('id', user.id)
      .single();

    if (profile.error) {
      console.error('Error getting current points:', profile.error);
      return { error: profile.error };
    }

    const currentPts = profile.data?.points || 0;
    const newPts = currentPts + config.points;

    // Update points
    const update = await supabase
      .from('profiles')
      .update({ points: newPts })
      .eq('id', user.id);

    if (update.error) {
      console.error('Error updating points:', update.error);
      return { error: update.error };
    }

    // Log the transaction
    const log = await supabase
      .from('points_log')
      .insert([{
        user_id: user.id,
        action,
        points_earned: config.points,
        description: config.description,
      }]);

    if (log.error) {
      console.error('Error logging points:', log.error);
      // Don't fail - points already added
    }

    return { error: null };
  } catch (err) {
    console.error('Unexpected error in addPoints:', err);
    return { error: err as Error };
  }
}

// Get points for a user
export async function getUserPoints(userId: string) {
  const result = await supabase
    .from('profiles')
    .select('points')
    .eq('id', userId)
    .single();

  return { points: result.data?.points || 0, error: result.error };
}

// Get points history/log for a user
export async function getPointsHistory(userId: string, limit: number = 20) {
  const result = await supabase
    .from('points_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data: result.data as any[] | null, error: result.error };
}

// Create a notification for a user
export async function createNotification(userId: string, type: 'follow' | 'follow_back' | 'like' | 'comment' | 'message', message: string, fromUserId?: string) {
  let notifyFromId = fromUserId;
  
  if (!notifyFromId) {
    const auth = await supabase.auth.getUser();
    const user = auth.data.user;
    if (!user) {
      console.error('createNotification: Not authenticated');
      return { data: null, error: new Error('Not authenticated') };
    }
    notifyFromId = user.id;
  }

  secureLog.debug('[createNotification] Creating notification', { for: userId, type, from: notifyFromId });
  console.log('[createNotification] Payload:', { user_id: userId, type, from_user_id: notifyFromId, message });

  try {
    const result = await supabase
      .from('notifications')
      .insert([{ user_id: userId, type, from_user_id: notifyFromId, message }])
      .select();

    if (result.error) {
      console.error('[createNotification] Supabase error:', {
        code: result.error.code,
        message: result.error.message,
        details: result.error.details,
        hint: result.error.hint,
        status: (result.error as any).status
      });
      secureLog.error('[socialServices] Error creating notification', result.error);
      return { data: null, error: result.error };
    } else {
      secureLog.debug('[socialServices] Notification created', result.data);
      return { data: result.data ? result.data[0] : null, error: null };
    }
  } catch (err) {
    console.error('[createNotification] Exception:', err);
    return { data: null, error: err as Error };
  }
}

// Get notifications for user
export async function getNotifications(userId?: string) {
  const auth = await supabase.auth.getUser();
  const targetId = userId || auth.data.user?.id;
  if (!targetId) {
    return { data: null, error: new Error('Not authenticated') };
  }

  const result = await supabase
    .from('notifications')
    .select(`
      *,
      from_user:from_user_id(username, avatar_url)
    `)
    .eq('user_id', targetId)
    .order('created_at', { ascending: false })
    .limit(50);

  return { data: result.data as Notification[] | null, error: result.error };
}

// Mark one notification as read
export async function markNotificationAsRead(notificationId: string) {
  const result = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);

  return { error: result.error };
}

// Count unread notifications
export async function getUnreadNotificationCount(userId?: string) {
  const auth = await supabase.auth.getUser();
  const targetId = userId || auth.data.user?.id;
  if (!targetId) {
    return { count: 0, error: new Error('Not authenticated') };
  }

  const result = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', targetId)
    .is('read_at', null);

  return { count: result.count || 0, error: result.error };
}

// Filter profanity from text
const BANNED_WORDS = [
  'badword1', 'badword2', 'badword3', 'offensive', 'inappropriate',
  'spam', 'hate', 'abuse', 'curse', 'profane'
];

export function filterProfanity(text: string): { filtered: string; hasProfanity: boolean } {
  let hasProfanity = false;
  let filtered = text;

  BANNED_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(filtered)) {
      hasProfanity = true;
    }
    filtered = filtered.replace(regex, '*'.repeat(word.length));
  });

  return { filtered, hasProfanity };
}

// Add comment to a reel
export async function addReelComment(reelId: string, content: string) {
  const auth = await supabase.auth.getUser();
  const user = auth.data.user;
  if (!user) return { data: null, error: new Error('Not authenticated') };

  const { filtered, hasProfanity } = filterProfanity(content);

  const result = await supabase
    .from('reel_comments')
    .insert([{
      user_id: user.id,
      reel_id: reelId,
      content: filtered,
      flagged_for_profanity: hasProfanity,
    }])
    .select(`
      *,
      user:user_id(id, username, avatar_url)
    `)
    .single();

  if (!result.error && result.data && hasProfanity) {
    // Notify reel owner about profanity
    const reel = await supabase.from('reels').select('user_id').eq('id', reelId).single();
    if (reel.data) {
      await createNotification(
        reel.data.user_id,
        'comment',
        `A comment with profanity was flagged on your reel`
      );
    }
  }

  return { data: result.data, error: result.error };
}

// Get comments for a reel
export async function getReelComments(reelId: string) {
  const result = await supabase
    .from('reel_comments')
    .select(`
      *,
      user:user_id(id, username, avatar_url)
    `)
    .eq('reel_id', reelId)
    .order('created_at', { ascending: false });

  return { data: result.data || [], error: result.error };
}

// Delete a reel comment
export async function deleteReelComment(commentId: string) {
  const auth = await supabase.auth.getUser();
  const user = auth.data.user;
  if (!user) return { error: new Error('Not authenticated') };

  const result = await supabase
    .from('reel_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', user.id);

  return { error: result.error };
}

// Count comments on a reel
export async function getReelCommentCount(reelId: string) {
  const result = await supabase
    .from('reel_comments')
    .select('*', { count: 'exact', head: true })
    .eq('reel_id', reelId);

  return { count: result.count || 0, error: result.error };
}
