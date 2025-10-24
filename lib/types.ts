export interface User {
  uid: string
  email: string
  displayName: string
  photoURL: string
  status: "online" | "offline" | "away"
  lastSeen: number
}

export interface Chat {
  id: string
  participants: string[]
  lastMessage: string
  lastMessageTime: number
  lastMessageSender: string
  createdAt: number
}

export interface Message {
  id: string
  chatId: string
  senderId: string
  text: string
  timestamp: number
  readBy: string[]
  edited: boolean
  editedAt?: number
  type?: "text" | "image" | "document" | "emoji"
  imageUrl?: string
  documentUrl?: string
  documentName?: string
  reactions?: Record<string, string[]> // emoji -> array of user IDs
  deletedFor?: string[] // array of user IDs who deleted this message
  deletedForEveryone?: boolean
}

export interface Call {
  id: string
  initiatorId: string
  recipientId: string
  type: "audio" | "video"
  status: "pending" | "active" | "ended"
  startTime: number
  endTime?: number
}
