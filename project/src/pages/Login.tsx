"use client"

import type React from "react"
import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { LogIn, AlertCircle, CheckCircle2, LineChart } from "lucide-react"

const Login = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || "/surveys"
  const API_URL = "http://survey-pro-api.runasp.net/api"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Using the correct property names (Email and Password with uppercase first letters)
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Email: email,
          Password: password,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Invalid email or password")
      }

      const data = await response.json()

      // Store the authentication data in localStorage
      localStorage.setItem("auth_token", data.token)
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: data.id,
          username: data.username,
          email: data.email,
          roles: data.roles,
        }),
      )

      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid email or password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
      <div className="w-full max-w-md space-y-8 bg-white/10 backdrop-blur-lg p-6 sm:p-10 rounded-2xl shadow-2xl border border-white/20">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="relative group">
              <CheckCircle2 className="h-16 w-16 text-white transform group-hover:rotate-180 transition-transform duration-500" />
              <LineChart className="h-12 w-12 text-white absolute -bottom-2 -right-2 transform group-hover:scale-110 transition-transform duration-500" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl sm:text-4xl font-extrabold text-white">Admin Login</h2>
          <p className="mt-2 text-sm text-indigo-100">Sign in to access the admin dashboard</p>
        </div>

        {error && (
          <div className="bg-red-400/10 border-l-4 border-red-400 p-4 rounded-lg backdrop-blur-sm">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
              <p className="text-sm text-red-100">{error}</p>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-2 bg-white/10 border border-white/20 placeholder-indigo-200 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                placeholder="Enter your admin email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-2 bg-white/10 border border-white/20 placeholder-indigo-200 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all duration-300 hover:scale-105 ${
                isLoading ? "opacity-75 cursor-not-allowed" : ""
              }`}
            >
              {isLoading ? (
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <div className="animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
                </span>
              ) : (
                <LogIn className="h-5 w-5 mr-2" />
              )}
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-indigo-100">
              Use an email containing "admin" to access admin features
              <br />
              (e.g., admin@example.com)
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Login

