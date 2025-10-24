"use client"

import type React from "react"
import { useState } from "react"
import type { User } from "firebase/auth"
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X } from "lucide-react"

interface NewChatDialogProps {
  user: User
  isOpen: boolean
  onClose: () => void
  onChatCreated: () => void
}

export default function NewChatDialog({ user, isOpen, onClose, onChatCreated }: NewChatDialogProps) {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const usersRef = collection(db, "users")
      const q = query(usersRef, where("phoneNumber", "==", phoneNumber))
      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        setError("User not found with this phone number")
        setLoading(false)
        return
      }

      const otherUser = snapshot.docs[0]
      const otherUserId = otherUser.id

      if (otherUserId === user.uid) {
        setError("You cannot chat with yourself")
        setLoading(false)
        return
      }

      // Check if chat already exists
      const chatsRef = collection(db, "chats")
      const existingChat = query(chatsRef, where("participants", "array-contains", user.uid))
      const existingSnapshot = await getDocs(existingChat)

      let chatId = null
      for (const doc of existingSnapshot.docs) {
        if (doc.data().participants.includes(otherUserId)) {
          chatId = doc.id
          break
        }
      }

      // Create new chat if it doesn't exist
      if (!chatId) {
        const newChat = await addDoc(chatsRef, {
          participants: [user.uid, otherUserId],
          lastMessage: "",
          lastMessageTime: serverTimestamp(),
          lastMessageSender: "",
        })
        chatId = newChat.id
      }

      setPhoneNumber("")
      onChatCreated()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Start New Chat</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleStartChat} className="space-y-4">
          <Input
            type="tel"
            placeholder="Enter phone number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1 bg-transparent" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Creating..." : "Start Chat"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
