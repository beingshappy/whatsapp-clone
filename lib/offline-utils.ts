import { db } from "@/lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"

interface CachedMessage {
  id: string
  chatId: string
  senderId: string
  text: string
  timestamp: number
  readBy: string[]
  status: "sending" | "sent" | "read"
  type?: "text" | "image" | "document" | "emoji"
  imageUrl?: string
  documentUrl?: string
  documentName?: string
  reactions?: Record<string, string[]>
  deletedFor?: string[]
  deletedForEveryone?: boolean
  isEncrypted?: boolean
}

export const getCachedMessages = async (chatId: string): Promise<CachedMessage[]> => {
  try {
    const messagesRef = collection(db, "chats", chatId, "messages")
    const snapshot = await getDocs(messagesRef)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as CachedMessage[]
  } catch (error) {
    console.error("[v0] Error getting cached messages:", error)
    return []
  }
}

export const getCachedChats = async (userId: string) => {
  try {
    const chatsRef = collection(db, "chats")
    const q = query(chatsRef, where("participants", "array-contains", userId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("[v0] Error getting cached chats:", error)
    return []
  }
}

export const isOnline = (): boolean => {
  return typeof window !== "undefined" && navigator.onLine
}

export const getOfflineStatus = (): {
  isOnline: boolean
  lastSyncTime: number | null
  pendingMessages: number
} => {
  if (typeof window === "undefined") {
    return { isOnline: false, lastSyncTime: null, pendingMessages: 0 }
  }

  const lastSync = localStorage.getItem("lastSyncTime")
  const pendingMessages = localStorage.getItem("pendingMessages")

  return {
    isOnline: navigator.onLine,
    lastSyncTime: lastSync ? Number.parseInt(lastSync) : null,
    pendingMessages: pendingMessages ? Number.parseInt(pendingMessages) : 0,
  }
}

export const updateLastSyncTime = () => {
  if (typeof window !== "undefined") {
    localStorage.setItem("lastSyncTime", Date.now().toString())
  }
}

export const setPendingMessageCount = (count: number) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("pendingMessages", count.toString())
  }
}
