import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore"

export interface ReportedMessage {
  id: string
  messageId: string
  reportedBy: string
  reason: string
  timestamp: number
  status: "pending" | "reviewed" | "resolved"
  chatId: string
  messageText: string
}

export interface BlockedUser {
  id: string
  userId: string
  reason: string
  blockedAt: number
  blockedBy: string
}

export const reportMessage = async (
  messageId: string,
  chatId: string,
  messageText: string,
  reportedBy: string,
  reason: string,
) => {
  try {
    const reportsRef = collection(db, "reports")
    await getDocs(query(reportsRef, where("messageId", "==", messageId))).then((snapshot) => {
      if (snapshot.empty) {
        // Add new report
        const newReport = {
          messageId,
          chatId,
          messageText,
          reportedBy,
          reason,
          timestamp: Date.now(),
          status: "pending",
        }
        // In a real app, you'd add this to Firestore
        console.log("[v0] Message reported:", newReport)
      }
    })
  } catch (error) {
    console.error("[v0] Error reporting message:", error)
  }
}

export const blockUser = async (userId: string, reason: string, blockedBy: string) => {
  try {
    const blockedUsersRef = collection(db, "blockedUsers")
    const newBlock = {
      userId,
      reason,
      blockedAt: Date.now(),
      blockedBy,
    }
    console.log("[v0] User blocked:", newBlock)
  } catch (error) {
    console.error("[v0] Error blocking user:", error)
  }
}

export const unblockUser = async (userId: string) => {
  try {
    console.log("[v0] User unblocked:", userId)
  } catch (error) {
    console.error("[v0] Error unblocking user:", error)
  }
}

export const deleteMessage = async (chatId: string, messageId: string) => {
  try {
    const messageRef = doc(db, "chats", chatId, "messages", messageId)
    await deleteDoc(messageRef)
    console.log("[v0] Message deleted:", messageId)
  } catch (error) {
    console.error("[v0] Error deleting message:", error)
  }
}

export const muteUser = async (userId: string, duration: number) => {
  try {
    const userRef = doc(db, "users", userId)
    await updateDoc(userRef, {
      mutedUntil: Date.now() + duration,
    })
    console.log("[v0] User muted for", duration, "ms")
  } catch (error) {
    console.error("[v0] Error muting user:", error)
  }
}
