"use client"

import type React from "react"

import { useState } from "react"
import { signInWithPhoneNumber, RecaptchaVerifier, signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [confirmationResult, setConfirmationResult] = useState<any>(null)

  const handlePhoneAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (!confirmationResult) {
        // Send verification code
        const formattedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`

        // Initialize reCAPTCHA
        if (!window.recaptchaVerifier) {
          window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
            size: "invisible",
            callback: () => {},
          })
        }

        const result = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier)
        setConfirmationResult(result)
        setIsVerifying(true)
      } else {
        // Verify code and sign in
        const userCredential = await confirmationResult.confirm(verificationCode)
        const user = userCredential.user

        const userDocRef = doc(db, "users", user.uid)
        const userDocSnap = await getDoc(userDocRef)

        const userData = {
          uid: user.uid,
          phoneNumber: phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`,
          displayName: displayName || user.phoneNumber || "User",
          photoURL: "",
          status: "online",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        await setDoc(userDocRef, userData, { merge: true })
        console.log("[v0] User created/updated successfully:", user.uid)

        setIsVerifying(false)
        setConfirmationResult(null)
      }
    } catch (err: any) {
      console.error("[v0] Auth error:", err)
      const errorMessage =
        err.code === "auth/invalid-phone-number"
          ? "Invalid phone number. Please use format: +1234567890"
          : err.code === "auth/too-many-requests"
            ? "Too many attempts. Please try again later."
            : err.code === "auth/invalid-verification-code"
              ? "Invalid verification code."
              : err.message || "Authentication failed"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError("")
    setLoading(true)

    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({
        prompt: "select_account",
      })

      const result = await signInWithPopup(auth, provider)

      const userDocRef = doc(db, "users", result.user.uid)
      const userData = {
        uid: result.user.uid,
        phoneNumber: result.user.phoneNumber || "",
        displayName: result.user.displayName || "User",
        photoURL: result.user.photoURL || "",
        status: "online",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await setDoc(userDocRef, userData, { merge: true })
      console.log("[v0] Google Sign-In successful:", result.user.uid)
    } catch (err: any) {
      console.error("[v0] Google Sign-In error:", err)
      if (err.code === "auth/popup-blocked") {
        setError("Pop-up was blocked. Please allow pop-ups and try again.")
      } else if (err.code === "auth/popup-closed-by-user") {
        setError("Sign-in cancelled.")
      } else {
        setError(err.message || "Google Sign-In failed")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">WhatsApp</h1>
            <p className="text-muted-foreground">Connect with anyone, anywhere</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handlePhoneAuth} className="space-y-4">
            {!isVerifying ? (
              <>
                <Input
                  type="text"
                  placeholder="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
                <Input
                  type="tel"
                  placeholder="Phone Number (+1234567890)"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending..." : "Send Verification Code"}
                </Button>
              </>
            ) : (
              <>
                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                  required
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Verifying..." : "Verify & Sign In"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => {
                    setIsVerifying(false)
                    setConfirmationResult(null)
                    setVerificationCode("")
                  }}
                >
                  Back
                </Button>
              </>
            )}
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full mb-4 bg-transparent"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            Google Sign In
          </Button>

          <div id="recaptcha-container"></div>
        </div>
      </Card>
    </div>
  )
}
