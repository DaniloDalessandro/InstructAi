"use client"

import { useAuthContext } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader } from "@/components/ui/loader"

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuthContext()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login")
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader progress={0} />
      </div>
    )
  }

  return <>{children}</>
}
