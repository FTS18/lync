/**
 * Browser Notification utility.
 * Handles permission requesting and triggering local notifications.
 */

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  if (Notification.permission === "granted") {
    return true;
  }
  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
  return false;
}

export function showNotification(title: string, options?: NotificationOptions) {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, {
        icon: "https://assets.vercel.com/image/upload/v1588805858/nextjs/desktop-favicon.png",
        ...options,
      });
    } catch {
      // Fallback for browsers requiring service worker registration for notifications
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          icon: "https://assets.vercel.com/image/upload/v1588805858/nextjs/desktop-favicon.png",
          ...options,
        });
      });
    }
  }
}
