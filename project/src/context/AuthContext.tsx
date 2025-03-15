"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"

interface User {
  id: string
  username?: string
  email: string
  roles: string[]
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (token: string, userData: User) => void
  logout: () => void
  isAdmin: boolean
  checkAuthState: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  // Check if user is admin
  const checkIsAdmin = (userData: User): boolean => {
    if (!userData || !userData.roles) return false

    return (
      userData.roles.some((role) => typeof role === "string" && role.toLowerCase() === "admin") ||
      (userData.email ? userData.email.toLowerCase().includes("admin") : false)
    )
  }

  // Use useCallback to memoize the function so it doesn't change on every render
  const checkAuthState = useCallback(() => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("auth_token")
      const userStr = localStorage.getItem("user")

      if (!token || !userStr) {
        setUser(null)
        setIsAdmin(false)
        setIsLoading(false)
        return
      }

      const userData = JSON.parse(userStr) as User
      setUser(userData)
      setIsAdmin(checkIsAdmin(userData))
    } catch (error) {
      console.error("Error checking auth state:", error)
      setUser(null)
      setIsAdmin(false)
    } finally {
      setIsLoading(false)
    }
  }, []) // Empty dependency array means this function won't change

  useEffect(() => {
    checkAuthState()
  }, [checkAuthState])

  const login = useCallback((token: string, userData: User) => {
    localStorage.setItem("auth_token", token)
    localStorage.setItem("user", JSON.stringify(userData))
    setUser(userData)
    setIsAdmin(checkIsAdmin(userData))
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token")
    localStorage.removeItem("user")
    setUser(null)
    setIsAdmin(false)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAdmin,
        checkAuthState,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

