"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ChevronLeft, Trash2, Calendar, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useHistory, type AnalysisHistoryItem } from "@/context/history-context"
import { Header } from "@/components/header"
import { ProtectedRoute } from "@/components/protected-route"
import { useLanguage } from "@/context/language-context"

export default function HistoryPage() {
  const router = useRouter()
  const { history, clearHistory, deleteHistoryItem } = useHistory()
  const [searchTerm, setSearchTerm] = useState("")
  const { t } = useLanguage()

  // Format date for display
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  // Filter history based on search term
  const filteredHistory = history.filter((item) => {
    // If there are segments, search in their labels
    if (item.results?.segments) {
      return item.results.segments.some((segment: any) =>
        segment.label.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }
    return false
  })

  // Handle navigation back to main page
  const handleBack = () => {
    router.push("/")
  }

  // Handle viewing a specific analysis
  const handleViewAnalysis = (item: AnalysisHistoryItem) => {
    // Store the selected item in sessionStorage to access it on the main page
    sessionStorage.setItem("selectedAnalysis", JSON.stringify(item))
    router.push("/")
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />

        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="flex flex-col mb-6">
            <div className="mt-10">
              <Button variant="ghost" size="sm" onClick={handleBack} className="flex items-center">
                <ChevronLeft className="h-4 w-4 mr-1" /> {t("back")}
              </Button>
            </div>

            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">{t("history.title")}</h1>

              {history.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearHistory} className="text-red-500">
                  <Trash2 className="h-4 w-4 mr-1" /> {t("history.clear")}
                </Button>
              )}
            </div>
          </div>

          {/* Search bar */}
          {history.length > 0 && (
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder={t("history.search.placeholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
          )}

          {history.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm">
              <p className="text-gray-500">{t("history.no")}</p>
              <Button variant="outline" onClick={handleBack} className="mt-4">
                {t("history.go.to.analysis")}
              </Button>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm">
              <p className="text-gray-500">{t("history.no.search")}</p>
              <Button variant="outline" onClick={() => setSearchTerm("")} className="mt-4">
                {t("history.clear.search")}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredHistory.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-sm overflow-hidden"
                >
                  <div className="relative h-48 bg-gray-100">
                    {/* Display only the raw image without any defect markers */}
                    <img
                      src={item.image || "/placeholder.svg"}
                      alt="Analysis result"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="p-4">
                    <div className="flex items-center text-sm text-gray-500 mb-3">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(item.timestamp)}
                      {item.isEdited && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                          {t("history.edited")}
                        </span>
                      )}
                    </div>

                    <div className="mb-4">
                      <h3 className="text-sm font-medium mb-2">{t("detected.defects")}</h3>
                      <div className="flex flex-wrap gap-2">
                        {item.results?.segments?.map((segment: any) => (
                          <span key={segment.id} className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                            {segment.label}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <Button variant="outline" size="sm" onClick={() => handleViewAnalysis(item)}>
                        {t("history.view.details")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteHistoryItem(item.id)}
                        className="text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
