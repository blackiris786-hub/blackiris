import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getReels, viewReel, voteReelPlant } from '../lib/socialServices';
import { Reel } from '../lib/types';
import { Eye, Heart, MessageCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Logo } from './Logo';
import { secureLog } from '../lib/secureLogger';

interface ReelsProps {
  followingIds?: string[];
}

export default function Reels({ followingIds = [] }: ReelsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const [error, setError] = useState('');
  const [reelVotes, setReelVotes] = useState<Record<string, { yes: number; no: number }>>({});

  const loadReels = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getReels(followingIds);
      if (result.error) throw result.error;
      if (result.data) {
        setReels(result.data);
        const votes: Record<string, { yes: number; no: number }> = {};
        result.data.forEach(reel => {
          votes[reel.id] = { yes: reel.plant_votes_yes || 0, no: reel.plant_votes_no || 0 };
        });
        setReelVotes(votes);
      }
    } catch (err: any) {
      secureLog.error('[Reels] Error loading reels', err);
      setError('Failed to load reels. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  }, [followingIds]);

  useEffect(() => {
    loadReels();
  }, [loadReels]);

  const handleViewReel = async (reel: Reel) => {
    if (user) {
      await viewReel(reel.id, user.id);
    }
  };

  const handlePlantVote = async (reelId: string, isPlant: boolean) => {
    try {
      await voteReelPlant(reelId, isPlant);
      // update vote counts
      setReelVotes(prev => ({
        ...prev,
        [reelId]: {
          yes: isPlant ? (prev[reelId]?.yes || 0) + 1 : prev[reelId]?.yes || 0,
          no: !isPlant ? (prev[reelId]?.no || 0) + 1 : prev[reelId]?.no || 0
        }
      }));
    } catch (err) {
      secureLog.error('[Reels] Vote failed', err);
    }
  };



  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Logo iconClassName="w-12 h-12" animate />
        <p className="text-gray-500 font-medium">Loading Reels...</p>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">No reels available</p>
        <p className="text-sm text-gray-400">Follow users to see their reels</p>
      </div>
    );
  }

  const currentReel = reels[currentReelIndex];

  return (
    <div className="max-w-md mx-auto bg-black rounded-xl overflow-hidden relative aspect-[9/16] h-[80vh] border border-[#34D399]/20 shadow-2xl">
      <video
        src={currentReel.video_url}
        className="w-full h-full object-cover"
        autoPlay
        loop
        muted
      />

      {/* Overlay Info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 text-white">
        <p className="font-semibold text-sm">{currentReel.user?.username}</p>
        {currentReel.caption && <p className="text-xs mt-1">{currentReel.caption}</p>}
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1 text-xs text-gray-300">
            <Eye className="w-3 h-3" /> {currentReel.viewers?.length || 0} views
          </div>
          <div className="flex items-center gap-1 text-xs text-[#34D399] font-bold">
            <Heart className="w-3 h-3 fill-current" /> {currentReel.likes_count || 0} likes
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-300">
            <MessageCircle className="w-3 h-3" /> {currentReel.comments_count || 0}
          </div>
        </div>
      </div>

      {/* Plant Poll */}
      {!currentReel.approved && currentReel.poll_expires_at && new Date(currentReel.poll_expires_at) > new Date() && (
        <div className="absolute top-4 left-4 bg-black/80 backdrop-blur p-3 rounded-lg border border-[#34D399]/40">
          <p className="text-white text-xs font-bold mb-2">🌱 Is this a plant?</p>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => handlePlantVote(currentReel.id, true)}
              className="flex items-center gap-1 px-2 py-1 bg-[#34D399] text-black rounded text-xs font-semibold hover:bg-[#16A34A]"
            >
              <ThumbsUp className="w-3 h-3" /> Yes
            </button>
            <button
              onClick={() => handlePlantVote(currentReel.id, false)}
              className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700"
            >
              <ThumbsDown className="w-3 h-3" /> No
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div className="text-center">
              <p className="text-[#34D399] font-bold">{reelVotes[currentReel.id]?.yes || 0}</p>
              <p className="text-gray-300 text-xs">Yes</p>
            </div>
            <div className="text-center">
              <p className="text-red-400 font-bold">{reelVotes[currentReel.id]?.no || 0}</p>
              <p className="text-gray-300 text-xs">No</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Arrows */}
      {reels.length > 1 && (
        <>
          <button
            onClick={() => setCurrentReelIndex(Math.max(0, currentReelIndex - 1))}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition"
          >
            ← Prev
          </button>
          <button
            onClick={() => setCurrentReelIndex(Math.min(reels.length - 1, currentReelIndex + 1))}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition"
          >
            Next →
          </button>
        </>
      )}

      {/* Pagination dots */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-1">
        {reels.map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full ${
              i === currentReelIndex ? 'bg-[#34D399]' : 'bg-gray-500'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

