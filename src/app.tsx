import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { Auth } from './components/Auth';
import { PublicFeed } from './components/PublicFeed';
import { Dashboard } from './components/Dashboard';
import { UserProfile } from './components/UserProfile';
import { Messages } from './components/Messages';
import { EditProfile } from './components/EditProfile';
import { Terms } from './components/Terms';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { CommunityGuidelines } from './components/CommunityGuidelines';
import Discover from './components/Discover';
import FeedReels from './components/FeedReels';
import Reels from './components/Reels';
import { Logo } from './components/Logo';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initializeNotifications } from './lib/notifications';

function AppContent() {
  const { user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const { t, isRtl } = useLanguage();
  const { theme } = useTheme();

  useEffect(() => {
    if (user && !loading) {
      initializeNotifications().catch((err) => {
        console.warn('Failed to initialize notifications:', err);
      });
    }
  }, [user, loading]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        setError('App is taking too long to load. Please check your internet connection and try refreshing.');
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [loading, retryCount, user]);

  const handleRetry = () => {
    setError(null);
    setRetryCount(retryCount + 1);
    window.location.reload();
  };

  const content = (() => {
    if (error) {
      return (
        <div className={`min-h-screen ${theme === 'dark' ? 'bg-black' : 'bg-gray-50'} flex items-center justify-center p-4`}>
          <div className={`max-w-md w-full ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} rounded-lg p-6 border ${theme === 'dark' ? 'border-red-500' : 'border-red-300'}`}>
            <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>{t('connectionError')}</h2>
            <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-4`}>{error}</p>
            <button
              onClick={handleRetry}
              className="w-full bg-[#34D399] text-black py-2 px-4 rounded-lg font-semibold hover:bg-[#34D399]/90"
            >
              {t('retry')}
            </button>
          </div>
        </div>
      );
    }

    if (loading) {
      return (
        <div className={`min-h-screen ${theme === 'dark' ? 'bg-black' : 'bg-gray-50'} flex items-center justify-center`}>
          <div className="text-center">
            <Logo
              className="w-16 h-16 text-[#34D399] mx-auto mb-4"
              iconClassName="w-full h-full"
              animate
            />
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{t('loadingBlackiris')}</p>
          </div>
        </div>
      );
    }

    if (!user) {
      return (
        <Routes>
          <Route path="/" element={<PublicFeed />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/community-guidelines" element={<CommunityGuidelines />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      );
    }

    return (
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/reels" element={<FeedReels />} />
        <Route path="/create-reel" element={<Reels />} />
        <Route path="/profile/:userId" element={<UserProfile />} />
        <Route path="/edit-profile" element={<EditProfile />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/community-guidelines" element={<CommunityGuidelines />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  })();

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className={isRtl ? 'rtl' : 'ltr'}>
      {content}
    </div>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;

