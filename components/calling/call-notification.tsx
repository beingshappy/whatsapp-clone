"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Phone, PhoneOff } from "lucide-react"

interface CallNotificationProps {
  caller: {
    uid: string
    displayName: string
    email: string
  }
  onAccept: () => void
  onReject: () => void
  isIncoming: boolean
  callType: "audio" | "video"
}

export default function CallNotification({ caller, onAccept, onReject, isIncoming, callType }: CallNotificationProps) {
  const [ringSound, setRingSound] = useState<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (isIncoming) {
      // Create a simple ring tone using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800
      oscillator.type = "sine"

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)

      oscillator.start(audioContext.currentTime)

      return () => {
        oscillator.stop(audioContext.currentTime + 0.1)
      }
    }
  }, [isIncoming])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-lg w-full max-w-md p-8 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">👤</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{caller.displayName || caller.email}</h2>
          <p className="text-muted-foreground">
            {isIncoming ? `Incoming ${callType} call...` : `Calling ${callType}...`}
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          {isIncoming && (
            <Button size="lg" className="rounded-full w-16 h-16 p-0" onClick={onAccept}>
              <Phone className="w-6 h-6" />
            </Button>
          )}
          <Button size="lg" variant="destructive" className="rounded-full w-16 h-16 p-0" onClick={onReject}>
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  )
}
