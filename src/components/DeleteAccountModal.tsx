import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X } from 'lucide-react';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeleteAccountModal({ isOpen, onClose }: DeleteAccountModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationStage, setConfirmationStage] = useState(0); // TODO: add multiple confirmation stages for safety
  const { deleteAccount } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    const { error: deleteError } = await deleteAccount(email.trim(), password.trim());

    if (deleteError) {
      setError(deleteError as string);
      setLoading(false);
      return;
    }

    // Account deleted successfully - the user will be signed out automatically
    // The modal will close due to the auth state change
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg max-w-md w-full border border-red-500/20">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-red-400">Delete Account</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <h3 className="text-red-400 font-semibold mb-2">⚠️ Warning: This action cannot be undone!</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• All your posts will be permanently deleted</li>
              <li>• All your comments will be permanently deleted</li>
              <li>• All your followers/following relationships will be removed</li>
              <li>• All your messages will be permanently deleted</li>
              <li>• Your profile and points will be lost</li>
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="delete-email" className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Email Address
              </label>
              <input
                id="delete-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label htmlFor="delete-password" className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="delete-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500 pr-20"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-gray-400 hover:text-red-400 focus:outline-none"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-500 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-gray-800 text-gray-300 font-semibold rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}