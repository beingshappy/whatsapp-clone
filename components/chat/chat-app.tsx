"use client"

import { useState, useEffect } from "react"
import type { User } from "firebase/auth"
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import Sidebar from "./sidebar"
import ChatWindow from "./chat-window"
import PWAInstallPrompt from "@/components/pwa/pwa-install-prompt"
import { onOnlineStatusChange } from "@/lib/pwa-utils"
import { setupPresenceListener } from "@/lib/presence-utils"

interface Chat {
  id: string
  participants: string[]
  lastMessage: string
  lastMessageTime: number
  lastMessageSender: string
}

export default function ChatApp({ user }: { user: User }) {
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    onOnlineStatusChange(setIsOnline)
  }, [])

  useEffect(() => {
    if (!user?.uid) return

    const cleanup = setupPresenceListener(user.uid, (status) => {
      console.log("[v0] User presence updated:", status)
    })

    return cleanup
  }, [user?.uid])

  useEffect(() => {
    if (!user) return

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("lastMessageTime", "desc"),
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Chat[]
      setChats(chatList)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const handleChatsRefresh = () => {
    if (user) {
      const q = query(
        collection(db, "chats"),
        where("participants", "array-contains", user.uid),
        orderBy("lastMessageTime", "desc"),
      )

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const chatList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Chat[]
        setChats(chatList)
      })

      return () => unsubscribe()
    }
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar - Hidden on mobile, visible on desktop */}
      <div
        className={`fixed md:static inset-0 z-40 md:z-0 transition-all duration-300 w-full md:w-80 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <Sidebar
          user={user}
          chats={chats}
          selectedChat={selectedChat}
          onSelectChat={(chat) => {
            setSelectedChat(chat)
            setIsSidebarOpen(false)
          }}
          loading={loading}
          onChatsRefresh={handleChatsRefresh}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {selectedChat ? (
          <ChatWindow chat={selectedChat} user={user} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-primary/5 to-background">
            <div className="text-center px-4">
              <div className="text-6xl mb-4">💬</div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Select a chat to start messaging</h2>
              <p className="text-muted-foreground">Choose a conversation or start a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Overlay on Mobile */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <PWAInstallPrompt />
      {!isOnline && (
        <div className="fixed bottom-4 left-4 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">
          You are offline. Messages will sync when you're back online.
        </div>
      )}
    </div>
  )
}
