import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchUsers } from '../lib/socialServices';
import { supabase, Profile } from '../lib/supabase';
import { ArrowLeft, Search, Heart, MessageCircle, X, Film } from 'lucide-react';
import { Auth } from './Auth'; // Import Auth component
import { Logo } from './Logo'; // Import Logo component for the modal
import { useAuth } from '../contexts/AuthContext'; // Import useAuth hook
import { useTheme } from '../contexts/ThemeContext';
import { ThemeToggle } from './ThemeToggle';

export default function Discover() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [reelCounts, setReelCounts] = useState<Record<string, number>>({});
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [androidSuggestions, setAndroidSuggestions] = useState<Profile[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false); // TODO: use this properly, currently unused

  useEffect(() => {
    const debounce = setTimeout(async () => {
      if (query.trim()) {
        setLoading(true);
        const { data } = await searchUsers(query);
        setResults(data || []);
        setLoading(false);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [query]);

  useEffect(() => {
    if (results.length > 0) {
      const userIds = results.map(user => user.id);
      loadReelCounts(userIds);
    }
  }, [results]);

  useEffect(() => {
    loadFollowingList();
    loadAndroidSuggestions();
  }, []);

  const loadFollowingList = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('followers')
      .select('following_id')
      .eq('follower_id', user.id);

    setFollowingIds(new Set(data?.map((f: any) => f.following_id) || []));
  };

  const loadReelCounts = async (userIds: string[]) => {
    if (userIds.length === 0) return;

    const { data, error } = await supabase
      .from('reels')
      .select('user_id')
      .in('user_id', userIds)
      .filter('expires_at', 'gt', new Date().toISOString());

    if (!error && data) {
      const counts: Record<string, number> = {};
      data.forEach((reel: any) => {
        counts[reel.user_id] = (counts[reel.user_id] || 0) + 1;
      });
      setReelCounts(counts);
    }
  };

  const loadAndroidSuggestions = async () => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    if (isAndroid) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, bio, points')
        .order('points', { ascending: false })
        .limit(3);
      
      if (!error && data) {
        setAndroidSuggestions(data);
      }
    }
  };

  const handleFollow = async (userId: string) => {
    if (!user) {
      setShowAuthModal(true); // Show auth modal if not logged in
      return;
    }

    if (followingIds.has(userId)) {
      const { error } = await supabase
        .from('followers')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId);

      if (!error) {
        const newSet = new Set(followingIds);
        newSet.delete(userId);
        setFollowingIds(newSet);
      }
    } else {
      const { error } = await supabase
        .from('followers')
        .insert([{
          follower_id: user.id,
          following_id: userId,
        }]);

      if (!error) {
        const newSet = new Set(followingIds);
        newSet.add(userId);
        setFollowingIds(newSet);
      }
    }
  };

  const handleMessage = (userId: string) => {
    if (!user) {
      setShowAuthModal(true); // Show auth modal if not logged in
      return;
    }
    navigate(`/messages?user=${userId}`);
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-black' : 'bg-gray-50'}`}>
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
          <div className="relative bg-gradient-to-b from-gray-900 to-black rounded-2xl w-full sm:max-w-sm md:max-w-md max-h-[90vh] overflow-y-auto border-2 border-[#34D399]/40 shadow-2xl shadow-[#34D399]/30">
            <button
              onClick={() => setShowAuthModal(false)}
              className="sticky top-4 right-4 ml-auto p-2 text-gray-400 hover:text-[#34D399] transition z-20 hover:bg-gray-800/50 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="p-6 text-center border-b border-[#34D399]/20 mb-0">
              <Logo className="w-10 h-10 text-[#34D399] mx-auto mb-3" iconClassName="w-10 h-10" />
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-mono tracking-wider`}>BLACKIRIS</h2>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mt-2`}>Join to share & explore plants</p>
            </div>
            <div className="p-6 pt-4">
              <Auth />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={`sticky top-0 z-40 ${theme === 'dark' ? 'bg-gray-900 border-[#34D399]/20' : 'bg-white border-gray-200'} border-b p-4`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-[#34D399] hover:text-[#16A34A] font-bold"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <ThemeToggle />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by username..."
              className={`w-full pl-12 pr-4 py-3 ${theme === 'dark' ? 'bg-gray-900 border-[#34D399]/30 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'} border rounded-lg focus:outline-none focus:border-[#34D399] focus:ring-2 focus:ring-[#34D399]/20`}
            />
          </div>
        </div>

        {/* Results */}
        {query && loading ? (
          <div className="text-center py-12 text-gray-400">Searching...</div>
        ) : results.length === 0 && query ? (
          <div className="text-center py-12 text-gray-400">No users found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((user) => (
              <div
                key={user.id}
                className="bg-gray-900 rounded-lg border border-[#34D399]/20 overflow-hidden hover:border-[#34D399]/50 transition"
              >
                {/* Avatar */}
                {user.avatar_url && (
                  <div className="aspect-square w-full overflow-hidden bg-gray-800">
                    <img
                      src={user.avatar_url}
                      alt={user.username}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Info */}
                <div className="p-4">
                  <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>
                    {user.username}
                  </h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-2`}>@{user.username}</p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-3 line-clamp-2`}>
                    {user.bio || 'No bio'}
                  </p>

                  {/* Stats */}
                  <div className={`flex gap-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-4 pb-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-semibold`}>
                        {user.points || 0}
                      </span>
                      <span className="block">points</span>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-semibold flex items-center gap-1`}>
                        <Film className="w-3 h-3" />
                        {reelCounts[user.id] || 0}
                      </span>
                      <span className="block">reels</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2"> {/* Responsive button layout */}
                    <button
                      onClick={() => navigate(`/profile/${user.id}`)}
                      className="flex-1 px-3 py-2 bg-[#34D399]/20 text-[#34D399] rounded-lg hover:bg-[#34D399]/30 transition text-sm font-medium"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleFollow(user.id)}
                      className={`flex-1 px-3 py-2 rounded-lg transition text-sm font-medium ${
                        followingIds.has(user.id)
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-[#34D399] text-black hover:bg-[#16A34A]'
                      }`}
                    >
                      {followingIds.has(user.id) ? '✓ Following' : 'Follow'}
                    </button>
                    <button
                      onClick={() => handleMessage(user.id)}
                      className="p-2 bg-[#34D399]/20 text-[#34D399] rounded-lg hover:bg-[#34D399]/30 transition"
                      title="Send message"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Android Suggestions */}
        {androidSuggestions.length > 0 && !query && (
          <div className="mb-8">
            <h3 className="text-[#34D399] font-bold text-lg mb-4 flex items-center gap-2">
              <span className="text-2xl">🤖</span> Android Plant Community
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {androidSuggestions.map((user) => (
                <div
                  key={user.id}
                  className="bg-gray-900 rounded-lg border border-[#34D399]/20 overflow-hidden hover:border-[#34D399]/50 transition"
                >
                  {/* Avatar */}
                  {user.avatar_url && (
                    <div className="aspect-square w-full overflow-hidden bg-gray-800">
                      <img
                        src={user.avatar_url}
                        alt={user.username}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Info */}
                  <div className="p-4">
                    <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>
                      {user.username}
                    </h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-2`}>Plant Community Member</p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-3 line-clamp-2`}>
                      {user.bio || 'Plant enthusiast'}
                    </p>

                    {/* Stats */}
                    <div className={`flex gap-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-4 pb-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
                      <div>
                        <span className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-semibold`}>
                          {user.points || 0}
                        </span>
                        <span className="block">points</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => navigate(`/profile/${user.id}`)}
                        className="flex-1 px-3 py-2 bg-[#34D399]/20 text-[#34D399] rounded-lg hover:bg-[#34D399]/30 transition text-sm font-medium"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleFollow(user.id)}
                        className={`flex-1 px-3 py-2 rounded-lg transition text-sm font-medium ${
                          followingIds.has(user.id)
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-[#34D399] text-black hover:bg-[#16A34A]'
                        }`}
                      >
                        {followingIds.has(user.id) ? '✓ Following' : 'Follow'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!query && (
          <div className="text-center py-16 text-gray-400">
            <Heart className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Search by username or email to discover users</p>
          </div>
        )}
      </div>
    </div>
  );
}

