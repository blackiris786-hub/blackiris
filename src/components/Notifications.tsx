import { useState, useEffect } from 'react';
import { Bell, Heart, MessageCircle, UserPlus, X } from 'lucide-react';
import { getNotifications, markNotificationAsRead, getUnreadNotificationCount } from '../lib/socialServices';
import { Notification } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { playNotificationSound } from '../lib/notifications';
import { supabase } from '../lib/supabase';

interface NotificationsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Notifications({ isOpen, onClose }: NotificationsProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isOpen && user) {
      loadNotifications();
      loadUnreadCount();

      // Subscribe to new notifications in real-time
      console.log('Setting up notifications subscription for user:', user.id);
      const notificationsSubscription = supabase
        .channel(`notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload: any) => {
            const newNotification = payload.new as Notification;
            
            setNotifications((prev) => {
              if (prev.some((n) => n.id === newNotification.id)) {
                return prev;
              }
              return [newNotification, ...prev];
            });

            loadUnreadCount();
            playNotificationSound();
          }
        )
        .subscribe((status) => {
          console.log('Notifications subscription status:', status);
        });

      return () => {
        supabase.removeChannel(notificationsSubscription);
      };
    }
  }, [isOpen, user]);

  const loadNotifications = async () => {
    setLoading(true);
    const { data } = await getNotifications();
    if (data) {
      setNotifications(data);
    }
    setLoading(false);
  };

  const loadUnreadCount = async () => {
    const { count } = await getUnreadNotificationCount();
    setUnreadCount(count);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await markNotificationAsRead(notificationId);
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId
          ? { ...notif, read_at: new Date().toISOString() }
          : notif
      )
    );
    loadUnreadCount();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return <UserPlus className="w-5 h-5 text-[#34D399]" />;
      case 'follow_back':
        return <Heart className="w-5 h-5 text-red-500" />;
      case 'like':
        return <Heart className="w-5 h-5 text-red-500" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'message':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden border border-[#34D399]/20 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#34D399]/20">
          <div className="flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#34D399]" />
            <h2 className="text-xl font-bold text-white">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-[#34D399] text-black text-xs font-bold px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-[#34D399] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="p-8 text-center text-gray-400">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No notifications yet</p>
              <p className="text-sm mt-2">Follow users to get started!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-800/50 transition ${
                    !notification.read_at ? 'bg-[#34D399]/5 border-l-4 border-[#34D399]' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm leading-relaxed">
                        {notification.message}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        {formatTimeAgo(notification.created_at)}
                      </p>
                    </div>
                    {!notification.read_at && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="text-xs text-[#34D399] hover:text-[#16A34A] transition"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
