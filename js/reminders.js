// Push-notification plumbing on the phone side. The decision whether to send a
// reminder is made by the scheduled job in supabase/functions/remind.
import { VAPID_PUBLIC_KEY } from './config.js';

export const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const keyBytes = (s) => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};

// Asks for permission and returns this device's subscription details.
export async function enable() {
  // Must be the first await: iPhone only shows the prompt straight after a tap.
  if ((await Notification.requestPermission()) !== 'granted') {
    throw new Error('Notifications are blocked. Allow them in iPhone Settings > Notifications > Mood, then try again.');
  }
  const reg = await navigator.serviceWorker.register('sw.js');
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }));
  const j = sub.toJSON();
  return { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth };
}

// Turns notifications off on this device; returns the endpoint that was removed.
export async function disable() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg && (await reg.pushManager.getSubscription());
  if (!sub) return null;
  await sub.unsubscribe();
  return sub.endpoint;
}
