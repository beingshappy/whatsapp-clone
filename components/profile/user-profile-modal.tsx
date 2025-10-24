"use client"

import type React from "react"
import { useState } from "react"
import type { User } from "firebase/auth"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Upload } from "lucide-react"

interface UserProfileModalProps {
  user: User
  isOpen: boolean
  onClose: () => void
}

export default function UserProfileModal({ user, isOpen, onClose }: UserProfileModalProps) {
  const [displayName, setDisplayName] = useState(user?.displayName || "")
  const [profilePicture, setProfilePicture] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setProfilePicture(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      if (user) {
        const updateData: any = {
          displayName,
        }

        if (profilePicture) {
          updateData.photoURL = profilePicture
        }

        await updateDoc(doc(db, "users", user.uid), updateData)

        if (user.updateProfile) {
          await user.updateProfile({
            displayName,
            photoURL: profilePicture || user.photoURL || undefined,
          })
        }

        setProfilePicture(null)
        setSuccess("Profile updated successfully")
        setTimeout(() => {
          setSuccess("")
          onClose()
        }, 2000)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Edit Profile</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Profile Picture</label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {profilePicture ? (
                  <img
                    src={profilePicture || "/placeholder.svg"}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl">👤</span>
                )}
              </div>
              <label className="flex-1">
                <Button type="button" variant="outline" className="w-full bg-transparent" asChild>
                  <span className="cursor-pointer flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload Picture
                  </span>
                </Button>
                <input type="file" accept="image/*" onChange={handleProfilePictureChange} className="hidden" />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Display Name</label>
            <Input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Email</label>
            <Input type="email" value={user?.email || ""} disabled className="bg-muted" />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1 bg-transparent" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
