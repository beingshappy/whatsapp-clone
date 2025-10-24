"use client"

import { useState, useRef } from "react"
import { Trash2, MoreVertical, SmilePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface MessageBubbleProps {
  message: any
  isOwn: boolean
  onDelete: (messageId: string, forEveryone: boolean) => void
  onReact: (messageId: string, emoji: string) => void
  isSelected?: boolean
  onSelect?: (messageId: string) => void
}

const EMOJI_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "🙏"]

function formatMessageTime(timestamp: any): string {
  if (!timestamp) return ""

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const isToday = today.getTime() === messageDate.getTime()
  const isYesterday = new Date(today.getTime() - 86400000).getTime() === messageDate.getTime()

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } else if (isYesterday) {
    return "Yesterday " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } else {
    return (
      date.toLocaleDateString([], { month: "short", day: "numeric" }) +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    )
  }
}

export default function MessageBubble({ message, isOwn, onDelete, onReact, isSelected, onSelect }: MessageBubbleProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)

  const handleMouseDown = () => {
    longPressTimer.current = setTimeout(() => {
      onSelect?.(message.id)
    }, 500)
  }

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }
  }

  const handleClick = () => {
    onSelect?.(message.id)
  }

  if (message.deletedForEveryone) {
    return (
      <div className="flex justify-center py-2">
        <p className="text-xs text-muted-foreground italic">This message was deleted</p>
      </div>
    )
  }

  const isRead = message.readBy && message.readBy.length > 1

  return (
    <div
      className={`flex ${isOwn ? "justify-end" : "justify-start"} gap-1 md:gap-2 group w-full`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
    >
      <div className="flex flex-col gap-1 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
        {/* Message bubble */}
        <div
          className={`px-3 md:px-4 py-2 rounded-lg text-sm md:text-base cursor-pointer transition-all ${
            isOwn ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted text-foreground rounded-bl-none"
          } ${isSelected ? "ring-2 ring-primary" : ""}`}
        >
          {/* Message Content */}
          {message.type === "image" && message.imageUrl ? (
            <img src={message.imageUrl || "/placeholder.svg"} alt="Shared image" className="max-w-xs rounded-lg mb-2" />
          ) : message.type === "document" && message.documentUrl ? (
            <a
              href={message.documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 underline"
            >
              📄 {message.documentName || "Document"}
            </a>
          ) : message.type === "emoji" ? (
            <span className="text-4xl">{message.text}</span>
          ) : (
            <p className="break-words">{message.text}</p>
          )}

          {/* Timestamp and Status */}
          <div className="flex items-center justify-between gap-2 mt-1">
            <p className="text-xs opacity-70">{formatMessageTime(message.timestamp)}</p>
            {isOwn && (
              <div className="flex items-center gap-1">
                {isRead ? (
                  <span className="text-xs font-bold text-blue-400">✓✓</span>
                ) : (
                  <span className="text-xs opacity-70">✓</span>
                )}
              </div>
            )}
          </div>
        </div>

        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className={`flex flex-wrap gap-1 px-1 ${isOwn ? "justify-end" : "justify-start"}`}>
            {Object.entries(message.reactions).map(([emoji, userIds]) => (
              <button
                key={emoji}
                className="text-xs bg-muted hover:bg-muted/80 rounded-full px-2 py-1 transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  onReact(message.id, emoji)
                }}
              >
                {emoji} {userIds.length}
              </button>
            ))}
          </div>
        )}
      </div>

      {isSelected && (
        <div className="flex gap-1 items-start pt-1 flex-shrink-0 animate-in fade-in duration-200">
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full"
                onClick={(e) => e.stopPropagation()}
              >
                <SmilePlus className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3 bg-card border border-border rounded-lg shadow-lg">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground mb-2">Add reaction</p>
                <div className="grid grid-cols-4 gap-2">
                  {EMOJI_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      className="text-2xl p-2 rounded-lg hover:bg-muted transition-all hover:scale-110 active:scale-95"
                      onClick={(e) => {
                        e.stopPropagation()
                        onReact(message.id, emoji)
                        setShowEmojiPicker(false)
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {isOwn && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onDelete(message.id, false)} className="cursor-pointer">
                  <Trash2 className="w-4 h-4 mr-2" />
                  <span>Delete for me</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(message.id, true)} className="cursor-pointer">
                  <Trash2 className="w-4 h-4 mr-2" />
                  <span>Delete for everyone</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </div>
  )
}
