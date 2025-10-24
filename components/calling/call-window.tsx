"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react"

interface CallWindowProps {
  remoteUser: {
    uid: string
    displayName: string
    email: string
  }
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  onEndCall: () => void
  isVideoCall: boolean
  onToggleAudio?: (enabled: boolean) => void
  onToggleVideo?: (enabled: boolean) => void
}

export default function CallWindow({
  remoteUser,
  localStream,
  remoteStream,
  onEndCall,
  isVideoCall,
  onToggleAudio,
  onToggleVideo,
}: CallWindowProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(isVideoCall)
  const [callDuration, setCallDuration] = useState(0)

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const toggleMute = () => {
    const newMutedState = !isMuted
    setIsMuted(newMutedState)
    onToggleAudio?.(!newMutedState)
  }

  const toggleVideo = () => {
    const newVideoState = !isVideoOn
    setIsVideoOn(newVideoState)
    onToggleVideo?.(newVideoState)
  }

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      {/* Remote Video */}
      <div className="absolute inset-0">
        {isVideoCall && remoteStream ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-background flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-6xl">👤</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{remoteUser.displayName || remoteUser.email}</h2>
              <p className="text-gray-300">{formatDuration(callDuration)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Local Video (Picture in Picture) */}
      {isVideoCall && localStream && (
        <div className="absolute bottom-24 right-4 w-32 h-40 rounded-lg overflow-hidden border-2 border-white shadow-lg">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
        <Button
          size="lg"
          variant={isMuted ? "destructive" : "default"}
          className="rounded-full w-14 h-14 p-0"
          onClick={toggleMute}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </Button>

        {isVideoCall && (
          <Button
            size="lg"
            variant={!isVideoOn ? "destructive" : "default"}
            className="rounded-full w-14 h-14 p-0"
            onClick={toggleVideo}
          >
            {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </Button>
        )}

        <Button size="lg" variant="destructive" className="rounded-full w-14 h-14 p-0" onClick={onEndCall}>
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>
    </div>
  )
}
