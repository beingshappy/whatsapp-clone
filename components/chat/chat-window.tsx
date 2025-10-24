"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import type { User } from "firebase/auth"
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
  writeBatch,
  onSnapshot as firestoreOnSnapshot,
  getDocs,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Phone, Video, Info, Lock, Menu, Trash2, ImageIcon, Smile } from "lucide-react"
import TypingIndicator from "./typing-indicator"
import MessageBubble from "./message-bubble"
import CallWindow from "@/components/calling/call-window"
import CallNotification from "@/components/calling/call-notification"
import { useSecurity } from "@/lib/security-context"
import { encryptMessage, decryptMessage } from "@/lib/encryption"
import { getUserById } from "@/lib/user-utils"
import { playNotificationSound, sendBrowserNotification } from "@/lib/notification-utils"
import { isOnline, getCachedMessages } from "@/lib/offline-utils"
import { CallManager } from "@/lib/call-manager"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Chat {
  id: string
  participants: string[]
  lastMessage: string
  lastMessageTime: number
  lastMessageSender: string
}

interface Message {
  id: string
  senderId: string
  text: string
  timestamp: number
  readBy: string[]
  status: "sending" | "sent" | "read"
  isEncrypted?: boolean
  type?: "text" | "image" | "document" | "emoji"
  imageUrl?: string
  documentUrl?: string
  documentName?: string
  reactions?: Record<string, string[]>
  deletedFor?: string[]
  deletedForEveryone?: boolean
}

