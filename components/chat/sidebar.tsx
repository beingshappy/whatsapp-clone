"use client"

import { useState, useEffect } from "react"
import type { User } from "firebase/auth"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { auth } from "@/lib/firebase"
import { signOut } from "firebase/auth"
import { Search, LogOut, Plus, Settings, Users, X } from "lucide-react"
import NewChatDialog from "./new-chat-dialog"
import ContactsTab from "@/components/contacts/contacts-tab"
import UserProfileModal from "@/components/profile/user-profile-modal"
import SettingsModal from "@/components/settings/settings-modal"
import SearchMessages from "./search-messages"
import { getUserById } from "@/lib/user-utils"
import { listenToUserStatus, formatLastSeen } from "@/lib/presence-utils"

interface Chat {
  id: string
  participants: string[]
  lastMessage: string
  lastMessageTime: number
  lastMessageSender: string
}

interface SidebarProps {
  user: User
  chats: Chat[]
  selectedChat: Chat | null
  onSelectChat: (chat: Chat) => void
  loading: boolean
  onChatsRefresh: () => void
  onToggleSidebar: () => void
}

interface ChatWithUserInfo extends Chat {
  otherUserName?: string
  otherUserPhone?: string
  otherUserStatus?: string
  otherUserLastSeen?: Date
  otherUserProfilePicture?: string
}

export default function Sidebar({
  user,
  chats,
  selectedChat,
  onSelectChat,
  loading,
  onChatsRefresh,
  onToggleSidebar,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isNewChatOpen, setIsNewChatOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"chats" | "contacts">("chats")
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [chatsWithUserInfo, setChatsWithUserInfo] = useState<ChatWithUserInfo[]>([])
  const [userLastSeen, setUserLastSeen] = useState<Date>(new Date())

  useEffect(() => {
    const fetchUserInfo = async () => {
      const updatedChats = await Promise.all(
        chats.map(async (chat) => {
          const otherUserId = chat.participants.find((p) => p !== user.uid)
          if (otherUserId) {
            const otherUser = await getUserById(otherUserId)
            return {
              ...chat,
              otherUserName: otherUser?.displayName || "Unknown User",
              otherUserPhone: otherUser?.phoneNumber || "No phone",
              otherUserStatus: otherUser?.status || "offline",
              otherUserLastSeen: otherUser?.lastSeen?.toDate?.() || new Date(),
              otherUserProfilePicture: otherUser?.photoURL || null,
            }
          }
          return chat
        }),
      )
      setChatsWithUserInfo(updatedChats)
    }

    fetchUserInfo()
  }, [chats, user.uid])

  useEffect(() => {
    const unsubscribers: Array<() => void> = []

    chatsWithUserInfo.forEach((chat) => {
      const otherUserId = chat.participants.find((p) => p !== user.uid)
      if (otherUserId) {
        const unsubscribe = listenToUserStatus(otherUserId, (status, lastSeen, photoURL) => {
          setChatsWithUserInfo((prev) =>
            prev.map((c) =>
              c.id === chat.id
                ? {
                    ...c,
                    otherUserStatus: status,
                    otherUserLastSeen: lastSeen,
                    otherUserProfilePicture: photoURL || c.otherUserProfilePicture,
                  }
                : c,
            ),
          )
        })
        unsubscribers.push(unsubscribe)
      }
    })

    return () => {
      unsubscribers.forEach((unsub) => unsub())
    }
  }, [chatsWithUserInfo, user.uid])

  const handleLogout = async () => {
    await signOut(auth)
  }

  const filteredChats = chatsWithUserInfo.filter(
    (chat) =>
      chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.otherUserName?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleStartChatFromContact = async (userId: string) => {
    setIsNewChatOpen(false)
    setActiveTab("chats")
  }

  return (
    <>
      <div className="w-full h-full bg-card border-r border-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-3 md:p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl md:text-2xl font-bold text-foreground">WhatsApp</h1>
            <div className="flex gap-1 md:gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsSearchOpen(true)}
                className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0"
              >
                <Search className="w-4 h-4 md:w-5 md:h-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsNewChatOpen(true)}
                className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0"
              >
                <Plus className="w-4 h-4 md:w-5 md:h-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsSettingsOpen(true)}
                className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0"
              >
                <Settings className="w-4 h-4 md:w-5 md:h-5" />
              </Button>
              <Button size="icon" variant="ghost" onClick={onToggleSidebar} className="md:hidden h-8 w-8 flex-shrink-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={activeTab === "chats" ? "default" : "outline"}
              size="sm"
              className="flex-1 text-xs md:text-sm h-8 md:h-9"
              onClick={() => setActiveTab("chats")}
            >
              Chats
            </Button>
            <Button
              variant={activeTab === "contacts" ? "default" : "outline"}
              size="sm"
              className="flex-1 text-xs md:text-sm h-8 md:h-9"
              onClick={() => setActiveTab("contacts")}
            >
              <Users className="w-3 h-3 md:w-4 md:h-4 mr-1" />
              Contacts
            </Button>
          </div>

          {/* Search */}
          {activeTab === "chats" && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-sm h-9"
              />
            </div>
          )}
        </div>

        {/* Content - Fixed overflow */}
        {activeTab === "chats" ? (
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground text-sm">Loading chats...</div>
            ) : filteredChats.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">No chats yet</div>
            ) : (
              filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => onSelectChat(chat)}
                  className={`p-3 md:p-4 border-b border-border cursor-pointer transition-colors hover:bg-muted ${
                    selectedChat?.id === chat.id ? "bg-primary/10" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {chat.otherUserProfilePicture ? (
                        <img
                          src={chat.otherUserProfilePicture || "/placeholder.svg"}
                          alt={chat.otherUserName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg md:text-xl">👤</span>
                      )}
                      <div
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 md:w-3 md:h-3 rounded-full border-2 border-card ${
                          chat.otherUserStatus === "online" ? "bg-green-500" : "bg-gray-400"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate text-sm md:text-base">{chat.otherUserName}</p>
                      <p className="text-xs text-muted-foreground truncate">{formatLastSeen(chat.otherUserLastSeen)}</p>
                      <p className="text-xs md:text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto min-h-0">
            <ContactsTab user={user} onStartChat={handleStartChatFromContact} />
          </div>
        )}

        {/* User Profile Footer */}
        <div className="p-3 md:p-4 border-t border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL || "/placeholder.svg"}
                    alt={user.displayName || "User"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs md:text-sm">👤</span>
                )}
                <div className="absolute bottom-0 right-0 w-2 h-2 md:w-2.5 md:h-2.5 rounded-full border-2 border-card bg-green-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground truncate text-xs md:text-sm">{user?.displayName || "User"}</p>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsProfileOpen(true)}
              className="h-8 w-8 flex-shrink-0"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="outline" className="w-full bg-transparent text-xs md:text-sm h-8" onClick={handleLogout}>
            <LogOut className="w-3 h-3 md:w-4 md:h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <NewChatDialog
        user={user}
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        onChatCreated={onChatsRefresh}
      />

      <UserProfileModal user={user} isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      <SettingsModal user={user} isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <SearchMessages user={user} isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  )
}
