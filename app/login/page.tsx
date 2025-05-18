"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AnimatedBackground } from "@/components/animated-background"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const { login, isLoading } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const success = await login(username, password)
    if (success) {
      router.push("/")
    } else {
      setError("Invalid username or password")
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        <AnimatedBackground />

        <div className="relative z-10 w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white p-8 rounded-xl shadow-lg"
          >
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-blue-600">innoDSik</h1>
              <p className="text-gray-600 mt-2">Steel Pipe Defect Analysis</p>
            </div>

            {error && <div className="bg-red-50 text-red-500 p-3 rounded-md mb-4 text-sm">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Enter your username"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                />
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              <p>For demo purposes, any non-empty username and password will work</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
