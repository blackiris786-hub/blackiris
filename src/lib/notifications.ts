import { secureLog } from './secureLogger';

export async function initializeNotifications() {
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });
      
      await requestNotificationPermission();
      
      return reg;
    }
  } catch (error) {
    secureLog.warn('[Notifications] Failed to init', error);
  }
}

export function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = 800;
    osc.type = 'sine';

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (error) {
    secureLog.warn('[Notifications] Could not play sound');
  }
}

export function playMessageSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.setValueAtTime(900, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (error) {
    secureLog.warn('[Notifications] Could not play sound');
  }
}

export function requestNotificationPermission() {
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      return Promise.resolve();
    } else if (Notification.permission !== 'denied') {
      return Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          console.log('Notification permission granted');
        }
      });
    }
  }
  return Promise.resolve();
}

export function sendBrowserNotification(title: string, options?: NotificationOptions) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/logo.svg',
        badge: '/logo.svg',
        ...options,
      });
    } catch (error) {
      console.warn('Could not send notification:', error);
    }
  }
}

export async function sendPushNotification(
  title: string,
  options?: {
    body?: string;
    userId?: string;
    conversationId?: string;
    url?: string;
    tag?: string;
  }
) {
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const reg = await navigator.serviceWorker.ready;
      
      if (document.hasFocus()) {
        sendBrowserNotification(title, {
          body: options?.body,
          tag: options?.tag,
        });
      } else {
        reg.showNotification(title, {
          body: options?.body || 'You have a new message',
          icon: '/logo.svg',
          badge: '/logo.svg',
          tag: options?.tag || 'notification',
          vibrate: [200, 100, 200],
          data: {
            userId: options?.userId,
            conversationId: options?.conversationId,
            url: options?.url || '/',
          },
        });
      }
    }
  } catch (error) {
    secureLog.warn('[Notifications] Could not send push notification', error);
  }
}

export async function sendMessageNotification(
  senderName: string,
  userId: string,
  conversationId: string
) {
  const title = `New message from ${senderName}`;
  const body = 'Tap to reply';
  
  playNotificationSound();
  await sendPushNotification(title, {
    body,
    userId,
    conversationId,
    url: `/messages?user=${userId}`,
    tag: `message-${conversationId}`,
  });
}
