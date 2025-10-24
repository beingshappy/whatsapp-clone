"use client"

import { useEffect } from "react"

export default function PerformanceMonitor() {
  useEffect(() => {
    // Monitor Core Web Vitals
    if ("web-vital" in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log("[v0] Performance:", {
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime,
          })
        }
      })

      observer.observe({ entryTypes: ["largest-contentful-paint", "first-input", "layout-shift"] })

      return () => observer.disconnect()
    }
  }, [])

  return null
}
