// Performance monitoring utilities
export const measurePerformance = (label: string) => {
  const startTime = performance.now()
  return () => {
    const endTime = performance.now()
    console.log(`[v0] ${label} took ${(endTime - startTime).toFixed(2)}ms`)
  }
}

// Debounce function for search and typing
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Throttle function for scroll events
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Lazy load images
export const lazyLoadImage = (imageElement: HTMLImageElement) => {
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement
          img.src = img.dataset.src || ""
          observer.unobserve(img)
        }
      })
    })
    observer.observe(imageElement)
  }
}

// Memory leak prevention
export const createCleanup = () => {
  const listeners: Array<{ target: any; event: string; handler: any }> = []

  return {
    addEventListener: (target: any, event: string, handler: any) => {
      target.addEventListener(event, handler)
      listeners.push({ target, event, handler })
    },
    cleanup: () => {
      listeners.forEach(({ target, event, handler }) => {
        target.removeEventListener(event, handler)
      })
      listeners.length = 0
    },
  }
}

// Request idle callback polyfill
export const scheduleIdleTask = (callback: () => void) => {
  if ("requestIdleCallback" in window) {
    requestIdleCallback(callback)
  } else {
    setTimeout(callback, 1)
  }
}
