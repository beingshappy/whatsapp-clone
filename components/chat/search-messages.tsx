"use client"

import { useState, useEffect } from "react"
import type { User } from "firebase/auth"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { X, Search } from "lucide-react"

interface SearchResult {
  id: string
  chatId: string
  text: string
  senderId: string
  timestamp: number
}

interface SearchMessagesProps {
  user: User
  isOpen: boolean
  onClose: () => void
}

export default function SearchMessages({ user, isOpen, onClose }: SearchMessagesProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    const searchMessages = async () => {
      setLoading(true)
      try {
        // Get all chats for the user
        const chatsRef = collection(db, "chats")
        const chatsQuery = query(chatsRef, where("participants", "array-contains", user.uid))
        const chatsSnapshot = await getDocs(chatsQuery)

        const allResults: SearchResult[] = []

        // Search in each chat
        for (const chatDoc of chatsSnapshot.docs) {
          const messagesRef = collection(db, "chats", chatDoc.id, "messages")
          const messagesSnapshot = await getDocs(messagesRef)

          messagesSnapshot.docs.forEach((msgDoc) => {
            const msgData = msgDoc.data()
            if (msgData.text.toLowerCase().includes(searchQuery.toLowerCase())) {
              allResults.push({
                id: msgDoc.id,
                chatId: chatDoc.id,
                text: msgData.text,
                senderId: msgData.senderId,
                timestamp: msgData.timestamp?.toMillis?.() || 0,
              })
            }
          })
        }

        setResults(allResults.sort((a, b) => b.timestamp - a.timestamp))
      } catch (error) {
        console.error("Error searching messages:", error)
      } finally {
        setLoading(false)
      }
    }

    const debounceTimer = setTimeout(searchMessages, 500)
    return () => clearTimeout(debounceTimer)
  }, [searchQuery, user.uid])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-lg w-full max-w-md max-h-96 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Search Messages</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {searchQuery ? "No messages found" : "Enter a search term"}
            </div>
          ) : (
            results.map((result) => (
              <div
                key={`${result.chatId}-${result.id}`}
                className="p-4 border-b border-border hover:bg-muted cursor-pointer"
              >
                <p className="text-sm text-muted-foreground mb-1">Chat {result.chatId.slice(0, 8)}</p>
                <p className="text-sm text-foreground line-clamp-2">{result.text}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(result.timestamp).toLocaleDateString()}</p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
