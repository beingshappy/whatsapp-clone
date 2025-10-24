import { doc, updateDoc, serverTimestamp, getDoc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"

export async function setUserOnline(userId: string) {
  try {
    const userRef = doc(db, "users", userId)
    await updateDoc(userRef, {
      status: "online",
      lastSeen: serverTimestamp(),
    })
    console.log("[v0] User set to online:", userId)
  } catch (error) {
    console.error("[v0] Error setting user online:", error)
  }
}

export async function setUserOffline(userId: string) {
  try {
    const userRef = doc(db, "users", userId)
    await updateDoc(userRef, {
      status: "offline",
      lastSeen: serverTimestamp(),
    })
    console.log("[v0] User set to offline:", userId)
  } catch (error) {
    console.error("[v0] Error setting user offline:", error)
  }
}

export async function getUserStatus(userId: string) {
  try {
    const userRef = doc(db, "users", userId)
    const userSnap = await getDoc(userRef)
    if (userSnap.exists()) {
      const data = userSnap.data()
      return {
        status: data.status || "offline",
        lastSeen: data.lastSeen?.toDate?.() || new Date(),
      }
    }
    return { status: "offline", lastSeen: new Date() }
  } catch (error) {
    console.error("[v0] Error getting user status:", error)
    return { status: "offline", lastSeen: new Date() }
  }
}

export function setupPresenceListener(userId: string, onStatusChange: (status: string, lastSeen?: Date) => void) {
  setUserOnline(userId)

  const handleOnline = () => {
    setUserOnline(userId)
    onStatusChange("online")
  }

  const handleOffline = () => {
    setUserOffline(userId)
    onStatusChange("offline")
  }

  window.addEventListener("online", handleOnline)
  window.addEventListener("offline", handleOffline)

  const handleBeforeUnload = () => {
    setUserOffline(userId)
  }

  window.addEventListener("beforeunload", handleBeforeUnload)

  return () => {
    window.removeEventListener("online", handleOnline)
    window.removeEventListener("offline", handleOffline)
    window.removeEventListener("beforeunload", handleBeforeUnload)
  }
}

export function formatLastSeen(lastSeen: Date | undefined): string {
  if (!lastSeen) return "offline"

  const now = new Date()
  const diffMs = now.getTime() - lastSeen.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "active now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return lastSeen.toLocaleDateString()
}

export function listenToUserStatus(userId: string, onStatusChange: (status: string, lastSeen?: Date) => void) {
  const userRef = doc(db, "users", userId)

  const unsubscribe = onSnapshot(
    userRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data()
        const lastSeen = data.lastSeen?.toDate?.() || new Date()
        const status = data.status || "offline"

        console.log("[v0] User status updated:", { userId, status, lastSeen })
        onStatusChange(status, lastSeen)
      }
    },
    (error) => {
      console.error("[v0] Error listening to user status:", error)
    },
  )

  return unsubscribe
}

export function getFormattedStatus(status: string, lastSeen: Date | undefined): string {
  if (status === "online") return "active now"
  return formatLastSeen(lastSeen)
}
