"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { generateEncryptionKey } from "./encryption"

interface SecurityContextType {
  encryptionKey: string | null
  setEncryptionKey: (key: string) => void
  isEncryptionEnabled: boolean
  setIsEncryptionEnabled: (enabled: boolean) => void
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined)

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null)
  const [isEncryptionEnabled, setIsEncryptionEnabled] = useState(false)

  useEffect(() => {
    // Load encryption settings from localStorage
    const savedKey = localStorage.getItem("encryption_key")
    const savedEnabled = localStorage.getItem("encryption_enabled") === "true"

    if (savedKey) {
      setEncryptionKey(savedKey)
      setIsEncryptionEnabled(savedEnabled)
    } else if (savedEnabled) {
      generateEncryptionKey().then((newKey) => {
        localStorage.setItem("encryption_key", newKey)
        setEncryptionKey(newKey)
      })
    }
  }, [])

  const handleSetEncryptionKey = (key: string) => {
    setEncryptionKey(key)
    localStorage.setItem("encryption_key", key)
  }

  const handleSetEncryptionEnabled = (enabled: boolean) => {
    setIsEncryptionEnabled(enabled)
    localStorage.setItem("encryption_enabled", enabled.toString())

    if (enabled && !encryptionKey) {
      generateEncryptionKey().then((newKey) => {
        handleSetEncryptionKey(newKey)
      })
    }
  }

  return (
    <SecurityContext.Provider
      value={{
        encryptionKey,
        setEncryptionKey: handleSetEncryptionKey,
        isEncryptionEnabled,
        setIsEncryptionEnabled: handleSetEncryptionEnabled,
      }}
    >
      {children}
    </SecurityContext.Provider>
  )
}

export const useSecurity = () => {
  const context = useContext(SecurityContext)
  if (!context) {
    throw new Error("useSecurity must be used within SecurityProvider")
  }
  return context
}
