import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { viewReel, voteReelPlant, likeReel, unlikeReel, getReelLikeStatus, getReelLikesCount, addReelComment, getReelComments, getReelCommentCount, deleteReelComment } from '../lib/socialServices';
import { Reel } from '../lib/types';
import { ArrowLeft, Eye, Heart, MessageCircle, Share2, Send, Trash2, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { secureLog } from '../lib/secureLogger';

export default function FeedReels() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reelLikes, setReelLikes] = useState<Record<string, number>>({});
  const [reelLiked, setReelLiked] = useState<Record<string, boolean>>({});
  const [reelComments, setReelComments] = useState<Record<string, any[]>>({});
  const [reelCommentCounts, setReelCommentCounts] = useState<Record<string, number>>({});
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [sharedReelId, setSharedReelId] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [cachedReelsData, setCachedReelsData] = useState<Map<string, Reel>>(new Map()); // TODO: properly implement caching to avoid refetches

  useEffect(() => {
    const reelParam = searchParams.get('reel');
    if (reelParam) {
      setSharedReelId(reelParam);
      loadSpecificReel(reelParam);
    } else {
      loadReels();
    }
  }, [searchParams]);

  const loadReels = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get users that current user follows
      const { data: followingData } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = followingData?.map(f => f.following_id) || [];

      // Get reels from followers + own reels
      let userIdsToFetch = [...followingIds];
      if (user) {
        userIdsToFetch.push(user.id);
      }

      let query = supabase
        .from('reels')
        .select(`*,
          user:user_id(id, username, avatar_url, bio)
        `)
        .filter('expires_at', 'gt', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (userIdsToFetch.length > 0) {
        query = query.in('user_id', userIdsToFetch);
      }

      const { data } = await query;
      const reelsData = data || [];

      const likeStatus: Record<string, boolean> = {};
      const likeCounts: Record<string, number> = {};

      for (const reel of reelsData) {
        const likeStatusResult = await getReelLikeStatus(reel.id);
        const likeCountResult = await getReelLikesCount(reel.id);
        const commentCountResult = await getReelCommentCount(reel.id);
        const commentsResult = await getReelComments(reel.id);

        likeStatus[reel.id] = likeStatusResult.isLiked || false;
        likeCounts[reel.id] = likeCountResult.count || 0;
        reelCommentCounts[reel.id] = commentCountResult.count || 0;
        reelComments[reel.id] = commentsResult.data || [];
      }

      setReelCommentCounts(reelCommentCounts);
      setReelComments(reelComments);

      setReels(reelsData);
      setReelLiked(likeStatus);
      setReelLikes(likeCounts);
    } finally {
      setLoading(false);
    }
  };

  const loadSpecificReel = async (reelId: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const { data } = await supabase
        .from('reels')
        .select(`*,
          user:user_id(id, username, avatar_url, bio)
        `)
        .eq('id', reelId)
        .filter('expires_at', 'gt', new Date().toISOString())
        .single();

      if (data) {
        const likeStatusResult = await getReelLikeStatus(reelId);
        const likeCountResult = await getReelLikesCount(reelId);

        const reelData = [data];
        const likeStatus: Record<string, boolean> = {};
        const likeCounts: Record<string, number> = {};

        likeStatus[reelId] = likeStatusResult.isLiked || false;
        likeCounts[reelId] = likeCountResult.count || 0;

        setReels(reelData);
        setReelLiked(likeStatus);
        setReelLikes(likeCounts);
        setCurrentIndex(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewReel = async (reel: Reel) => {
    if (user) {
      await viewReel(reel.id, user.id);
    }
  };

  const handleShare = async (reel: Reel) => {
    const shareUrl = `${window.location.origin}/reels?reel=${reel.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Reel by ${reel.user?.username}`,
          text: reel.caption || 'Check out this reel!',
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled share or error occurred
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        // You could show a toast notification here
        alert('Link copied to clipboard!');
      } catch (err) {
        secureLog.error('[FeedReels] Copy link failed', err);
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < reels.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handlePlantVote = async (reelId: string, isPlant: boolean) => {
    await voteReelPlant(reelId, isPlant);
    // Update local state to show vote immediately without reloading
    setReels(prev => prev.map(r => {
      if (r.id === reelId) {
        return {
          ...r,
          plant_votes_yes: isPlant ? (r.plant_votes_yes || 0) + 1 : r.plant_votes_yes,
          plant_votes_no: !isPlant ? (r.plant_votes_no || 0) + 1 : r.plant_votes_no
        };
      }
      return r;
    }));
  };

  const handleLikeClick = async (reelId: string) => {
    const wasLiked = reelLiked[reelId];
    // Optimistic update
    setReelLiked(prev => ({ ...prev, [reelId]: !wasLiked }));
    setReelLikes(prev => ({ ...prev, [reelId]: (prev[reelId] || 0) + (wasLiked ? -1 : 1) }));

    if (reelLiked[reelId]) {
      await unlikeReel(reelId);
    } else {
      await likeReel(reelId);
    }
  };

  const handleAskAi = (reel: Reel) => {
    const question = `Please evaluate whether this video is about plants and if it should stay in the plant community: ${reel.caption || ''}`;
    localStorage.setItem('aiAssistantQuestion', question);
    window.dispatchEvent(new CustomEvent('openAiAssistant'));
  };

  const handleAddComment = async (reelId: string) => {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const result = await addReelComment(reelId, commentText);
      if (!result.error) {
        // Reload comments
        const commentsResult = await getReelComments(reelId);
        const newComments = { ...reelComments };
        newComments[reelId] = commentsResult.data || [];
        setReelComments(newComments);
        
        // Update comment count
        const countResult = await getReelCommentCount(reelId);
        const newCounts = { ...reelCommentCounts };
        newCounts[reelId] = countResult.count || 0;
        setReelCommentCounts(newCounts);
        
        setCommentText('');
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string, reelId: string) => {
    await deleteReelComment(commentId);
    const commentsResult = await getReelComments(reelId);
    const newComments = { ...reelComments };
    newComments[reelId] = commentsResult.data || [];
    setReelComments(newComments);
    
    const countResult = await getReelCommentCount(reelId);
    const newCounts = { ...reelCommentCounts };
    newCounts[reelId] = countResult.count || 0;
    setReelCommentCounts(newCounts);
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-gray-400">Loading reels...</div>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-green-400 hover:text-green-300 mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No reels available</p>
            <p className="text-sm mt-2">Follow users to see their reels</p>
          </div>
        </div>
      </div>
    );
  }

  const currentReel = reels[currentIndex];

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-[#34D399] hover:text-[#16A34A] mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        {/* Reel Container */}
        <div className="relative bg-gray-900 rounded-2xl overflow-hidden border border-[#34D399]/30 h-[500px] sm:h-[600px] flex items-center justify-center group shadow-2xl">
          <video
            key={currentReel.id}
            src={currentReel.video_url}
            className="w-full h-full object-contain"
            autoPlay
            loop
            muted
            onPlay={() => handleViewReel(currentReel)}
          />

          {/* Share Button */}
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => handleShare(currentReel)}
              className="p-2 bg-[#34D399] text-black rounded-full hover:bg-[#16A34A] transition shadow-lg shadow-[#34D399]/20"
              title="Share Reel"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Overlay Info */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/50 to-transparent p-4">
            <div className="flex items-center gap-3 mb-3">
              {currentReel.user?.avatar_url && (
                <img
                  src={currentReel.user.avatar_url}
                  alt={currentReel.user.username}
                  className="w-10 h-10 rounded-full object-cover"
                />
              )}
              <div>
                <p className="text-white font-semibold text-sm">
                  {currentReel.user?.username}
                </p>
                <p className="text-gray-300 text-xs">{currentReel.user?.bio}</p>
              </div>
            </div>
            {currentReel.caption && (
              <p className="text-white text-sm mb-2">{currentReel.caption}</p>
            )}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-gray-300 text-xs">
                <Eye className="w-3 h-3" /> {currentReel.viewers?.length || 0}
              </div>
              <button
                onClick={() => handleLikeClick(currentReel.id)}
                className={`flex items-center gap-1 text-xs font-bold ${reelLiked[currentReel.id] ? 'text-[#16A34A]' : 'text-[#34D399]'}`}
              >
                <Heart className="w-3 h-3" /> {reelLikes[currentReel.id] || 0}
              </button>
              <button
                onClick={() => setShowComments(!showComments)}
                className="flex items-center gap-1 text-gray-300 text-xs hover:text-[#34D399]"
              >
                <MessageCircle className="w-3 h-3" /> {reelCommentCounts[currentReel.id] || 0}
              </button>
              <button
                onClick={() => handleAskAi(currentReel)}
                className="text-xs text-[#34D399] hover:text-[#16A34A]"
              >
                Ask AI about this
              </button>
            </div>
          </div>

          {!currentReel.approved && currentReel.poll_expires_at && new Date(currentReel.poll_expires_at) > new Date() && (
            <div className="absolute top-4 left-4 bg-black/70 text-white p-3 rounded-lg border border-[#34D399]/40 text-xs">
              <p className="font-semibold mb-2">Plant poll: Is this reel about plants?</p>
              <div className="flex gap-2">
                <button onClick={() => handlePlantVote(currentReel.id, true)} className="px-2 py-1 bg-[#34D399] text-black rounded">Yes</button>
                <button onClick={() => handlePlantVote(currentReel.id, false)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">No</button>
              </div>
              <p className="mt-2 text-gray-200">Yes: {currentReel.plant_votes_yes || 0}, No: {currentReel.plant_votes_no || 0}</p>
              <p className="mt-1 text-gray-400 text-xs">Poll ends {new Date(currentReel.poll_expires_at).toLocaleString()}</p>
            </div>
          )}

          {/* Navigation Arrows */}
          {currentIndex > 0 && (
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 text-white p-2 rounded-full hover:bg-black/80 transition z-10"
            >
              ← Previous
            </button>
          )}
          {currentIndex < reels.length - 1 && (
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 text-white p-2 rounded-full hover:bg-black/80 transition z-10"
            >
              Next →
            </button>
          )}

          {/* Pagination dots */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1">
            {reels.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition ${
                  i === currentIndex ? 'bg-white w-6' : 'bg-gray-500'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 text-center text-gray-400">
          <p className="text-sm">
            Reel {currentIndex + 1} of {reels.length}
          </p>
          <p className="text-xs mt-2 text-[#34D399]">Suggested for you based on recent plant content</p>
        </div>

        {/* Plant Poll Section */}
        {!currentReel.approved && currentReel.poll_expires_at && new Date(currentReel.poll_expires_at) > new Date() && (
          <div className="mt-6 bg-gray-900 p-4 rounded-lg border border-[#34D399]/30">
            <p className="text-white font-semibold mb-3">🌱 Is this reel about plants?</p>
            <div className="flex gap-3 mb-3">
              <button 
                onClick={() => handlePlantVote(currentReel.id, true)} 
                className="flex-1 px-4 py-2 bg-[#34D399] text-black rounded font-semibold hover:bg-[#16A34A] transition"
              >
                ✓ Yes, it's about plants
              </button>
              <button 
                onClick={() => handlePlantVote(currentReel.id, false)} 
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-700 transition"
              >
                ✗ No, not about plants
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#34D399]/10 p-2 rounded text-center">
                <p className="text-[#34D399] font-bold">{currentReel.plant_votes_yes || 0}</p>
                <p className="text-gray-300">Yes votes</p>
              </div>
              <div className="bg-red-600/10 p-2 rounded text-center">
                <p className="text-red-400 font-bold">{currentReel.plant_votes_no || 0}</p>
                <p className="text-gray-300">No votes</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Poll ends {new Date(currentReel.poll_expires_at).toLocaleString()}</p>
          </div>
        )}

        {/* Comments Section */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Comments ({reelCommentCounts[currentReel.id] || 0})</h3>
            <button
              onClick={() => setShowComments(!showComments)}
              className="text-[#34D399] hover:text-[#16A34A] text-sm font-semibold"
            >
              {showComments ? 'Hide' : 'Show'}
            </button>
          </div>

          {showComments && (
            <>
              {/* Comment Input */}
              <div className="mb-4 flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-[#34D399] focus:outline-none text-sm"
                />
                <button
                  onClick={() => handleAddComment(currentReel.id)}
                  disabled={submittingComment || !commentText.trim()}
                  className="px-4 py-2 bg-[#34D399] text-black rounded font-semibold hover:bg-[#16A34A] disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {/* Comments List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {reelComments[currentReel.id] && reelComments[currentReel.id].length > 0 ? (
                  reelComments[currentReel.id].map((comment: any) => (
                    <div key={comment.id} className="bg-gray-800 p-3 rounded border border-gray-700">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {comment.user?.avatar_url && (
                            <img
                              src={comment.user.avatar_url}
                              alt={comment.user.username}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          )}
                          <div>
                            <p className="text-white text-sm font-semibold">{comment.user?.username}</p>
                            <p className="text-gray-400 text-xs">
                              {new Date(comment.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {user?.id === comment.user_id && (
                          <button
                            onClick={() => handleDeleteComment(comment.id, currentReel.id)}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-gray-200 text-sm">{comment.content}</p>
                      {comment.flagged_for_profanity && (
                        <p className="text-yellow-500 text-xs mt-1">⚠️ Contains flagged language</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm text-center py-4">No comments yet. Be the first!</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Suggestions */}
        <div className="mt-6 text-left text-white text-sm">
          <p className="font-semibold mb-2">Suggestion Reels</p>
          {reels.slice(0, 3).map((suggested) => (
            <button
              key={suggested.id}
              onClick={() => setCurrentIndex(reels.findIndex((r) => r.id === suggested.id))}
              className="block w-full text-left p-2 mb-1 rounded border border-[#34D399]/20 hover:bg-[#34D399]/10"
            >
              {suggested.user?.username}: {suggested.caption || 'No caption'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

