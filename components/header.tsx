"use client"

import { motion } from "framer-motion"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"

export function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="w-full bg-white shadow-sm py-4 px-6">
      <div className="container mx-auto flex justify-between items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center"
        >
          <h1 className="text-2xl font-bold text-blue-600">innoDSik</h1>
        </motion.div>

        <div className="flex items-center space-x-4">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <span className="text-gray-500 text-sm">Steel Pipe Defect Analysis</span>
          </motion.div>

          {user && (
            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-2">{user.username}</span>
              <Button variant="ghost" size="sm" onClick={logout} className="text-gray-500">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
