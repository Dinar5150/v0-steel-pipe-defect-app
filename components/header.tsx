"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { LogOut, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"

export function Header() {
  const { user, logout } = useAuth()
  const { language, toggleLanguage, t } = useLanguage()

  return (
    <header className="w-full bg-white shadow-sm py-2 px-6 fixed top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center"
        >
          <Link href="/" className="text-2xl font-bold text-blue-600">
            innoDSik
          </Link>
        </motion.div>

        <div className="flex items-center space-x-4">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <Button variant="ghost" size="sm" onClick={toggleLanguage}>
              <Globe className="h-4 w-4 mr-1" />
              {language === "en" ? "RU" : "EN"}
            </Button>
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
