import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { analyzePlantImage } from '../lib/ai';
import { getUserModerationState, moderateText, recordBadWordAttempt } from '../lib/contentModeration';
import { Logo } from './Logo';

interface UploadPhotoProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function UploadPhoto({ onSuccess, onCancel }: UploadPhotoProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0); // TODO: actually track progress in storage upload
  const { user } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type.startsWith('image/')) {
        setFile(selectedFile);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
        setError('');
      } else {
        setError('Please select an image file');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;

    const moderationState = await getUserModerationState(user.id);
    if (moderationState.isBanned) {
      setError('Your account has been banned due to repeated violations. You can no longer create posts.');
      return;
    }
    if (moderationState.isTimedOut && moderationState.timeoutUntil) {
      const until = new Date(moderationState.timeoutUntil);
      setError(
        `You are currently in a timeout until ${until.toLocaleTimeString()}. You cannot create posts during this period.`
      );
      return;
    }

    // Basic text moderation for title/description
    const titleModeration = moderateText(title);
    if (!titleModeration.allowed) {
      const state = await recordBadWordAttempt(user.id);

      if (state.isBanned) {
        setError(
          'Your account has been banned after repeated violations of our community guidelines. You can no longer create posts.'
        );
        return;
      }

      if (state.isTimedOut && state.timeoutUntil) {
        const until = new Date(state.timeoutUntil);
        setError(
          `Due to repeated violations, you have been placed on a 15-minute timeout and cannot create posts until ${until.toLocaleTimeString()}.`
        );
        return;
      }

      if (state.attempts >= 3) {
        setError(
          titleModeration.reason ||
            'Title is not allowed. This is your third violation; further attempts will result in a temporary timeout.'
        );
      } else {
        setError(titleModeration.reason || 'Title is not allowed. Please keep it respectful.');
      }
      return;
    }
    if (description.trim()) {
      const descriptionModeration = moderateText(description);
      if (!descriptionModeration.allowed) {
        const state = await recordBadWordAttempt(user.id);

        if (state.isBanned) {
          setError(
            'Your account has been banned after repeated violations of our community guidelines. You can no longer create posts.'
          );
          return;
        }

        if (state.isTimedOut && state.timeoutUntil) {
          const until = new Date(state.timeoutUntil);
          setError(
            `Due to repeated violations, you have been placed on a 15-minute timeout and cannot create posts until ${until.toLocaleTimeString()}.`
          );
          return;
        }

        if (state.attempts >= 3) {
          setError(
            descriptionModeration.reason ||
              'Description is not allowed. This is your third violation; further attempts will result in a temporary timeout.'
          );
        } else {
          setError(descriptionModeration.reason || 'Description is not allowed. Please keep it respectful.');
        }
        return;
      }
    }

    setAnalyzing(true);
    setError('');

    try {
      // First, analyze the image with AI
      console.log('Starting image analysis...');
      const analysis = await analyzePlantImage(file);

      if (!analysis.isValid) {
        const errorMsg = analysis.reason.includes('timeout') || analysis.reason.includes('too long')
          ? `${analysis.reason} Please try a smaller image (under 5MB).`
          : `${analysis.reason} Please try another photo of a real, newly planted plant.`;
        setError(`Image rejected: ${errorMsg}`);
        setAnalyzing(false);
        return;
      }

      console.log('Image analysis passed, uploading...');
      setAnalyzing(false);
      setUploading(true);

      // Proceed with upload if analysis passes
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('plant-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('plant-photos')
        .getPublicUrl(fileName);

      const { error: postError } = await supabase.from('posts').insert({
        user_id: user.id,
        title,
        description,
        image_url: publicUrl,
        points_awarded: 10,
      });

      if (postError) throw postError;

      console.log('🎉 Post created successfully!');
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload photo';
        console.error('Upload error:', message);
      setError(message);
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-greenyellow/20">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-greenyellow">Share Your Plant</h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Photo
            </label>
            <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-greenyellow/50 transition-colors">
              {preview ? (
                <div className="relative">
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-64 mx-auto rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setPreview(null);
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                  <p className="text-gray-400 mb-2">Click to upload or drag and drop</p>
                  <p className="text-sm text-gray-500">PNG, JPG, GIF up to 10MB</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    required
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-greenyellow"
              placeholder="What did you plant?"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-greenyellow resize-none"
              placeholder="Tell us about your plant..."
            />
          </div>

          <div className="bg-greenyellow/10 border border-greenyellow/20 rounded-lg p-4">
            <p className="text-greenyellow text-sm">
              You'll earn 10 points for sharing your plant!
            </p>
            <p className="text-greenyellow/70 text-xs mt-1">
              Your photo will be analyzed to ensure it shows a real, newly planted plant.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400 text-sm space-y-2">
              <p className="font-semibold">⚠️ {error}</p>
              {error.includes('timeout') && (
                <p className="text-xs text-red-300">Try selecting a smaller image (JPG format recommended).</p>
              )}
              {error.includes('Failed to fetch') && (
                <p className="text-xs text-red-300">Check your internet connection and try again.</p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 px-4 bg-gray-800 text-gray-300 font-semibold rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || analyzing || !file}
              className="flex-1 py-3 px-4 bg-greenyellow text-black font-semibold rounded-lg hover:bg-greenyellow/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {analyzing || uploading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Logo className="w-5 h-5 text-black" iconClassName="w-full h-full" animate />
                  {analyzing ? 'Analyzing...' : 'Uploading...'}
                </span>
              ) : (
                'Post'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
