import { db } from "@/lib/firebase"
import { doc, setDoc, getDoc, onSnapshot, updateDoc, collection, query, where } from "firebase/firestore"
import {
  createPeerConnection,
  getLocalStream,
  createOffer,
  createAnswer,
  setRemoteDescription,
  addIceCandidate,
  addStreamToPeerConnection,
  stopMediaStream,
  closePeerConnection,
} from "./webrtc-utils"

export interface CallState {
  callId: string
  initiatorId: string
  recipientId: string
  type: "audio" | "video"
  status: "pending" | "active" | "ended"
  startTime: number
  endTime?: number
}

export class CallManager {
  private peerConnection: RTCPeerConnection | null = null
  private localStream: MediaStream | null = null
  private remoteStream: MediaStream | null = null
  private callId: string | null = null
  private currentUserId: string
  private otherUserId: string
  private callType: "audio" | "video"

  constructor(currentUserId: string, otherUserId: string, callType: "audio" | "video" = "audio") {
    this.currentUserId = currentUserId
    this.otherUserId = otherUserId
    this.callType = callType
    this.remoteStream = new MediaStream()
  }

  async initiateCall(): Promise<string> {
    try {
      console.log("[v0] Initiating call...")

      try {
        this.localStream = await getLocalStream(true, this.callType === "video")
      } catch (streamError) {
        console.error("[v0] Error getting local stream:", streamError)
        throw new Error("Unable to access camera/microphone. Please check permissions.")
      }

      // Create peer connection
      this.peerConnection = createPeerConnection(
        (candidate) => this.sendIceCandidate(candidate),
        (event) => this.handleRemoteTrack(event),
        (state) => this.handleConnectionStateChange(state),
      )

      // Add local stream to peer connection
      if (this.localStream) {
        addStreamToPeerConnection(this.peerConnection, this.localStream)
      }

      // Create offer
      const offer = await createOffer(this.peerConnection)

      // Create call document
      this.callId = `${this.currentUserId}_${this.otherUserId}_${Date.now()}`
      await setDoc(doc(db, "calls", this.callId), {
        initiatorId: this.currentUserId,
        recipientId: this.otherUserId,
        type: this.callType,
        status: "pending",
        offer: offer.sdp,
        startTime: Date.now(),
      })

      // Listen for answer
      this.listenForAnswer()

      return this.callId
    } catch (error) {
      console.error("[v0] Error initiating call:", error)
      throw error
    }
  }

  async acceptCall(callId: string): Promise<void> {
    try {
      console.log("[v0] Accepting call...")
      this.callId = callId

      // Get call document
      const callDoc = await getDoc(doc(db, "calls", callId))
      if (!callDoc.exists()) {
        throw new Error("Call not found")
      }

      const callData = callDoc.data() as CallState & { offer: string }

      // Get local stream
      this.localStream = await getLocalStream(true, this.callType === "video")

      // Create peer connection
      this.peerConnection = createPeerConnection(
        (candidate) => this.sendIceCandidate(candidate),
        (event) => this.handleRemoteTrack(event),
        (state) => this.handleConnectionStateChange(state),
      )

      // Add local stream
      if (this.localStream) {
        addStreamToPeerConnection(this.peerConnection, this.localStream)
      }

      // Set remote description (offer)
      await setRemoteDescription(this.peerConnection, callData.offer, "offer")

      // Create answer
      const answer = await createAnswer(this.peerConnection)

      // Update call with answer
      await updateDoc(doc(db, "calls", callId), {
        answer: answer.sdp,
        status: "active",
      })

      // Listen for ICE candidates
      this.listenForIceCandidates()
    } catch (error) {
      console.error("[v0] Error accepting call:", error)
      throw error
    }
  }

  async rejectCall(callId: string): Promise<void> {
    try {
      await updateDoc(doc(db, "calls", callId), {
        status: "ended",
        endTime: Date.now(),
      })
    } catch (error) {
      console.error("[v0] Error rejecting call:", error)
    }
  }

  private async listenForAnswer(): Promise<void> {
    if (!this.callId) return

    const unsubscribe = onSnapshot(doc(db, "calls", this.callId), async (snapshot) => {
      const data = snapshot.data() as CallState & { answer?: string }

      if (data?.answer && this.peerConnection) {
        try {
          await setRemoteDescription(this.peerConnection, data.answer, "answer")
          this.listenForIceCandidates()
        } catch (error) {
          console.error("[v0] Error setting remote description:", error)
        }
      }

      if (data?.status === "ended") {
        this.endCall()
        unsubscribe()
      }
    })
  }

  private async listenForIceCandidates(): Promise<void> {
    if (!this.callId) return

    const candidatesRef = collection(db, "calls", this.callId, "iceCandidates")
    const q = query(candidatesRef, where("from", "==", this.otherUserId))

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === "added" && this.peerConnection) {
          const candidate = change.doc.data()
          try {
            await addIceCandidate(this.peerConnection, {
              candidate: candidate.candidate,
              sdpMLineIndex: candidate.sdpMLineIndex,
              sdpMid: candidate.sdpMid,
            })
          } catch (error) {
            console.error("[v0] Error adding ICE candidate:", error)
          }
        }
      })
    })
  }

  private async sendIceCandidate(candidate: RTCIceCandidate): Promise<void> {
    if (!this.callId) return

    try {
      const candidatesRef = collection(db, "calls", this.callId, "iceCandidates")
      await setDoc(doc(candidatesRef), {
        candidate: candidate.candidate,
        sdpMLineIndex: candidate.sdpMLineIndex,
        sdpMid: candidate.sdpMid,
        from: this.currentUserId,
      })
    } catch (error) {
      console.error("[v0] Error sending ICE candidate:", error)
    }
  }

  private handleRemoteTrack(event: RTCTrackEvent): void {
    console.log("[v0] Remote track received:", event.track.kind)
    if (this.remoteStream) {
      this.remoteStream.addTrack(event.track)
    }
  }

  private handleConnectionStateChange(state: RTCPeerConnectionState): void {
    console.log("[v0] Connection state changed:", state)
    if (state === "failed") {
      console.log("[v0] Connection failed, attempting to reconnect...")
      this.attemptReconnect()
    }
  }

  private async attemptReconnect(): Promise<void> {
    try {
      if (this.peerConnection) {
        closePeerConnection(this.peerConnection)
      }
      // Recreate peer connection
      this.peerConnection = createPeerConnection(
        (candidate) => this.sendIceCandidate(candidate),
        (event) => this.handleRemoteTrack(event),
        (state) => this.handleConnectionStateChange(state),
      )

      if (this.localStream) {
        addStreamToPeerConnection(this.peerConnection, this.localStream)
      }

      console.log("[v0] Reconnection attempt initiated")
    } catch (error) {
      console.error("[v0] Reconnection failed:", error)
    }
  }

  async endCall(): Promise<void> {
    try {
      if (this.callId) {
        await updateDoc(doc(db, "calls", this.callId), {
          status: "ended",
          endTime: Date.now(),
        })
      }

      if (this.localStream) {
        stopMediaStream(this.localStream)
      }

      if (this.peerConnection) {
        closePeerConnection(this.peerConnection)
      }

      this.peerConnection = null
      this.localStream = null
      this.remoteStream = null
      this.callId = null
    } catch (error) {
      console.error("[v0] Error ending call:", error)
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream
  }

  toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled
      })
    }
  }

  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled
      })
    }
  }
}
