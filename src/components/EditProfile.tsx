import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';
import { DeleteAccountModal } from './DeleteAccountModal';
import { getUserModerationState, moderateText, recordBadWordAttempt } from '../lib/contentModeration';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeToggle } from './ThemeToggle';

export function EditProfile() {
  const { profile, user } = useAuth();
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [usernameValidated, setUsernameValidated] = useState(true); // TODO: implement real time validation
  const { theme } = useTheme();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const img = new Image();
      img.onload = () => {
        if (img.width > 512 || img.height > 512) {
          setError('Image must be maximum 512px * 512px');
          setAvatarFile(null);
        } else {
          setAvatarFile(file);
          setAvatarUrl(URL.createObjectURL(file));
          setError('');
        }
      };
      img.src = URL.createObjectURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');
    setSuccess('');

    const moderationState = await getUserModerationState(user.id);
    if (moderationState.isBanned) {
      setError('Your account has been banned due to repeated violations. You can no longer update your profile.');
      setLoading(false);
      return;
    }
    if (moderationState.isTimedOut && moderationState.timeoutUntil) {
      const until = new Date(moderationState.timeoutUntil);
      setError(
        `You are currently in a timeout until ${until.toLocaleTimeString()}. You cannot update your profile during this period.`
      );
      setLoading(false);
      return;
    }

    try {
      // Basic moderation for username and bio
      const usernameModeration = moderateText(username);
      if (!usernameModeration.allowed) {
        const state = await recordBadWordAttempt(user.id);

        if (state.isBanned) {
          setError(
            'Your account has been banned after repeated violations of our community guidelines. You can no longer update your profile.'
          );
          setLoading(false);
          return;
        }

        if (state.isTimedOut && state.timeoutUntil) {
          const until = new Date(state.timeoutUntil);
          setError(
            `Due to repeated violations, you have been placed on a 15-minute timeout and cannot update your profile until ${until.toLocaleTimeString()}.`
          );
          setLoading(false);
          return;
        }

        if (state.attempts >= 3) {
          setError(
            usernameModeration.reason ||
              'Username is not allowed. This is your third violation; further attempts will result in a temporary timeout.'
          );
        } else {
          setError(usernameModeration.reason || 'Username is not allowed. Please choose a respectful name.');
        }
        setLoading(false);
        return;
      }
      if (bio.trim()) {
        const bioModeration = moderateText(bio);
        if (!bioModeration.allowed) {
          const state = await recordBadWordAttempt(user.id);

          if (state.isBanned) {
            setError(
              'Your account has been banned after repeated violations of our community guidelines. You can no longer update your profile.'
            );
            setLoading(false);
            return;
          }

          if (state.isTimedOut && state.timeoutUntil) {
            const until = new Date(state.timeoutUntil);
            setError(
              `Due to repeated violations, you have been placed on a 15-minute timeout and cannot update your profile until ${until.toLocaleTimeString()}.`
            );
            setLoading(false);
            return;
          }

          if (state.attempts >= 3) {
            setError(
              bioModeration.reason ||
                'Bio is not allowed. This is your third violation; further attempts will result in a temporary timeout.'
            );
          } else {
            setError(bioModeration.reason || 'Bio is not allowed. Please keep it respectful.');
          }
          setLoading(false);
          return;
        }
      }

      try {
        if (username.trim() !== profile?.username) {
          const { data: existingUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username.trim())
            .neq('id', user.id)
            .single();

          if (existingUser) {
            setError('Username is already taken');
            setLoading(false);
            return;
          }
        }
      } catch (dbError) {
        console.error('Database check failed:', dbError);
        // If database check fails, continue with update anyway
        console.log('Continuing with profile update despite database check failure');
      }

      try {
        let finalAvatarUrl = avatarUrl;

        if (avatarFile) {
          const fileExt = avatarFile.name.split('.').pop();
          const fileName = `${user.id}-${Math.random()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, avatarFile);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
          
          finalAvatarUrl = publicUrl;
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            username: username.trim(),
            bio: bio.trim(),
            avatar_url: finalAvatarUrl.trim() || null,
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('Profile update failed:', updateError);
          setError('Failed to update profile. Please try again.');
          setLoading(false);
          return;
        }

        setSuccess('Profile updated successfully!');
        setTimeout(() => {
          window.location.href = `/profile/${user.id}`;
        }, 1500);
      } catch (updateError) {
        console.error('Profile update error:', updateError);
        setError('Failed to update profile. Please check your connection and try again.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-black' : 'bg-gray-50'} p-4`}>
      {/* Header */}
      <div className={`sticky top-0 z-40 ${theme === 'dark' ? 'bg-gray-900 border-[#34D399]/20' : 'bg-white border-gray-200'} border-b p-4`}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-[#34D399] hover:text-[#16A34A]"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <ThemeToggle />
        </div>
      </div>

      <div className="max-w-2xl mx-auto pt-6">

        <div className={`${theme === 'dark' ? 'bg-gray-900 border-[#34D399]/20' : 'bg-white border-gray-200'} rounded-lg border p-8`}>
          <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-6`}>Edit Profile</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full px-4 py-2 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'} border rounded-lg focus:outline-none focus:border-[#34D399]`}
                required
              />
            </div>

            <div>
              <label htmlFor="bio" className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Bio
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className={`w-full px-4 py-2 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'} border rounded-lg focus:outline-none focus:border-[#34D399] resize-none`}
                placeholder="Tell others about yourself..."
              />
              <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                {bio.length}/500 characters
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Profile Picture (Max 512x512px)
              </label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm hover:bg-gray-700 transition-colors"
                >
                  Choose File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              {avatarUrl && (
                <div className="mt-2">
                  <img
                    src={avatarUrl}
                    alt="Avatar preview"
                    className="w-32 h-32 rounded-2xl object-contain bg-gray-800 border border-[#34D399]/30 shadow-lg"
                    onError={() => setError('Invalid image URL')}
                  />
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-500 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-900/20 border border-green-500 rounded-lg text-green-400 text-sm">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[#34D399] text-black font-bold rounded-lg hover:bg-[#16A34A] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#34D399]/10 active:scale-95"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-700">
            <h3 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h3>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full py-3 px-4 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Account
            </button>
          </div>
        </div>

        <DeleteAccountModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
        />
      </div>
    </div>
  );
}

