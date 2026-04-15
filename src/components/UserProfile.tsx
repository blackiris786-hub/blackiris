import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, Post } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Mail, Film, X, Users, PlusCircle } from 'lucide-react';
import { PostCard } from './PostCard';
import { UploadReel } from './UploadReel';
import { Logo } from './Logo';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeToggle } from './ThemeToggle';
import { Profile, Reel } from '../lib/types';
import { checkFollowStatus, followUser, unfollowUser } from '../lib/socialServices';
import { secureLog } from '../lib/secureLogger';

export function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followsMe, setFollowsMe] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [showUploadReel, setShowUploadReel] = useState(false);
  const [showTab, setShowTab] = useState<'posts' | 'reels'>('posts');
  const [showListModal, setShowListModal] = useState<{ type: 'followers' | 'following', data: Profile[] } | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [cachedProfiles, setCachedProfiles] = useState<Map<string, Profile>>(new Map()); // TODO: actually use this for performance
  const { user } = useAuth();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const followChannelRef = useRef<any>();

  const loadProfile = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // get the profile first
      const result = await supabase
        .from('profiles')
        .select('*, followers_count, following_count')
        .eq('id', userId!)
        .single();

      if (result.error || !result.data) {
        setProfile(null);
        return;
      }

      const profile = result.data as Profile;
      setProfile(profile);

      // fetch actual counts from followers table
      const followerRes = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

      const followingRes = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);

      setFollowerCount(followerRes.count ?? profile.followers_count ?? 0);
      setFollowingCount(followingRes.count ?? profile.following_count ?? 0);

      // check if user is following this profile
      if (user?.id !== userId) {
        const status = await checkFollowStatus(userId!, user!.id);
        setIsFollowing(status.isFollowing);

        const followsBack = await supabase
          .from('followers')
          .select('follower_id')
          .eq('follower_id', userId!)
          .eq('following_id', user!.id)
          .maybeSingle();
        setFollowsMe(!!followsBack.data);
      }

      // get posts and reels
      const postsResult = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      setPosts(postsResult.data || []);

      const reelsResult = await supabase
        .from('reels')
        .select('*')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      setReels(reelsResult.data || []);

    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, user]);

  // realtime updates for follower/following counts and follow status
  useEffect(() => {
    if (!userId || !user?.id) return;

    // listen for profile count updates
    const channel = supabase
      .channel('profile-counts')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            setFollowerCount(payload.new.followers_count || 0);
            setFollowingCount(payload.new.following_count || 0);
          }
        }
      )
      .subscribe();

    // listen for follow/unfollow changes
    followChannelRef.current = supabase
      .channel(`follow-${user.id}`)
      .on('postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'followers', 
          filter: `following_id=eq.${userId}` 
        },
        () => checkFollowStatus(userId!, user.id).then(({ isFollowing }) => setIsFollowing(isFollowing))
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (followChannelRef.current) {
        supabase.removeChannel(followChannelRef.current);
      }
    };
  }, [userId, user?.id]);

  const loadFollowList = async (type: 'followers' | 'following') => {
    if (!userId) return;
    setListLoading(true);
    try {
      const query = type === 'followers' 
        ? supabase.from('followers').select('follower:follower_id(*)').eq('following_id', userId)
        : supabase.from('followers').select('user:following_id(*)').eq('follower_id', userId);
      
      const result = await query;
      
      if (result.error) throw result.error;
      
      const profiles = (result.data as any[]).map(item => 
        type === 'followers' ? item.follower : item.user
      ).filter(Boolean);
      
      setShowListModal({ type, data: profiles });
    } catch (error) {
      console.error(`Error loading ${type}:`, error);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleFollow = async () => {
    if (!user || userId === user?.id || followLoading) {
      return;
    }

    setFollowLoading(true);

    try {
      let error;
      if (isFollowing) {
        // unfollow
        const result = await unfollowUser(userId!, user!.id);
        error = result.error;
      } else {
        // follow
        const result = await followUser(userId!, user!.id);
        error = result.error;
      }

      if (error) throw error;

      // reload to get fresh state
      await loadProfile();
    } catch (error: any) {
      secureLog.error('[UserProfile] Follow failed', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleSendMessage = () => {
    navigate(`/messages?user=${userId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-4 flex items-center justify-center">
        <div className="text-center">
          <Logo className="w-16 h-16 text-[#34D399] mx-auto mb-4" iconClassName="w-full h-full" animate />
          <div className="text-gray-400">{t('loadingProfile')}</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black p-4">
        <button onClick={() => window.history.back()} className="flex items-center gap-2 text-[#34D399] hover:text-[#16A34A] mb-6">
          <ArrowLeft className="w-5 h-5" />
          {t('back')}
        </button>
        <div className="text-center text-gray-400">{t('profileNotFound')}</div>
      </div>
    );
  }

  const isOwnProfile = user?.id === userId;

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-black' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-40 ${theme === 'dark' ? 'bg-gray-900 border-[#34D399]/20' : 'bg-white border-gray-200'} border-b p-4`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-[#34D399] hover:text-[#16A34A]"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('back')}
          </button>
          <ThemeToggle />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Profile Header */}
        <div className={`${theme === 'dark' ? 'bg-gray-900 border-[#34D399]/20' : 'bg-white border-gray-200'} rounded-lg border p-6 mb-6`}>
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>{profile.username}</h1>
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-4`}>{profile.bio || t('noBio')}</p>

              <div className="flex gap-6 mb-4">
                <div>
                  <div className="text-2xl font-bold text-[#34D399] animate-pulse">
                    {posts.length}
                  </div>
                  <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{t('posts') || 'Posts'}</div>
                </div>
                <button 
                  onClick={() => loadFollowList('followers')} 
                  className="text-left hover:opacity-80 transition-all hover:scale-105 cursor-pointer"
                  disabled={listLoading}
                >
                  <div className="text-2xl font-bold text-[#34D399]">
                    {followerCount}
                  </div>
                  <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{t('followers') || 'Followers'}</div>
                </button>
                <button 
                  onClick={() => loadFollowList('following')} 
                  className="text-left hover:opacity-80 transition-all hover:scale-105 cursor-pointer"
                  disabled={listLoading}
                >
                  <div className="text-2xl font-bold text-[#34D399]">
                    {followingCount}
                  </div>
                  <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{t('following') || 'Following'}</div>
                </button>
                <div>
                  <div className="text-2xl font-bold text-[#34D399]">
                    {profile.points}
                  </div>
                  <div className="text-sm text-gray-400">{t('points')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {!isOwnProfile && (
            <div className="flex gap-3">
              <button
                onClick={handleFollow}
                disabled={followLoading || userId === user?.id}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all duration-200 ${
                  followLoading 
                    ? 'opacity-50 cursor-not-allowed' 
                    : isFollowing
                    ? 'bg-gray-700 text-gray-300 hover:bg-red-900/50 border border-gray-600 hover:border-red-500'
                    : 'bg-[#34D399] text-black hover:bg-[#16A34A]'
                }`}
              >
                {followLoading ? '...' : isFollowing ? 'Following' : '+ Follow'}
              </button>
              
              {isFollowing && followsMe && (
                <button
                  onClick={handleSendMessage}
                  className="py-2 px-4 bg-[#34D399] text-black rounded-lg font-semibold hover:bg-[#16A34A] transition-all flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  {t('message')}
                </button>
              )}
              
              {isFollowing && !followsMe && (
                <div className="flex-1 py-2 px-4 rounded-lg bg-gray-800/50 text-gray-400 text-xs flex items-center justify-center border border-gray-700 italic">
                  Follow back to message
                </div>
              )}
            </div>
          )}

          {isOwnProfile && (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('/edit-profile')}
                className="flex-1 py-2.5 px-4 bg-[#34D399] text-black rounded-lg font-bold hover:bg-[#16A34A] transition-all active:scale-95"
              >
                {t('editProfile')}
              </button>
              <button
                onClick={() => setShowUploadReel(true)}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-[#34D399] to-[#16A34A] text-black rounded-lg font-bold hover:from-[#16A34A] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#34D399]/20 active:scale-95"
              >
                <PlusCircle className="w-5 h-5" /> Share Reel
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div>
          <div className="flex gap-4 mb-6 border-b border-gray-800">
            <button
              onClick={() => setShowTab('posts')}
              className={`pb-4 px-4 font-semibold text-lg transition-colors ${
                showTab === 'posts'
                  ? 'text-[#34D399] border-b-2 border-[#34D399]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t('posts')} ({posts.length})
            </button>
            <button
              onClick={() => setShowTab('reels')}
              className={`pb-4 px-4 font-semibold text-lg transition-colors flex items-center gap-2 ${
                showTab === 'reels'
                  ? 'text-[#34D399] border-b-2 border-[#34D399]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Film className="w-5 h-5" />
              Reels ({reels.length})
            </button>
          </div>

          {showTab === 'posts' && (
            posts.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                {t('noPostsYet')}
              </div>
            ) : (
              <div className="space-y-6">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )
          )}

          {showTab === 'reels' && (
            reels.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Film className="w-12 h-12 mx-auto mb-4 opacity-50" />
                No reels yet
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {reels.map((reel) => (
                  <div
                    key={reel.id}
                    className="relative bg-gray-900 rounded-lg overflow-hidden border border-gray-800 hover:border-[#34D399]/50 transition-all group cursor-pointer aspect-video"
                  >
                    {reel.thumbnail_url && (
                      <img
                        src={reel.thumbnail_url}
                        alt="Reel"
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition flex items-center justify-center">
                      <Film className="w-8 h-8 text-white opacity-75 group-hover:opacity-100 transition" />
                    </div>
                    {reel.caption && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
                        <p className="text-sm text-white line-clamp-2">{reel.caption}</p>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 text-xs text-gray-300 bg-black/50 px-2 py-1 rounded">
                      {reel.viewers?.length || 0} views
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {showUploadReel && (
        <UploadReel
          onSuccess={() => { 
            setShowUploadReel(false); 
            loadProfile(); 
          }}
          onCancel={() => setShowUploadReel(false)}
        />
      )}

      {/* Followers/Following Modal */}
      {showListModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-[#34D399]/30 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white capitalize">
                {showListModal.type}s ({showListModal.data.length})
              </h3>
              <button 
                onClick={() => setShowListModal(null)}
                className="p-2 text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {showListModal.data.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  No {showListModal.type}s found
                </div>
              ) : (
                showListModal.data.map((p: Profile) => (
                  <div 
                    key={p.id} 
                    className="flex items-center p-3 rounded-xl bg-gray-800/30 hover:bg-gray-800/50 transition-all border border-transparent hover:border-[#34D399]/20 cursor-pointer"
                    onClick={() => {
                      setShowListModal(null);
                      navigate(`/profile/${p.id}`);
                    }}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} className="w-10 h-10 rounded-full object-cover border-2 border-[#34D399]/20" alt="" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-[#34D399] font-bold text-lg">
                          {p.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-semibold text-sm truncate">{p.username}</p>
                        <p className="text-gray-400 text-xs line-clamp-1">{p.bio || 'No bio'}</p>
                        {(p.followers_count || p.following_count) && (
                          <p className="text-xs text-gray-500">
                            {p.followers_count} followers • {p.following_count} following
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


