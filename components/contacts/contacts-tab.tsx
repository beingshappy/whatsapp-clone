"use client"

import { useState, useEffect } from "react"
import type { User } from "firebase/auth"
import { collection, onSnapshot, query } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, MessageCircle } from "lucide-react"

interface UserProfile {
  uid: string
  phoneNumber: string
  displayName: string
  photoURL: string
  status: string
}

interface ContactsTabProps {
  user: User
  onStartChat: (userId: string) => void
}

export default function ContactsTab({ user, onStartChat }: ContactsTabProps) {
  const [contacts, setContacts] = useState<UserProfile[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const usersRef = collection(db, "users")
    const q = query(usersRef)

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          const usersList = snapshot.docs
            .map((doc) => ({
              uid: doc.id,
              ...doc.data(),
            }))
            .filter((u) => u.uid !== user.uid) as UserProfile[]

          console.log("[v0] Contacts loaded:", usersList.length, "users found")
          setContacts(usersList)
          setError("")
        } catch (err) {
          console.error("[v0] Error processing contacts:", err)
          setError("Error loading contacts")
        } finally {
          setLoading(false)
        }
      },
      (err) => {
        console.error("[v0] Error fetching contacts:", err)
        setError(`Error: ${err.message}`)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [user.uid])

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phoneNumber?.includes(searchQuery),
  )

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto">
        {error && <div className="p-4 text-center text-destructive text-sm">{error}</div>}
        {loading ? (
          <div className="p-4 text-center text-muted-foreground">Loading contacts...</div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {contacts.length === 0 ? "No contacts available. Invite friends to join!" : "No contacts found"}
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <div key={contact.uid} className="p-4 border-b border-border hover:bg-muted transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">👤</span>
                    <div
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${
                        contact.status === "online" ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{contact.displayName || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground truncate">{contact.phoneNumber}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {contact.status === "online" ? "🟢 Online" : "⚪ Offline"}
                    </p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => onStartChat(contact.uid)} className="flex-shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
