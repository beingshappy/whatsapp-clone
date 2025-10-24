"use client"

import { useState, useEffect } from "react"
import type { User } from "firebase/auth"
import { doc, updateDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { X, Moon, Sun, Monitor, Lock, Eye, Users } from "lucide-react"
import { useTheme } from "@/lib/theme-context"
import { useSecurity } from "@/lib/security-context"

interface SettingsModalProps {
  user: User
  isOpen: boolean
  onClose: () => void
}

interface PrivacySettings {
  lastSeenVisibility: "everyone" | "contacts" | "nobody"
  profilePhotoVisibility: "everyone" | "contacts" | "nobody"
  blockedContacts: string[]
}

export default function SettingsModal({ user, isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useTheme()
  const { isEncryptionEnabled, setIsEncryptionEnabled } = useSecurity()
  const [notifications, setNotifications] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    lastSeenVisibility: "everyone",
    profilePhotoVisibility: "everyone",
    blockedContacts: [],
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (!isOpen || !user?.uid) return

    const loadPrivacySettings = async () => {
      try {
        const userRef = doc(db, "users", user.uid)
        const userSnap = await getDoc(userRef)
        if (userSnap.exists()) {
          const data = userSnap.data()
          if (data.privacySettings) {
            setPrivacySettings(data.privacySettings)
          }
        }
      } catch (error) {
        console.error("[v0] Error loading privacy settings:", error)
      }
    }

    loadPrivacySettings()
  }, [isOpen, user?.uid])

  const handleSavePrivacySettings = async () => {
    if (!user?.uid) return

    setLoading(true)
    try {
      const userRef = doc(db, "users", user.uid)
      await updateDoc(userRef, {
        privacySettings,
      })
      setSuccess("Privacy settings saved successfully")
      setTimeout(() => setSuccess(""), 2000)
    } catch (error) {
      console.error("[v0] Error saving privacy settings:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 p-4 border-b border-border bg-card flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-bold text-foreground">Settings</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6 flex-1 overflow-y-auto">
          {success && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 text-sm">
              {success}
            </div>
          )}

          {/* Account Section */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Account</h3>
            <div className="space-y-2">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium text-foreground truncate">{user?.email}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Display Name</p>
                <p className="text-sm font-medium text-foreground truncate">{user?.displayName || "Not set"}</p>
              </div>
            </div>
          </div>

          {/* Theme Section */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Theme</h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setTheme("light")}
                className={`p-3 rounded-lg border-2 transition-colors flex flex-col items-center gap-2 text-xs ${
                  theme === "light" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                }`}
              >
                <Sun className="w-5 h-5" />
                <span className="font-medium">Light</span>
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`p-3 rounded-lg border-2 transition-colors flex flex-col items-center gap-2 text-xs ${
                  theme === "dark" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                }`}
              >
                <Moon className="w-5 h-5" />
                <span className="font-medium">Dark</span>
              </button>
              <button
                onClick={() => setTheme("system")}
                className={`p-3 rounded-lg border-2 transition-colors flex flex-col items-center gap-2 text-xs ${
                  theme === "system" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                }`}
              >
                <Monitor className="w-5 h-5" />
                <span className="font-medium">System</span>
              </button>
            </div>
          </div>

          {/* Notifications Section */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Notifications</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-foreground">Enable notifications</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-foreground">Sound enabled</span>
              </label>
            </div>
          </div>

          {/* Security Section */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Security
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEncryptionEnabled}
                  onChange={(e) => setIsEncryptionEnabled(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-foreground">End-to-end encryption</span>
              </label>
              {isEncryptionEnabled && (
                <p className="text-xs text-muted-foreground pl-7">
                  Your messages are encrypted and can only be read by you and the recipient.
                </p>
              )}
            </div>
          </div>

          {/* Privacy Section */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Privacy
            </h3>
            <div className="space-y-4">
              {/* Last Seen Visibility */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium text-foreground mb-2">Last seen visibility</p>
                <div className="space-y-2">
                  {(["everyone", "contacts", "nobody"] as const).map((option) => (
                    <label key={option} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="lastSeen"
                        checked={privacySettings.lastSeenVisibility === option}
                        onChange={() =>
                          setPrivacySettings({
                            ...privacySettings,
                            lastSeenVisibility: option,
                          })
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-foreground capitalize">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Profile Photo Visibility */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium text-foreground mb-2">Profile photo visibility</p>
                <div className="space-y-2">
                  {(["everyone", "contacts", "nobody"] as const).map((option) => (
                    <label key={option} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="profilePhoto"
                        checked={privacySettings.profilePhotoVisibility === option}
                        onChange={() =>
                          setPrivacySettings({
                            ...privacySettings,
                            profilePhotoVisibility: option,
                          })
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-foreground capitalize">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Blocked Contacts */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Blocked contacts
                </p>
                {privacySettings.blockedContacts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No blocked contacts</p>
                ) : (
                  <div className="space-y-2">
                    {privacySettings.blockedContacts.map((contactId) => (
                      <div key={contactId} className="flex items-center justify-between text-xs">
                        <span className="text-foreground">{contactId}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() =>
                            setPrivacySettings({
                              ...privacySettings,
                              blockedContacts: privacySettings.blockedContacts.filter((id) => id !== contactId),
                            })
                          }
                        >
                          Unblock
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* About Section */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">About</h3>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Version</p>
              <p className="text-sm font-medium text-foreground">1.0.0</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 p-4 border-t border-border bg-card flex-shrink-0 space-y-2">
          <Button onClick={handleSavePrivacySettings} className="w-full h-9" disabled={loading}>
            {loading ? "Saving..." : "Save Privacy Settings"}
          </Button>
          <Button onClick={onClose} variant="outline" className="w-full h-9 bg-transparent">
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
