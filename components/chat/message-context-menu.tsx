"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Flag, Trash2, Copy } from "lucide-react"

interface MessageContextMenuProps {
  messageId: string
  messageText: string
  isOwn: boolean
  onDelete: (messageId: string) => void
  onReport: (messageId: string, reason: string) => void
}

export default function MessageContextMenu({
  messageId,
  messageText,
  isOwn,
  onDelete,
  onReport,
}: MessageContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showReportForm, setShowReportForm] = useState(false)
  const [reportReason, setReportReason] = useState("")
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleReport = () => {
    if (reportReason.trim()) {
      onReport(messageId, reportReason)
      setReportReason("")
      setShowReportForm(false)
      setIsOpen(false)
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        ⋮
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-10">
          {showReportForm ? (
            <div className="p-3 space-y-2">
              <p className="text-sm font-semibold text-foreground">Report reason</p>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Why are you reporting this message?"
                className="w-full p-2 text-sm border border-border rounded bg-background text-foreground resize-none"
                rows={3}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleReport} className="flex-1">
                  Submit
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowReportForm(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(messageText)
                  setIsOpen(false)
                }}
                className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2 transition-colors"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
              {isOwn && (
                <button
                  onClick={() => {
                    onDelete(messageId)
                    setIsOpen(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-muted flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
              <button
                onClick={() => setShowReportForm(true)}
                className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2 transition-colors"
              >
                <Flag className="w-4 h-4" />
                Report
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