export default function ChatWindow({
  chat,
  user,
  onToggleSidebar,
}: {
  chat: Chat
  user: User
  onToggleSidebar?: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const [otherUserName, setOtherUserName] = useState("User")
  const [otherUserId, setOtherUserId] = useState<string>("")
  const [isOnlineStatus, setIsOnlineStatus] = useState(true)
  const [callManager, setCallManager] = useState<CallManager | null>(null)
  const [activeCall, setActiveCall] = useState<{ type: "audio" | "video"; incoming: boolean } | null>(null)
  const [incomingCall, setIncomingCall] = useState<{ callId: string; type: "audio" | "video" } | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { isEncryptionEnabled, encryptionKey } = useSecurity()
  const lastNotificationRef = useRef<number>(0)
  const otherParticipant = chat.participants.find((p) => p !== user.uid)

  useEffect(() => {
    setIsOnlineStatus(isOnline())

    const handleOnline = () => setIsOnlineStatus(true)
    const handleOffline = () => setIsOnlineStatus(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  useEffect(() => {
    const fetchOtherUser = async () => {
      const otherUserId = chat.participants.find((p) => p !== user.uid)
      if (otherUserId) {
        setOtherUserId(otherUserId)
        const otherUser = await getUserById(otherUserId)
        setOtherUserName(otherUser?.displayName || "User")
      }
    }
    fetchOtherUser()
  }, [chat.participants, user.uid])

  useEffect(() => {
    if (!user.uid) return

    const callsRef = collection(db, "calls")
    const q = query(callsRef)

    const unsubscribe = firestoreOnSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const callData = change.doc.data()
          if (callData.recipientId === user.uid && callData.status === "pending") {
            setIncomingCall({
              callId: change.doc.id,
              type: callData.type,
            })
          }
        }
      })
    })

    return () => unsubscribe()
  }, [user.uid])

  useEffect(() => {
    const q = query(collection(db, "chats", chat.id, "messages"), orderBy("timestamp", "asc"))

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const messageList = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const data = doc.data()
            let text = data.text
            if (data.isEncrypted && isEncryptionEnabled && encryptionKey) {
              text = await decryptMessage(data.text, encryptionKey)
            }
            return {
              id: doc.id,
              ...data,
              text,
            }
          }),
        )

        const filteredMessages = messageList.filter(
          (msg: Message) => !msg.deletedFor?.includes(user.uid) && !msg.deletedForEveryone,
        ) as Message[]

        setMessages(filteredMessages)
        setLoading(false)
        scrollToBottom()

        const now = Date.now()
        if (now - lastNotificationRef.current > 1000) {
          const newMessages = filteredMessages.filter((msg: Message) => msg.senderId !== user.uid)
          if (newMessages.length > 0) {
            playNotificationSound()
            sendBrowserNotification(`New message from ${otherUserName}`, {
              body: newMessages[newMessages.length - 1].text,
              icon: "/icon-192.png",
            })
            lastNotificationRef.current = now
          }
        }

        markMessagesAsRead(filteredMessages, chat.id)
      },
      (error) => {
        console.warn("[v0] Firestore listener error:", error)
        if (!isOnlineStatus) {
          getCachedMessages(chat.id).then((cachedMessages) => {
            const filteredMessages = cachedMessages.filter(
              (msg: Message) => !msg.deletedFor?.includes(user.uid) && !msg.deletedForEveryone,
            ) as Message[]
            setMessages(filteredMessages)
            setLoading(false)
          })
        }
      },
    )

    return () => unsubscribe()
  }, [chat.id, user.uid, isEncryptionEnabled, encryptionKey, otherUserName, isOnlineStatus])

  useEffect(() => {
    if (!otherParticipant) return

    // Listen to other user's typing status
    const typingRef = doc(db, "chats", chat.id)
    const unsubscribeTyping = onSnapshot(typingRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data()
        const typingUsers = data.typingUsers || []
        setOtherUserTyping(typingUsers.includes(otherParticipant) && typingUsers.length > 0)
      }
    })

    return () => {
      unsubscribeTyping()
    }
  }, [chat.id, otherParticipant])

  useEffect(() => {
    if (!otherUserId) return

    const userRef = doc(db, "users", otherUserId)
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data()
        const status = data.status || "offline"
        setIsOnlineStatus(status === "online")
        console.log("[v0] Other user status:", { otherUserId, status })
      }
    })

    return () => unsubscribe()
  }, [otherUserId])

  const markMessagesAsRead = async (messageList: Message[], chatId: string) => {
    const unreadMessages = messageList.filter((msg) => msg.senderId !== user.uid && !msg.readBy.includes(user.uid))

    if (unreadMessages.length > 0) {
      const batch = writeBatch(db)
      unreadMessages.forEach((msg) => {
        const msgRef = doc(db, "chats", chatId, "messages", msg.id)
        batch.update(msgRef, {
          readBy: [...msg.readBy, user.uid],
        })
      })
      await batch.commit()
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    try {
      let messageText = newMessage
      let isEncrypted = false
      if (isEncryptionEnabled && encryptionKey) {
        messageText = await encryptMessage(newMessage, encryptionKey)
        isEncrypted = true
      }

      await addDoc(collection(db, "chats", chat.id, "messages"), {
        senderId: user.uid,
        text: messageText,
        timestamp: serverTimestamp(),
        readBy: [user.uid],
        status: "sent",
        isEncrypted,
        type: "text",
      })

      await updateDoc(doc(db, "chats", chat.id), {
        lastMessage: isEncrypted ? "🔒 Encrypted message" : newMessage,
        lastMessageTime: Date.now(),
        lastMessageSender: user.uid,
      })

      setNewMessage("")
      setIsTyping(false)
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const handleSendEmoji = async (emoji: string) => {
    try {
      await addDoc(collection(db, "chats", chat.id, "messages"), {
        senderId: user.uid,
        text: emoji,
        timestamp: serverTimestamp(),
        readBy: [user.uid],
        status: "sent",
        type: "emoji",
      })

      await updateDoc(doc(db, "chats", chat.id), {
        lastMessage: emoji,
        lastMessageTime: Date.now(),
        lastMessageSender: user.uid,
      })
    } catch (error) {
      console.error("Error sending emoji:", error)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const imageUrl = event.target?.result as string
        await addDoc(collection(db, "chats", chat.id, "messages"), {
          senderId: user.uid,
          text: "Shared an image",
          imageUrl,
          timestamp: serverTimestamp(),
          readBy: [user.uid],
          status: "sent",
          type: "image",
        })

        await updateDoc(doc(db, "chats", chat.id), {
          lastMessage: "📷 Image",
          lastMessageTime: Date.now(),
          lastMessageSender: user.uid,
        })
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error("Error uploading image:", error)
    }
  }

  const handleDeleteMessage = async (messageId: string, forEveryone: boolean) => {
    try {
      const msgRef = doc(db, "chats", chat.id, "messages", messageId)
      if (forEveryone) {
        await updateDoc(msgRef, {
          deletedForEveryone: true,
          text: "",
        })
      } else {
        await updateDoc(msgRef, {
          deletedFor: [...(messages.find((m) => m.id === messageId)?.deletedFor || []), user.uid],
        })
      }
    } catch (error) {
      console.error("Error deleting message:", error)
    }
  }

  const handleReactToMessage = async (messageId: string, emoji: string) => {
    try {
      const message = messages.find((m) => m.id === messageId)
      if (!message) return

      const msgRef = doc(db, "chats", chat.id, "messages", messageId)
      const reactions = message.reactions || {}
      const emojiReactions = reactions[emoji] || []

      if (emojiReactions.includes(user.uid)) {
        emojiReactions.splice(emojiReactions.indexOf(user.uid), 1)
      } else {
        emojiReactions.push(user.uid)
      }

      if (emojiReactions.length === 0) {
        delete reactions[emoji]
      } else {
        reactions[emoji] = emojiReactions
      }

      await updateDoc(msgRef, { reactions })
    } catch (error) {
      console.error("Error adding reaction:", error)
    }
  }

  const handleClearChat = async () => {
    if (!confirm("Are you sure you want to clear this chat? This action cannot be undone.")) return

    try {
      const messagesRef = collection(db, "chats", chat.id, "messages")
      const snapshot = await getDocs(messagesRef)

      const batch = writeBatch(db)
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref)
      })
      await batch.commit()

      await updateDoc(doc(db, "chats", chat.id), {
        lastMessage: "",
        lastMessageTime: Date.now(),
      })

      console.log("[v0] Chat cleared successfully")
    } catch (error) {
      console.error("Error clearing chat:", error)
    }
  }

  const handleStartCall = async (isVideo: boolean) => {
    try {
      const manager = new CallManager(user.uid, otherUserId, isVideo ? "video" : "audio")
      setCallManager(manager)
      setActiveCall({ type: isVideo ? "video" : "audio", incoming: false })

      const callId = await manager.initiateCall()
      setLocalStream(manager.getLocalStream())
      setRemoteStream(manager.getRemoteStream())
    } catch (error) {
      console.error("Error starting call:", error)
      setActiveCall(null)
    }
  }

  const handleAcceptCall = async () => {
    if (!incomingCall) return

    try {
      const manager = new CallManager(user.uid, otherUserId, incomingCall.type)
      setCallManager(manager)
      setActiveCall({ type: incomingCall.type, incoming: true })

      await manager.acceptCall(incomingCall.callId)
      setLocalStream(manager.getLocalStream())
      setRemoteStream(manager.getRemoteStream())
      setIncomingCall(null)
    } catch (error) {
      console.error("Error accepting call:", error)
      setActiveCall(null)
    }
  }

  const handleRejectCall = async () => {
    if (!incomingCall || !callManager) return

    try {
      await callManager.rejectCall(incomingCall.callId)
      setIncomingCall(null)
    } catch (error) {
      console.error("Error rejecting call:", error)
    }
  }

  const handleEndCall = async () => {
    if (callManager) {
      await callManager.endCall()
    }
    setActiveCall(null)
    setCallManager(null)
    setLocalStream(null)
    setRemoteStream(null)
  }

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)

    if (!isTyping) {
      setIsTyping(true)
      updateDoc(doc(db, "chats", chat.id), {
        typingUsers: [user.uid],
      }).catch(() => {})
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      updateDoc(doc(db, "chats", chat.id), {
        typingUsers: [],
      }).catch(() => {})
    }, 3000)
  }

  return (
    <div className="flex-1 flex flex-col bg-background h-full overflow-hidden">
      <div className="p-3 md:p-4 border-b border-border flex items-center justify-between bg-card flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Button size="icon" variant="ghost" onClick={onToggleSidebar} className="md:hidden flex-shrink-0 h-8 w-8">
            <Menu className="w-5 h-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-foreground truncate text-sm md:text-base">{otherUserName}</h2>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">{isOnlineStatus ? "Active now" : "Offline"}</p>
              {isEncryptionEnabled && <Lock className="w-3 h-3 text-green-500 flex-shrink-0" />}
            </div>
          </div>
        </div>
        <div className="flex gap-1 md:gap-2 flex-shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 md:h-10 md:w-10"
            onClick={() => handleStartCall(false)}
            disabled={activeCall !== null}
          >
            <Phone className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 md:h-10 md:w-10"
            onClick={() => handleStartCall(true)}
            disabled={activeCall !== null}
          >
            <Video className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8 md:h-10 md:w-10">
                <Info className="w-4 h-4 md:w-5 md:h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleClearChat}>
                <Trash2 className="w-4 h-4 mr-2" />
                Clear chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages - Fixed overflow */}
      <div
        className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 min-h-0"
        onClick={() => setSelectedMessageId(null)}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.senderId === user.uid}
                onDelete={handleDeleteMessage}
                onReact={handleReactToMessage}
                isSelected={selectedMessageId === message.id}
                onSelect={setSelectedMessageId}
              />
            ))}

            {otherUserTyping && (
              <div className="flex justify-start">
                <div className="bg-muted text-foreground rounded-lg rounded-bl-none px-3 md:px-4 py-2">
                  <TypingIndicator />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 md:p-4 border-t border-border bg-card flex-shrink-0">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={handleTyping}
            className="flex-1 text-sm md:text-base h-9 md:h-10"
            disabled={!isOnlineStatus}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="icon" variant="ghost" className="h-9 w-9 md:h-10 md:w-10 flex-shrink-0">
                <Smile className="w-4 h-4 md:w-5 md:h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="grid grid-cols-4 gap-2 p-2">
                {["😀", "😂", "❤️", "👍", "🔥", "😮", "😢", "🎉"].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="text-2xl hover:scale-125 transition-transform"
                    onClick={() => handleSendEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-9 w-9 md:h-10 md:w-10 flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={!isOnlineStatus}
          >
            <ImageIcon className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

          <Button
            type="submit"
            size="icon"
            className="h-9 w-9 md:h-10 md:w-10 flex-shrink-0"
            disabled={!isOnlineStatus}
          >
            <Send className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        </form>
      </div>

      {activeCall && (
        <CallWindow
          remoteUser={{ uid: otherUserId, displayName: otherUserName, email: "" }}
          localStream={localStream}
          remoteStream={remoteStream}
          onEndCall={handleEndCall}
          isVideoCall={activeCall.type === "video"}
          onToggleAudio={(enabled) => callManager?.toggleAudio(enabled)}
          onToggleVideo={(enabled) => callManager?.toggleVideo(enabled)}
        />
      )}

      {incomingCall && (
        <CallNotification
          caller={{ uid: otherUserId, displayName: otherUserName, email: "" }}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
          isIncoming={true}
          callType={incomingCall.type}
        />
      )}
    </div>
  )
}
