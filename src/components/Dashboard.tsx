import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogOut, Award, User, Mail, Menu, X as CloseIcon, Bot, Search, Film, Bell, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Profile, supabase } from '../lib/supabase';
import { Feed } from './Feed';
import { Logo } from './Logo'; // Import the Logo component
import { UploadPhoto } from './UploadPhoto';
import { UploadReel } from './UploadReel';
import FeedReels from './FeedReels';
import { AiAssistant } from './AiAssistant';
import { Notifications } from './Notifications';
import { Footer } from './Footer';
import { ThemeToggle } from './ThemeToggle';
import { getSuggestedUsers } from '../lib/socialServices';
import { secureLog } from '../lib/secureLogger';
import { playNotificationSound } from '../lib/notifications';

export function Dashboard() {
  const [showUpload, setShowUpload] = useState(false);
  const [showUploadReel, setShowUploadReel] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [initialAiQuestion, setInitialAiQuestion] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'points'>('posts');
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(true);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { theme } = useTheme();

  useEffect(() => {
    getSuggestedUsers().then(({ data }) => {
      setSuggestions(data || []);
      setIsSuggestionsLoading(false);
    });
    
    const queuedQuestion = localStorage.getItem('aiAssistantQuestion');
    if (queuedQuestion) {
      setInitialAiQuestion(queuedQuestion);
      localStorage.removeItem('aiAssistantQuestion');
      setShowAiAssistant(true);
    }

    const handleOpenAi = () => {
      const q = localStorage.getItem('aiAssistantQuestion');
      if (q) {
        setInitialAiQuestion(q);
        localStorage.removeItem('aiAssistantQuestion');
        setShowAiAssistant(true);
      }
    };

    window.addEventListener('openAiAssistant', handleOpenAi);

    // listen for new notifications
    const sub = supabase
      .channel(`notifications-background-${profile?.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile?.id}`,
        },
        (payload: any) => {
          playNotificationSound();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('openAiAssistant', handleOpenAi);
      supabase.removeChannel(sub);
    };
  }, [profile?.id]);

  const openAiAssistant = () => {
    const queued = localStorage.getItem('aiAssistantQuestion') || '';
    if (queued) {
      setInitialAiQuestion(queued);
      localStorage.removeItem('aiAssistantQuestion');
    } else {
      setInitialAiQuestion('');
    }
    setShowAiAssistant(true);
  };

  const handleUploadSuccess = () => {
    setShowUpload(false);
    setShowUploadReel(false);
    window.location.reload();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      window.location.reload();
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-black' : 'bg-gray-50'}`}>
      <header className={`sticky top-0 ${theme === 'dark' ? 'bg-gray-900 border-[#34D399]/20' : 'bg-white border-gray-200'} border-b z-40`}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo variant="full" className="text-[#34D399]" iconClassName="w-8 h-8" textClassName="text-2xl font-bold" />

            <div className="flex items-center gap-2 sm:gap-4">
              <div className={`flex items-center gap-2 ${theme === 'dark' ? 'bg-[#34D399]/10 border-[#34D399]/30' : 'bg-[#34D399]/5 border-[#34D399]/20'} px-4 py-2 rounded-full border`}>
                <Award className="w-5 h-5 text-[#34D399]" />
                <span className="text-[#34D399] font-bold">{profile?.points || 0}</span>
                <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-xs sm:text-sm`}>pts</span>
              </div>

              {/* Desktop Nav */}
              <div className="hidden md:flex items-center gap-4">
                <ThemeToggle />
                <button onClick={() => navigate('/reels')} className={`p-2 ${theme === 'dark' ? 'text-gray-400 hover:text-[#34D399]' : 'text-gray-600 hover:text-[#34D399]'} transition-colors`} title="Watch reels">
                  <Film className="w-5 h-5" />
                </button>
                <button onClick={() => navigate('/discover')} className={`p-2 ${theme === 'dark' ? 'text-gray-400 hover:text-[#34D399]' : 'text-gray-600 hover:text-[#34D399]'} transition-colors`} title="Discover users">
                  <Search className="w-5 h-5" />
                </button>
                <button onClick={openAiAssistant} className={`p-2 ${theme === 'dark' ? 'text-gray-400 hover:text-[#34D399]' : 'text-gray-600 hover:text-[#34D399]'} transition-colors`} title="AI Assistant">
                  <Bot className="w-5 h-5" />
                </button>
                <button onClick={() => setShowNotifications(true)} className={`p-2 ${theme === 'dark' ? 'text-gray-400 hover:text-[#34D399]' : 'text-gray-600 hover:text-[#34D399]'} transition-colors relative`} title="Notifications">
                  <Bell className="w-5 h-5" />
                  {/* Unread indicator - we'll add state for this */}
                </button>
                <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 px-4 py-2 bg-[#34D399] text-black font-semibold rounded-lg hover:bg-[#34D399]/90">
                  <Plus className="w-5 h-5" /> {t('sharePlant')}
                </button>
                <button onClick={() => navigate('/messages')} className={`p-2 ${theme === 'dark' ? 'text-gray-400 hover:text-[#34D399]' : 'text-gray-600 hover:text-[#34D399]'} transition-colors`}>
                  <Mail className="w-5 h-5" />
                </button>
                <button onClick={() => navigate(`/profile/${profile?.id}`)} className={`p-2 ${theme === 'dark' ? 'text-gray-400 hover:text-[#34D399]' : 'text-gray-600 hover:text-[#34D399]'} transition-colors`}>
                  <User className="w-5 h-5" />
                </button>
                <button onClick={handleSignOut} className={`p-2 ${theme === 'dark' ? 'text-gray-400 hover:text-[#34D399]' : 'text-gray-600 hover:text-[#34D399]'} transition-colors`}>
                  <LogOut className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Menu Button */}
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`md:hidden p-2 ${theme === 'dark' ? 'text-gray-400 hover:text-[#34D399]' : 'text-gray-600 hover:text-[#34D399]'}`}
              >
                {isMenuOpen ? <CloseIcon className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Sidebar / Menu Overlay */}
        {isMenuOpen && (
          <div className={`md:hidden fixed inset-0 ${theme === 'dark' ? 'bg-black/95' : 'bg-white/95'} z-50 p-6 flex flex-col gap-6 animate-in slide-in-from-right`}>
            <div className="flex justify-between items-center mb-4">
              <Logo variant="full" />
              <button onClick={() => setIsMenuOpen(false)} className={`p-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}><CloseIcon /></button>
            </div>
            <ThemeToggle className="self-start mb-4" />
            <button onClick={() => { openAiAssistant(); setIsMenuOpen(false); }} className={`flex items-center gap-4 text-xl ${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-medium`}>
              <Bot className="text-[#34D399]" /> AI Assistant
            </button>
            <button onClick={() => { setShowNotifications(true); setIsMenuOpen(false); }} className={`flex items-center gap-4 text-xl ${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-medium`}>
              <Bell className="text-[#34D399]" /> Notifications
            </button>
            <button onClick={() => { setShowUploadReel(true); setIsMenuOpen(false); }} className={`flex items-center gap-4 text-xl ${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-medium`}>
              <Film className="text-[#34D399]" /> Share Reel
            </button>
            <button onClick={() => { navigate('/discover'); setIsMenuOpen(false); }} className={`flex items-center gap-4 text-xl ${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-medium`}>
              <Search className="text-[#34D399]" /> Discover Users
            </button>
            <button onClick={() => { setShowUpload(true); setIsMenuOpen(false); }} className={`flex items-center gap-4 text-xl ${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-medium`}>
              <Plus className="text-[#34D399]" /> {t('sharePlant')}
            </button>
            <button onClick={() => { navigate('/messages'); setIsMenuOpen(false); }} className={`flex items-center gap-4 text-xl ${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-medium`}>
              <Mail className="text-[#34D399]" /> {t('messages')}
            </button>
            <button onClick={() => { navigate(`/profile/${profile?.id}`); setIsMenuOpen(false); }} className={`flex items-center gap-4 text-xl ${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-medium`}>
              <User className="text-[#34D399]" /> {t('myProfile')}
            </button>
            <div className={`mt-auto ${theme === 'dark' ? 'border-t border-gray-800' : 'border-t border-gray-200'} pt-6`}>
              <button onClick={handleSignOut} className="flex items-center gap-4 text-xl text-red-400 font-medium">
                <LogOut /> {t('signOut')}
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>{t('welcome')}, {profile?.username}!</h2>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Share your plant journey</p>
            </div>
            <div className={`flex ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-gray-100 border-gray-200'} rounded-lg p-1 border`}>
              <button 
                onClick={() => setActiveTab('posts')}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'posts' ? 'bg-[#34D399] text-black' : `${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}`}
              >
                Posts
              </button>
              <button 
                onClick={() => setActiveTab('reels')}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'reels' ? 'bg-[#34D399] text-black' : `${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}`}
              >
                Reels
              </button>
              <button 
                onClick={() => setActiveTab('points')}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'points' ? 'bg-[#34D399] text-black' : `${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}`}
              >
                Points
              </button>
            </div>
          </div>

          {activeTab === 'posts' ? <Feed /> : activeTab === 'reels' ? <FeedReels /> : (
            <div className={`${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-xl border p-8 text-center`}>
              <Award className="w-12 h-12 text-[#34D399] mx-auto mb-4" />
              <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>Points System</h3>
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Coming Soon</p>
            </div>
          )}
        </div>

        {/* Sidebar Suggestions */}
        <div className="hidden lg:block lg:col-span-4 space-y-6">
          <div className={`${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-xl border p-5 sticky top-24`}>
            <h3 className="text-[#34D399] font-bold flex items-center gap-2 mb-4">
              <Users className="w-5 h-5" /> Suggested for you
            </h3>
            <div className="space-y-4">
              {suggestions.map(s => (
                <div key={s.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${s.id}`)}>
                    <div className={`w-10 h-10 rounded-full border border-[#34D399]/20 flex items-center justify-center overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`}>
                      {s.avatar_url ? <img src={s.avatar_url} className="w-full h-full object-cover" /> : <User className={theme === 'dark' ? 'text-gray-500' : 'text-gray-600'} />}
                    </div>
                    <div>
                      <p className={`text-sm font-bold group-hover:text-[#34D399] transition ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{s.username}</p>
                      <p className={`text-[10px] ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>{s.points} pts</p>
                    </div>
                  </div>
                  <button onClick={() => navigate(`/profile/${s.id}`)} className="text-xs font-bold text-[#34D399] hover:underline">View</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {showUpload && (
        <UploadPhoto
          onSuccess={handleUploadSuccess}
          onCancel={() => setShowUpload(false)}
        />
      )}

      {showUploadReel && (
        <UploadReel
          onSuccess={handleUploadSuccess}
          onCancel={() => setShowUploadReel(false)}
        />
      )}

      {showAiAssistant && (
        <AiAssistant
          onClose={() => setShowAiAssistant(false)}
          initialQuestion={initialAiQuestion}
        />
      )}

      <Notifications
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      <Footer />
    </div>
  );
}

