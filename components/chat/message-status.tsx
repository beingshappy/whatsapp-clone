"use client"

import { Check, CheckCheck } from "lucide-react"

interface MessageStatusProps {
  isRead: boolean
  isSent: boolean
}

export default function MessageStatus({ isRead, isSent }: MessageStatusProps) {
  if (!isSent) {
    return <div className="w-4 h-4 rounded-full border border-muted-foreground" />
  }

  if (isRead) {
    return <CheckCheck className="w-4 h-4 text-primary" />
  }

  return <Check className="w-4 h-4 text-muted-foreground" />
}
