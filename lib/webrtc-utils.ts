export interface CallOffer {
  type: "offer"
  sdp: string
}

export interface CallAnswer {
  type: "answer"
  sdp: string
}

export interface IceCandidate {
  candidate: string
  sdpMLineIndex: number
  sdpMid: string
}

export const createPeerConnection = (
  onIceCandidate: (candidate: RTCIceCandidate) => void,
  onTrack: (event: RTCTrackEvent) => void,
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void,
): RTCPeerConnection => {
  const peerConnection = new RTCPeerConnection({
    iceServers: [
      { urls: ["stun:stun.l.google.com:19302"] },
      { urls: ["stun:stun1.l.google.com:19302"] },
      { urls: ["stun:stun2.l.google.com:19302"] },
    ],
  })

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      onIceCandidate(event.candidate)
    }
  }

  peerConnection.ontrack = onTrack

  peerConnection.onconnectionstatechange = () => {
    console.log("[v0] Connection state:", peerConnection.connectionState)
    onConnectionStateChange?.(peerConnection.connectionState)
  }

  peerConnection.oniceconnectionstatechange = () => {
    console.log("[v0] ICE connection state:", peerConnection.iceConnectionState)
  }

  return peerConnection
}

export const getLocalStream = async (audio = true, video = false): Promise<MediaStream> => {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
      video: video ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    })
  } catch (error) {
    console.error("[v0] Error getting media stream:", error)
    throw error
  }
}

export const createOffer = async (peerConnection: RTCPeerConnection): Promise<CallOffer> => {
  const offer = await peerConnection.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
  })
  await peerConnection.setLocalDescription(offer)
  return {
    type: "offer",
    sdp: offer.sdp,
  }
}

export const createAnswer = async (peerConnection: RTCPeerConnection): Promise<CallAnswer> => {
  const answer = await peerConnection.createAnswer()
  await peerConnection.setLocalDescription(answer)
  return {
    type: "answer",
    sdp: answer.sdp,
  }
}

export const setRemoteDescription = async (
  peerConnection: RTCPeerConnection,
  sdp: string,
  type: "offer" | "answer",
): Promise<void> => {
  const description = new RTCSessionDescription({ type, sdp })
  await peerConnection.setRemoteDescription(description)
}

export const addIceCandidate = async (peerConnection: RTCPeerConnection, candidate: IceCandidate): Promise<void> => {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
  } catch (error) {
    console.error("[v0] Error adding ICE candidate:", error)
  }
}

export const addStreamToPeerConnection = (peerConnection: RTCPeerConnection, stream: MediaStream): void => {
  stream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, stream)
  })
}

export const removeStreamFromPeerConnection = (peerConnection: RTCPeerConnection, stream: MediaStream): void => {
  stream.getTracks().forEach((track) => {
    const sender = peerConnection.getSenders().find((s) => s.track === track)
    if (sender) {
      peerConnection.removeTrack(sender)
    }
  })
}

export const stopMediaStream = (stream: MediaStream): void => {
  stream.getTracks().forEach((track) => {
    track.stop()
  })
}

export const closePeerConnection = (peerConnection: RTCPeerConnection): void => {
  peerConnection.close()
}
