"use client"

let auth: any = null
let db: any = null
let storage: any = null
let initialized = false

const firebaseConfig = {
  apiKey: "AIzaSyDEIUlMT_GxJLIjT-a9kfkP61bVj0bqZ3g",
  authDomain: "build-with-happy-chat.firebaseapp.com",
  projectId: "build-with-happy-chat",
  storageBucket: "build-with-happy-chat.firebasestorage.app",
  messagingSenderId: "876016930865",
  appId: "1:876016930865:web:c14594d64f0b24271d8510",
}

async function initializeFirebase() {
  if (initialized) return { auth, db, storage }

  try {
    const { initializeApp } = await import("firebase/app")
    const { getAuth, setPersistence, browserLocalPersistence } = await import("firebase/auth")
    const { getFirestore, enableIndexedDbPersistence } = await import("firebase/firestore")
    const { getStorage } = await import("firebase/storage")

    console.log("[v0] Firebase Config Status:", {
      apiKey: firebaseConfig.apiKey ? "✓ Set" : "✗ Missing",
      authDomain: firebaseConfig.authDomain ? "✓ Set" : "✗ Missing",
      projectId: firebaseConfig.projectId ? "✓ Set" : "✗ Missing",
      storageBucket: firebaseConfig.storageBucket ? "✓ Set" : "✗ Missing",
      messagingSenderId: firebaseConfig.messagingSenderId ? "✓ Set" : "✗ Missing",
      appId: firebaseConfig.appId ? "✓ Set" : "✗ Missing",
    })

    const app = initializeApp(firebaseConfig)
    auth = getAuth(app)

    setPersistence(auth, browserLocalPersistence).catch((error: any) => {
      console.warn("[v0] Could not set persistence:", error.message)
    })

    db = getFirestore(app)

    try {
      await enableIndexedDbPersistence(db)
      console.log("[v0] Firestore IndexedDB persistence enabled")
    } catch (err: any) {
      if (err.code === "failed-precondition") {
        console.warn("[v0] Multiple tabs open, persistence disabled")
      } else if (err.code === "unimplemented") {
        console.warn("[v0] Browser does not support offline persistence")
      } else {
        console.warn("[v0] Firestore persistence error:", err.message)
      }
    }

    storage = getStorage(app)

    console.log("[v0] Firebase initialized successfully with offline persistence")
    initialized = true
  } catch (error: any) {
    console.error("[v0] Firebase initialization error:", error.message)
    // Create mock objects to prevent crashes
    auth = { currentUser: null }
    db = {}
    storage = {}
    initialized = true
  }

  return { auth, db, storage }
}

// Initialize on module load
if (typeof window !== "undefined") {
  initializeFirebase().catch(console.error)
}

export { auth, db, storage, initializeFirebase }
