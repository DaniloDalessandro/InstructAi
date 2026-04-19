"use client"

import { useEffect, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Loader } from "./loader"

export function NavigationProgressBar() {
  const [isLoading, setIsLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    setIsLoading(true)
    setProgress(0)

    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressTimer)
          return 95
        }
        return prev + 5
      })
    }, 50)

    const completeTimer = setTimeout(() => {
      setProgress(100)
      setTimeout(() => {
        setIsLoading(false)
      }, 300)
    }, 1000)

    return () => {
      clearInterval(progressTimer)
      clearTimeout(completeTimer)
    }
  }, [pathname, searchParams])

  if (!isLoading) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Loader progress={progress} />
    </div>
  )
}
