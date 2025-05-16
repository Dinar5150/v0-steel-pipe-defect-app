"use client"

import { motion } from "framer-motion"

export function Header() {
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

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <span className="text-gray-500 text-sm">Steel Pipe Defect Analysis</span>
        </motion.div>
      </div>
    </header>
  )
}
