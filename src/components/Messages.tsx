import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase, Profile, Message } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Send } from 'lucide-react';
import { getUserModerationState, moderateText, recordBadWordAttempt } from '../lib/contentModeration';
import { createNotification } from '../lib/socialServices';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeToggle } from './ThemeToggle';
import { AiText } from './AiText';
import { encryptMessage, decryptMessage } from '../lib/messageEncryption';
import { playMessageSound, playNotificationSound, sendMessageNotification } from '../lib/notifications';
import { secureLog } from '../lib/secureLogger';

export function Messages() {
  const [searchParams] = useSearchParams();
  const recipientUserId = searchParams.get('user');
  const [messages, setMessages] = useState<Message[]>([]);
  const [recipient, setRecipient] = useState<Profile | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState(recipientUserId);
  const { user } = useAuth();
  const [messageError, setMessageError] = useState('');
  const { t } = useLanguage();
  const { theme } = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = useCallback(async () => {
    if (!user) return;

    // Validate user ID before querying
    if (!user.id || typeof user.id !== 'string' || user.id.trim() === '') {
      secureLog.error('Invalid user.id in loadConversations', new Error('Invalid ID'));
      setConversations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get all users who have messaged with this user
      try {
        secureLog.debug('[Messages] Loading conversations');
        
        // Get both sent and received messages
        const { data: sentData, error: sentError } = await supabase
          .from('messages')
          .select('sender_id, recipient_id')
          .eq('sender_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (sentError && sentError.code !== 'PGRST116') {
          console.error('Error loading sent messages for conversations:', sentError);
          setConversations([]);
          setLoading(false);
          return;
        }

        const { data: receivedData, error: receivedError } = await supabase
          .from('messages')
          .select('sender_id, recipient_id')
          .eq('recipient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (receivedError && receivedError.code !== 'PGRST116') {
          console.error('Error loading received messages for conversations:', receivedError);
          setConversations([]);
          setLoading(false);
          return;
        }

        const data = [...(sentData || []), ...(receivedData || [])];

        if (!data || data.length === 0) {
          setConversations([]);
          setLoading(false);
          return;
        }

        // Get unique user ids
        const userIds = new Set<string>();
        data.forEach((msg: { sender_id: string; recipient_id: string }) => {
          if (msg.sender_id !== user.id) userIds.add(msg.sender_id);
          if (msg.recipient_id !== user.id) userIds.add(msg.recipient_id);
        });

        // Load profiles for these users
        if (userIds.size > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', Array.from(userIds));

          if (profilesError) {
            console.error('Error loading conversation profiles:', profilesError);
            setConversations([]);
          } else {
            setConversations(profiles || []);
          }
        } else {
          setConversations([]);
        }
      } catch (messagesError) {
        console.error('Error loading conversations:', messagesError);
        setConversations([]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadMessagesWithUser = useCallback(async (userId: string) => {
    if (!user) return;

    // Validate inputs before querying
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      secureLog.error('Invalid userId', new Error('Invalid ID'));
      setMessages([]);
      setRecipient(null);
      setLoading(false);
      return;
    }

    if (!user.id || typeof user.id !== 'string' || user.id.trim() === '') {
      secureLog.error('Invalid user.id', new Error('Invalid ID'));
      setMessages([]);
      setRecipient(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      secureLog.debug('[Messages] Loading messages and recipient');

      // Load recipient profile
      const { data: recipientData, error: recipientError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (recipientError && recipientError.code !== 'PGRST116') {
        console.error('Error loading recipient:', recipientError);
      }
      
      setRecipient(recipientData || null);

      // Load messages
      try {
        secureLog.debug('[Messages] Querying messages with user:', userId);
        
        // Query both directions: user sent to recipient, or recipient sent to user
        const { data: sentMessages, error: sentError } = await supabase
          .from('messages')
          .select('*')
          .eq('sender_id', user.id)
          .eq('recipient_id', userId)
          .order('created_at', { ascending: true });

        if (sentError && sentError.code !== 'PGRST116') {
          console.error('[Messages] Error loading sent messages:', sentError);
          setMessages([]);
          setLoading(false);
          return;
        }

        const { data: receivedMessages, error: receivedError } = await supabase
          .from('messages')
          .select('*')
          .eq('sender_id', userId)
          .eq('recipient_id', user.id)
          .order('created_at', { ascending: true });

        if (receivedError && receivedError.code !== 'PGRST116') {
          console.error('[Messages] Error loading received messages:', receivedError);
          setMessages([]);
          setLoading(false);
          return;
        }

        // Combine and sort
        let messagesData: Message[] = [];
        if (sentMessages) {
          messagesData = messagesData.concat(sentMessages);
        }
        if (receivedMessages) {
          messagesData = messagesData.concat(receivedMessages);
        }

        // Sort by created_at
        messagesData.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        secureLog.debug('[Messages] Loaded', messagesData.length, 'messages total');

        if (messagesData.length === 0) {
          setMessages([]);
          setLoading(false);
          return;
        }

        // Decrypt messages without blocking
        const decryptedMessages = await Promise.allSettled(
          messagesData.map(async (msg) => {
            try {
              // Try IV-based decryption first
              if (msg.message_iv) {
                const decrypted = await decryptMessage(msg.content, msg.message_iv);
                if (decrypted.verified) {
                  return { ...msg, content: decrypted.content };
                }
              }
              // Fallback - return as-is if no IV or decryption fails
              return msg;
            } catch (error) {
              console.warn('Decryption error for message:', error);
              return msg; // Return encrypted content as fallback
            }
          })
        );

        // Extract successful results
        const decrypted = decryptedMessages
          .filter((result) => result.status === 'fulfilled')
          .map((result) => (result as PromiseFulfilledResult<Message>).value);

        secureLog.debug('[Messages] Decrypted', decrypted.length, 'messages');
        setMessages(decrypted);
      } catch (messagesError) {
        console.error('Error loading messages:', messagesError);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error in loadMessagesWithUser:', error);
      setRecipient(null);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (selectedUserId) {
      loadMessagesWithUser(selectedUserId);
    } else {
      loadConversations();
    }
  }, [selectedUserId, loadConversations, loadMessagesWithUser]);

  // Subscribe to new messages for real-time conversations update - SILENT, no loading
  useEffect(() => {
    if (!user) return;

    let eventCount = 0;

    // Subscribe to message inserts
    const channel = supabase
      .channel(`conversations:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload: any) => {
          eventCount++;
          const msg = payload.new as Message;
          
          const isRelevant = msg.sender_id === user.id || msg.recipient_id === user.id;
          if (!isRelevant) return;
          
          setConversations((prev) => {
            const otherUserId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
            const exists = prev.some(c => c.id === otherUserId);
            
            if (!exists) {
              (async () => {
                const { data } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', otherUserId)
                  .single();
                
                if (data) {
                  setConversations(p => {
                    if (p.some(c => c.id === data.id)) return p;
                    return [data, ...p];
                  });
                }
              })();
            }
            
            return prev;
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          secureLog.debug('[Messages] Conversations subscription active');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Subscribe to new messages in real-time
  useEffect(() => {
    if (!selectedUserId || !user) return;

    const channelName = `messages:${[user.id, selectedUserId].sort().join(':')}`;

    let messageCount = 0;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload: any) => {
          const newMsg = payload.new as Message;
          messageCount++;
          
          const isRelevant = 
            (newMsg.sender_id === selectedUserId && newMsg.recipient_id === user.id) ||
            (newMsg.sender_id === user.id && newMsg.recipient_id === selectedUserId);
          
          if (isRelevant) {
            await handleNewMessage(newMsg);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          secureLog.debug('[Messages] Real-time chat active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel error:', err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedUserId, user]);

  const handleNewMessage = async (newMsg: Message) => {
    try {
      let decryptedContent = newMsg.content;
      
      // Use new IV-based decryption if available
      if ((newMsg as any).message_iv) {
        const decrypted = await decryptMessage(newMsg.content, (newMsg as any).message_iv);
        if (decrypted.verified) {
          decryptedContent = decrypted.content;
        }
      }
      
      // Silently add message without any loading state
      setMessages((prevMessages) => {
        // Check if message already exists (avoid duplicates)
        if (prevMessages.some((m) => m.id === newMsg.id)) {
          return prevMessages.map((m) =>
            m.id === newMsg.id
              ? {
                  ...newMsg,
                  content: decryptedContent,
                }
              : m
          );
        }
        // Just append - no loading state
        return [
          ...prevMessages,
          {
            ...newMsg,
            content: decryptedContent,
          },
        ];
      });

      // Play sound for incoming messages from the other person
      if (newMsg.sender_id === selectedUserId) {
        playNotificationSound();
      }

      // Auto scroll to bottom
      setTimeout(() => scrollToBottom(), 50);
    } catch (error) {
      console.error('Error handling new message:', error);
      // Silently add as-is if decryption fails
      setMessages((prevMessages) => {
        if (prevMessages.some((m) => m.id === newMsg.id)) {
          return prevMessages;
        }
        return [...prevMessages, newMsg];
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !selectedUserId) return;

    // Validate IDs before querying
    if (!user.id || typeof user.id !== 'string' || user.id.trim() === '') {
      setMessageError('Error: Invalid user ID. Please reload the page.');
      console.error('Invalid user.id:', user.id);
      return;
    }

    if (typeof selectedUserId !== 'string' || selectedUserId.trim() === '') {
      setMessageError('Error: Invalid recipient ID. Please select a user again.');
      console.error('Invalid selectedUserId:', selectedUserId);
      return;
    }

    const moderationState = await getUserModerationState(user.id);
    if (moderationState.isBanned) {
      setMessageError('Your account has been banned due to repeated violations. You can no longer send messages.');
      return;
    }
    if (moderationState.isTimedOut && moderationState.timeoutUntil) {
      const until = new Date(moderationState.timeoutUntil);
      setMessageError(
        `You are currently in a timeout until ${until.toLocaleTimeString()}. You cannot send messages during this period.`
      );
      return;
    }

    const moderation = moderateText(newMessage);
    if (!moderation.allowed) {
      const state = await recordBadWordAttempt(user.id);

      if (state.isBanned) {
        setMessageError(
          'Your account has been banned after repeated violations of our community guidelines. You can no longer send messages.'
        );
        return;
      }

      if (state.isTimedOut && state.timeoutUntil) {
        const until = new Date(state.timeoutUntil);
        setMessageError(
          `Due to repeated violations, you have been placed on a 15-minute timeout and cannot send messages until ${until.toLocaleTimeString()}.`
        );
        return;
      }

      if (state.attempts >= 3) {
        setMessageError(
          moderation.reason ||
            'This message is not allowed. This is your third violation; further attempts will result in a temporary timeout.'
        );
      } else {
        setMessageError(moderation.reason || 'This message is not allowed.');
      }
      return;
    }

    try {
      const messageText = newMessage.trim();
      
      // Encrypt message immediately (async)
      let encrypted = '';
      let messageIv = '';
      
      try {
        const result = await encryptMessage(messageText);
        encrypted = result.encrypted;
        messageIv = result.iv;
        secureLog.debug('[Messages] Message encrypted');
      } catch (encryptError) {
        console.error('Encryption error:', encryptError);
        setMessageError('Failed to encrypt message. Please try again.');
        return;
      }
      
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        sender_id: user.id,
        recipient_id: selectedUserId,
        content: messageText,
        message_hash: '',
        read: false,
        read_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMessage]);
      setNewMessage('');
      setMessageError('');
      
      const { error: sendError, data: sentMessage } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: selectedUserId,
          content: encrypted,
          ...(messageIv && { message_iv: messageIv }),
          message_hash: '',
        })
        .select();

      if (sendError) {
        console.error('Error sending message:', sendError);
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
        setMessageError('Failed to send message');
        return;
      }

      if (sentMessage && sentMessage.length > 0) {
        const realMessage = {
          ...sentMessage[0],
          content: messageText,
        };
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticMessage.id ? realMessage : m))
        );
      }

      // Verify follow status asynchronously (don't block sending)
      verifyFollowStatus(user.id, selectedUserId);

      // Send notification to recipient asynchronously
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const senderName = currentUser?.user_metadata?.username || currentUser?.email?.split('@')[0] || 'Someone';
        
        secureLog.logOperation('Send notification');
        
        // Send database notification
        await createNotification(selectedUserId, 'message', `${senderName} sent you a message`, user.id);
        
        // Send push notification
        await sendMessageNotification(senderName, user.id, selectedUserId);
        
        secureLog.debug('[Messages] Notification sent');
      } catch (notifError) {
        console.error('Exception sending message notification:', notifError);
      }

      playMessageSound();
    } catch (error) {
      console.error('Error sending message:', error);
      setMessageError('Failed to send message');
    }
  };

  // Verify follow status asynchronously without blocking
  const verifyFollowStatus = useCallback(async (userId: string, followingId: string) => {
    try {
      if (!userId || !followingId) return;

      const { data: followData, error: followError } = await supabase
        .from('followers')
        .select('follower_id')
        .eq('follower_id', userId)
        .eq('following_id', followingId)
        .maybeSingle();

      if (followError) {
        secureLog.warn('[Messages] Async follow check failed', followError);
        return;
      }

      if (!followData) {
        secureLog.warn('[Messages] User is not following recipient');
        setMessageError('Note: You must be following this user to send messages');
      }
    } catch (error) {
      secureLog.warn('[Messages] Error in async follow check:', error);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-gray-400">{t('loadingMessages')}</div>
      </div>
    );
  }

  if (!selectedUserId) {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-greenyellow hover:text-greenyellow/80 mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('back')}
          </button>

          <h1 className="text-2xl font-bold text-white mb-6">{t('messages')}</h1>

          {conversations.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              {t('noConversations')}
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedUserId(conv.id)}
                  className="w-full text-start p-4 bg-gray-900 rounded-lg border border-greenyellow/20 hover:border-greenyellow/50 transition-colors"
                >
                  <div className="font-semibold text-white">{conv.username}</div>
                  <div className="text-sm text-gray-400">{conv.bio}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-black' : 'bg-gray-50'} flex flex-col`}>
      <div className={`${theme === 'dark' ? 'bg-gray-900 border-greenyellow/20' : 'bg-white border-gray-200'} border-b p-4`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => setSelectedUserId(null)}
            className="flex items-center gap-2 text-greenyellow hover:text-greenyellow/80"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('backToConversations')}
          </button>
          <ThemeToggle />
        </div>
        {recipient && (
          <div className="max-w-4xl mx-auto mt-2">
            <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{recipient.username}</h2>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            {t('noMessages')}
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender_id === user?.id ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.sender_id === user?.id
                      ? 'bg-greenyellow text-black'
                      : 'bg-gray-800 text-white'
                  }`}
                >
                  <AiText>{msg.content}</AiText>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} className="h-0" />
          </>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="border-t border-greenyellow/20 p-4">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input
            id="message-input"
            name="message"
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={t('typeMessage')}
            autoComplete="off"
            spellCheck="false"
            autoCorrect="off"
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-greenyellow"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-2 bg-greenyellow text-black rounded-lg hover:bg-greenyellow/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        {messageError && (
          <div className="mt-2 text-xs text-red-400 bg-red-900/20 border border-red-500 rounded-lg px-3 py-2 max-w-4xl mx-auto">
            {messageError}
          </div>
        )}
      </form>
    </div>
  );
}
