import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Award, User, Trash2, Heart, X, Bot } from 'lucide-react';
import { supabase, Post, Comment } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { likePost, unlikePost, checkUserLike, getLikesCount } from '../lib/likes';
import { getUserModerationState, moderateText, recordBadWordAttempt } from '../lib/contentModeration';
import { createNotification, filterProfanity } from '../lib/socialServices';
import { useLanguage } from '../contexts/LanguageContext';

// TODO: Refactor this component - it's getting too big
// Split comment section into a separate component to improve maintainability

interface PostCardProps {
  post: Post;
  onLikeUpdate?: () => void;
}

export function PostCard({ post, onLikeUpdate }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [isLiked, setIsLiked] = useState(post.is_liked || false);
  const [liking, setLiking] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);
  const [commentError, setCommentError] = useState('');
  
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const isOwnPost = user?.id === post.user_id;

  const loadComments = useCallback(async () => {
    try {
      const result = await supabase
        .from('comments')
        .select(`*, profiles (id, username, points)`)
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      if (result.error) throw result.error;
      setComments(result.data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  }, [post.id]);

  useEffect(() => {
    const getCommentCount = async () => {
      const result = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      
      if (!result.error && result.count !== null) {
        setCommentsCount(result.count);
      }
    };
    getCommentCount();
  }, [post.id]);

  const loadLikeStatus = useCallback(async () => {
    if (!user) return;
    try {
      const [liked, count] = await Promise.all([
        checkUserLike(post.id, user.id),
        getLikesCount(post.id)
      ]);
      setIsLiked(liked);
      setLikesCount(count);
    } catch (error) {
      console.error('Error loading like status:', error);
    }
  }, [user, post.id]);

  useEffect(() => {
    if (showComments) loadComments();
  }, [showComments, loadComments]);

  useEffect(() => {
    if (user) loadLikeStatus();
  }, [user, post.id, loadLikeStatus]);

  // handle comment submission
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    const modState = await getUserModerationState(user.id);
    if (modState.isBanned) {
      setCommentError('Banned Account: You cannot post comments.');
      return;
    }

    const moderation = moderateText(newComment);
    if (!moderation.allowed) {
      await recordBadWordAttempt(user.id);
      setCommentError(moderation.reason || 'Comment not allowed.');
      return;
    }

    setLoading(true);
    try {
      const { filtered, hasProfanity } = filterProfanity(newComment.trim());
      
      if (hasProfanity) {
        await createNotification(post.user_id, 'comment', `A comment with profanity was filtered on your post: ${post.title}`);
      }

      const result = await supabase.from('comments').insert({
        post_id: post.id,
        user_id: user.id,
        content: filtered,
      });
      if (result.error) throw result.error;
      setNewComment('');
      setCommentError('');
      await loadComments();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string, commentUserId: string) => {
    if (!user || user.id !== commentUserId) return;
    if (!confirm(t('confirm_delete_comment') || 'Are you sure?')) return;

    try {
      await supabase.from('comments').delete().eq('id', commentId).eq('user_id', user.id);
      await loadComments();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLike = async () => {
    if (!user || liking) return;
    setLiking(true);
    try {
      if (isLiked) {
        await unlikePost(post.id, user.id);
        setIsLiked(false);
        setLikesCount(Math.max(0, likesCount - 1));
      } else {
        await likePost(post.id, user.id);
        setIsLiked(true);
        setLikesCount(likesCount + 1);
      }
      onLikeUpdate?.();
    } finally {
      setLiking(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const handleDeletePost = async () => {
    if (!user || !confirm(t('confirm_delete_post') || 'Delete this post?')) return;
    setDeleting(true);
    try {
      await supabase.from('posts').delete().eq('id', post.id);
      window.location.reload();
    } finally {
      setDeleting(false);
    }
  };

  const handleAskAi = () => {
    const prompt = `I am looking at a plant post titled "${post.title}". Description: "${post.description || ''}". Can you give me expert advice on this plant?`;
    localStorage.setItem('aiAssistantQuestion', prompt);
    window.dispatchEvent(new CustomEvent('openAiAssistant'));
  };

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden border border-[#34D399]/20 animate-slideUp hover:border-[#34D399]/40 transition">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => window.location.href = `/profile/${post.user_id}`}
            className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center border border-[#34D399]/30 hover:border-[#34D399]/60 transition"
          >
            <User className="w-5 h-5 text-[#34D399]" />
          </button>
          <button
            onClick={() => window.location.href = `/profile/${post.user_id}`}
            className="hover:text-[#34D399] transition text-left"
          >
            <p className="font-semibold text-white">{post.profiles?.username || 'User'}</p>
            <p className="text-xs text-gray-500">{formatDate(post.created_at)}</p>
          </button>
          
          <div className="ms-auto flex items-center gap-1 bg-[#34D399]/10 px-3 py-1 rounded-full">
            <Award className="w-4 h-4 text-[#34D399]" />
            <span className="text-sm font-semibold text-[#34D399]">+{post.points_awarded}</span>
          </div>

          {isOwnPost && (
            <button onClick={handleDeletePost} disabled={deleting} className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg">
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Post Title */}
        <h3 className="text-lg font-bold text-white mb-2">
          {post.title}
        </h3>
        
        {post.description && (
          <p className="text-gray-300 mb-3">
            {post.description}
          </p>
        )}
      </div>

      {/* Image */}
      <img src={post.image_url} alt={post.title} className="w-full h-auto max-h-[70vh] object-contain bg-black" />

      {/* Actions */}
      <div className="p-4">
        <div className="flex items-center justify-between w-full mb-2">
          <div className="flex items-center gap-4 sm:gap-6">
            <button onClick={handleLike} disabled={!user} className={`flex items-center gap-2 ${isLiked ? 'text-red-500' : 'text-gray-400'} transition-all hover:scale-110 active:scale-90`}>
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-sm font-medium">{likesCount}</span>
            </button>

            <button 
              onClick={() => setShowComments(!showComments)} 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${showComments ? 'bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30' : 'text-gray-400 hover:bg-gray-800'}`}
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{showComments ? comments.length : commentsCount}</span>
            </button>
          </div>

          <button 
            onClick={handleAskAi}
            className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-[#34D399] hover:bg-[#34D399]/10 px-2 sm:px-3 py-1.5 rounded-full border border-[#34D399]/20 transition-all active:scale-95 whitespace-nowrap shadow-sm shadow-[#34D399]/5"
          >
            <Bot className="w-4 h-4" />
            <span className="hidden xs:inline">Ask AI about this</span>
            <span className="xs:hidden">Ask AI</span>
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-4 space-y-4">
            <form onSubmit={handleSubmitComment} className="flex gap-2 items-center">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={t('shareThoughts') || "Comment..."}
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white outline-none focus:border-[#34D399] transition-colors"
              />
              <button type="submit" disabled={loading || !newComment.trim()} className="px-4 py-2 bg-[#34D399] text-black text-sm font-bold rounded-xl active:scale-95 transition-transform">
                {t('post') || "Send"}
              </button>
            </form>

            {commentError && (
              <div className="p-2 bg-red-900/20 border border-red-500 rounded-lg text-red-400 text-xs">
                {commentError}
              </div>
            )}

            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-white">{comment.profiles?.username}</span>
                    <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                    {user?.id === comment.user_id && (
                      <button onClick={() => handleDeleteComment(comment.id, comment.user_id)} className="ms-auto text-gray-500 hover:text-red-400">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-gray-300 text-sm px-1">
                    {comment.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
