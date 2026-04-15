import { useState, useEffect, useRef } from 'react';
import { supabase, Post } from '../lib/supabase';
import { Reel } from '../lib/types';
import { LogIn, Film, X, PlusCircle, CheckCircle2, Leaf, Eye, Heart, MessageCircle } from 'lucide-react';
import { Logo } from './Logo';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeToggle } from './ThemeToggle';
import { PostViewTracker } from './PostViewTracker'; // Import the new component
import { Auth } from './Auth'; // Import missing Auth component
import { Footer } from './Footer';

export function PublicFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'reels'>('posts');
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [shouldRefresh, setShouldRefresh] = useState(false); // TODO: use this to refresh feed when user logs in
  const { t } = useLanguage();
  const { theme } = useTheme();

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setLoading(true);
    try {
      // Load latest posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`*,
          user:user_id(id, username, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(20);
      // FIXME: should probably limit to posts with engagement > 0 or something

      if (postsError) {
        console.error('Error loading posts:', postsError);
        setPosts([]);
      } else {
        setPosts(postsData || []);
      }

      // Load latest reels
      const { data: reelsData, error: reelsError } = await supabase
        .from('reels')
        .select(`*,
          user:user_id(id, username, avatar_url, bio)
        `)
        .filter('expires_at', 'gt', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (reelsError) {
        console.error('Error loading reels:', reelsError);
        setReels([]);
      } else {
        setReels(reelsData || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = () => {
    setShowAuthModal(true);
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
      <div className={`sticky top-0 z-40 ${theme === 'dark' ? 'bg-gray-900 border-[#34D399]/20' : 'bg-white border-gray-200'} border-b`}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <Logo className="w-8 h-8 sm:w-10 sm:h-10 text-[#34D399]" iconClassName="w-8 h-8 sm:w-10 sm:h-10" />
            <span className="text-lg sm:text-xl font-bold text-[#34D399] font-mono tracking-wider hidden xs:block">BLACKIRIS</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={handleJoin}
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-[#34D399] text-black rounded-lg font-semibold hover:bg-[#34D399]/90 transition text-xs sm:text-sm whitespace-nowrap"
            >
              <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
              Join
            </button>
            <button
              onClick={handleJoin}
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-[#34D399] text-black rounded-lg font-bold hover:bg-[#16A34A] transition-all border border-[#34D399]/30 text-xs sm:text-sm whitespace-nowrap shadow-md shadow-[#34D399]/10 active:scale-95"
            >
              <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              New Reel
            </button>
          </div>
        </div>
      </div>

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#34D399]/5 to-[#34D399]/10 border-b border-[#34D399]/20 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className={`text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>Welcome to Black Iris</h1>
          <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-6`}>Explore beautiful plant photos and connect with growers worldwide</p>
          <div className="flex items-center justify-center gap-2 text-[#34D399] font-mono text-sm mb-4 animate-pulse">
            <Leaf className="w-4 h-4" />
            Get 2 points for every AI-verified plant post!
          </div>
          <button
            onClick={handleJoin}
            className="px-6 py-2 bg-[#34D399] text-black rounded-lg font-semibold hover:bg-[#34D399]/90 transition shadow-lg shadow-[#34D399]/20"
          >
            Sign Up or Log In to Join
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-4xl mx-auto px-4 py-6 border-b border-gray-800 flex gap-4">
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-4 py-2 font-semibold transition ${
            activeTab === 'posts'
              ? 'text-[#34D399] border-b-2 border-[#34D399]'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Posts ({posts.length})
        </button>
        <button
          onClick={() => setActiveTab('reels')}
          className={`flex items-center gap-2 px-4 py-2 font-semibold transition ${
            activeTab === 'reels'
              ? 'text-[#34D399] border-b-2 border-[#34D399]'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Film className="w-4 h-4" />
          Reels ({reels.length})
        </button>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <Logo className="w-12 h-12 text-[#34D399] mx-auto mb-4 animate-spin" iconClassName="w-12 h-12" />
            <p className="text-gray-400">Loading content...</p>
          </div>
        ) : activeTab === 'posts' ? (
          <div className="space-y-6">
            {posts.length > 0 ? (
              posts.map((post) => {
                return (
                <div
                  key={post.id}
                  className="bg-gray-900 border border-[#34D399]/20 rounded-xl overflow-hidden hover:border-[#34D399]/60 transition-all duration-500 hover:shadow-2xl hover:shadow-[#34D399]/10 animate-slideUp"
                >
                  {/* Post Header */}
                  <div className="p-4 border-b border-gray-800">
                    <PostViewTracker postId={post.id} /> {/* Use the new component here */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {post.user?.avatar_url ? (
                          <img
                            src={post.user.avatar_url}
                            alt={post.user.username}
                            className="w-10 h-10 rounded-full object-cover border border-[#34D399]/30"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-800 border border-[#34D399]/30 flex items-center justify-center">
                            <span className="text-xs text-[#34D399]">{post.user?.username?.[0]?.toUpperCase()}</span>
                          </div>
                        )}
                        <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{post.user?.username || 'Unknown'}</span>
                      </div>
                      {post.is_verified && (
                        <div className="flex items-center gap-1 text-[#34D399] bg-[#34D399]/10 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-[#34D399]/20">
                          <CheckCircle2 className="w-3 h-3" />
                          AI Verified
                        </div>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Post Content */}
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt="Post"
                      className="w-full h-auto max-h-[600px] object-contain bg-black"
                    />
                  )}

                  {/* Post Body */}
                  <div className="p-4 md:p-6 space-y-4">
                    {post.title && <h3 className={`text-lg md:text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{post.title}</h3>}
                    {post.description && <p className="text-gray-300 text-base md:text-lg leading-relaxed">{post.description}</p>}
                    {post.caption && <p className="text-gray-200 text-sm md:text-base">{post.caption}</p>}
                    <div className="pt-4 border-t border-gray-800 flex gap-4 text-sm md:text-base text-gray-400">
                      <span className="flex items-center gap-1.5"><Eye className="w-4 h-4" /> {post.views || 0}</span>
                      <span className="flex items-center gap-1.5"><Heart className="w-4 h-4 text-[#34D399]" /> {post.likes_count || 0}</span>
                      <span className="flex items-center gap-1.5"><MessageCircle className="w-4 h-4" /> {post.comments_count || 0}</span>
                    </div>
                    <button
                      onClick={handleJoin}
                      className="w-full mt-6 px-4 py-3 md:py-4 bg-[#34D399]/10 text-[#34D399] rounded-lg hover:bg-[#34D399]/20 transition-all font-semibold text-base md:text-lg border border-[#34D399]/30 hover:border-[#34D399]/60 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Join to Like & Comment
                    </button>
                  </div>
                </div>
              )})
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-400 text-lg">No posts yet</p>
                <p className="text-gray-500 text-sm mt-2">Be the first to share your plants!</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {reels.length > 0 ? (
              reels.map((reel) => (
                <div
                  key={reel.id}
                  className="group relative bg-gray-900 rounded-lg overflow-hidden border border-[#34D399]/20 hover:border-[#34D399]/40 transition animate-slideUp"
                >
                  {reel.thumbnail_url ? (
                    <img
                      src={reel.thumbnail_url}
                      alt="Reel"
                      className="w-full h-48 object-cover group-hover:brightness-75 transition"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-800 flex items-center justify-center">
                      <Film className="w-12 h-12 text-gray-600" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex items-center gap-1 text-[10px] font-bold text-[#34D399] bg-black/60 px-2 py-1 rounded-full uppercase tracking-widest border border-[#34D399]/30 z-10">
                    <Film className="w-3 h-3" />
                    Reel
                  </div>
                  <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
                    <div className="text-[10px] font-bold text-white bg-black/70 backdrop-blur-md px-2 py-1 rounded-full whitespace-nowrap flex items-center gap-1 border border-white/10">
                      <Eye className="w-3 h-3" /> {reel.viewers?.length || 0}
                    </div>
                    <div className="text-[10px] font-bold text-white bg-black/70 backdrop-blur-md px-2 py-1 rounded-full whitespace-nowrap flex items-center gap-1 border border-white/10">
                      <Heart className="w-3 h-3 text-[#34D399] fill-[#34D399]" /> {reel.likes_count || 0}
                    </div>
                    <div className="text-[10px] font-bold text-white bg-black/70 backdrop-blur-md px-2 py-1 rounded-full whitespace-nowrap flex items-center gap-1 border border-white/10">
                      <MessageCircle className="w-3 h-3" /> {reel.comments_count || 0}
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <button
                      onClick={handleJoin}
                      className="px-4 py-2 bg-[#34D399] text-black rounded-lg font-semibold hover:bg-[#34D399]/90"
                    >
                      Join to Watch
                    </button>
                  </div>
                  {reel.user && (
                    <div className="p-2 bg-gray-900/80 text-xs text-gray-300 border-t border-gray-800">
                      <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{reel.user.username}</p>
                      {reel.caption && <p className="line-clamp-1 text-gray-400">{reel.caption}</p>}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-2 text-center py-16">
                <p className="text-gray-400 text-lg">No reels yet</p>
                <p className="text-gray-500 text-sm mt-2">Check back soon for video content!</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

