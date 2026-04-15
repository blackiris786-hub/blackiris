import { useState, useRef } from 'react';
import { Film, X, Upload, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface UploadReelProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function UploadReel({ onSuccess, onCancel }: UploadReelProps) {
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [duration, setDuration] = useState(0); // TODO: actually use this to show duration
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type.startsWith('video/')) {
        setFile(selectedFile);
        setPreview(URL.createObjectURL(selectedFile));
        setError('');
      } else {
        setError('Please select a video file (MP4, MOV, etc.)');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;

    setUploading(true);
    setError('');

    try {
      // 1. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('reels')
        .upload(fileName, file);

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('Storage bucket "reels" not configured. Please create it in Supabase Storage.');
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('reels')
        .getPublicUrl(fileName);

      // 2. Set expiry (24 hours for reels)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // 3. Insert into database
      const { error: insertError } = await supabase.from('reels').insert({
        user_id: user.id,
        video_url: publicUrl,
        caption: caption.trim() || null,
        expires_at: expiresAt.toISOString(),
      });

      if (insertError) throw insertError;

      onSuccess();
    } catch (err: any) {
      console.error('Reel upload error:', err);
      setError(err.message || 'Failed to share reel. Please check your connection.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-gray-900 rounded-2xl max-w-lg w-full max-h-[95vh] overflow-y-auto border border-[#34D399]/30 shadow-2xl shadow-[#34D399]/10">
        <div className="sticky top-0 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-[#34D399]" />
            <h2 className="text-xl font-bold text-white">Share Reel</h2>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-gray-800 rounded-xl transition-colors text-gray-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Video Selector / Preview */}
          <div 
            className={`relative aspect-[9/16] max-h-[400px] mx-auto bg-black rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden ${
              file ? 'border-[#34D399]/50' : 'border-gray-700 hover:border-[#34D399]/30'
            }`}
          >
            {preview ? (
              <>
                <video src={preview} className="w-full h-full object-cover" controls={false} autoPlay loop muted />
                <button 
                  type="button"
                  onClick={() => { setFile(null); setPreview(null); }}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-3 text-gray-500 hover:text-[#34D399] transition-colors"
              >
                <Upload className="w-12 h-12" />
                <div className="text-center px-4">
                  <p className="font-semibold text-sm">Select Vertical Video</p>
                  <p className="text-xs opacity-60 mt-1">MP4 or MOV (Up to 1 min)</p>
                </div>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
          </div>

          {/* Caption */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Tell us about your reel..."
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-[#34D399] outline-none resize-none transition-all"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-700 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || uploading}
              className="flex-1 py-3 bg-[#34D399] text-black font-bold rounded-xl hover:bg-[#16A34A] disabled:opacity-50 transition-all shadow-lg shadow-[#34D399]/20"
            >
              {uploading ? 'Uploading...' : 'Post Reel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
