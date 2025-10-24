// Service worker can be re-enabled in production by uncommenting the registerServiceWorker function

export const registerServiceWorker = async () => {
  // Service worker registration disabled in preview environment
  // Uncomment below for production deployment
  /*
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/api/service-worker", {
        scope: "/",
      })
      console.log("[v0] Service Worker registered:", registration)
      return registration
    } catch (error) {
      console.error("[v0] Service Worker registration failed:", error)
    }
  }
  */
}

export const requestNotificationPermission = async () => {
  if ("Notification" in window) {
    if (Notification.permission === "granted") {
      return true
    }
    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission()
      return permission === "granted"
    }
  }
  return false
}

export const sendNotification = (title: string, options?: NotificationOptions) => {
  if ("serviceWorker" in navigator && "Notification" in window) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, options)
    })
  }
}

export const isOnline = () => navigator.onLine

export const onOnlineStatusChange = (callback: (isOnline: boolean) => void) => {
  window.addEventListener("online", () => callback(true))
  window.addEventListener("offline", () => callback(false))
}
