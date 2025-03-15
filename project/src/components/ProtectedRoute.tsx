"use client"

import type React from "react"
import { useEffect } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
  const { user, isAdmin, isLoading, checkAuthState } = useAuth()
  const location = useLocation()

  // Only check auth state when the route changes, not when checkAuthState changes
  useEffect(() => {
    checkAuthState()
  }, [location.pathname]) // Remove checkAuthState from dependencies

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/surveys" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export default ProtectedRoute

