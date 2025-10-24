import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

export async function getUserById(userId: string) {
  try {
    const userDoc = await getDoc(doc(db, "users", userId))
    if (userDoc.exists()) {
      return { id: userId, ...userDoc.data() }
    }
    return null
  } catch (error) {
    console.error("[v0] Error fetching user:", error)
    return null
  }
}

export async function getUserByPhoneNumber(phoneNumber: string) {
  try {
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("phoneNumber", "==", phoneNumber))
    const snapshot = await getDocs(q)

    if (!snapshot.empty) {
      const doc = snapshot.docs[0]
      return { id: doc.id, ...doc.data() }
    }
    return null
  } catch (error) {
    console.error("[v0] Error fetching user by phone:", error)
    return null
  }
}
