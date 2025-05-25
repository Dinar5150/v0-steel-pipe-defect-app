"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ChevronLeft, Trash2, Calendar, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/context/auth-context"
import { Header } from "@/components/header"
import { ProtectedRoute } from "@/components/protected-route"
import { useLanguage } from "@/context/language-context"
import { getAnalysisHistory, decodeMaskText } from "@/lib/api"

export default function HistoryPage() {
  const router = useRouter()
  const { token } = useAuth()
  const [history, setHistory] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)

  // Fetch history from backend
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true)
      try {
        const data = await getAnalysisHistory(token)
        // Decode mask_text for each item
        const decoded = data.map((item: any) => ({
          ...item,
          segments: item.mask_text ? decodeMaskText(item.mask_text) : [],
        }))
        setHistory(decoded)
      } catch (e) {
        setHistory([])
      }
      setLoading(false)
    }
    if (token) fetchHistory()
  }, [token])

  // Format date for display
  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString()
  }

  // Filter history based on search term
  const filteredHistory = history.filter((item) => {
    if (item.segments) {
      return item.segments.some((segment: any) =>
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
  const handleViewAnalysis = (item: any) => {
    sessionStorage.setItem("selectedAnalysis", JSON.stringify({
      image: item.original_url,
      results: item.segments,
    }))
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

          {loading ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm">
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : history.length === 0 ? (
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
                  <div className="relative h-48 w-full bg-gray-100 overflow-hidden rounded-t-xl">
                    <img
                      src={item.original_url || "/placeholder.svg"}
                      alt="Analysis result"
                      className="w-full h-full object-cover"
                      style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                    />
                  </div>

                  <div className="p-4">
                    <div className="flex items-center text-sm text-gray-500 mb-3">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(item.created_at)}
                    </div>

                    <div className="mb-4">
                      <div className="text-base font-semibold">
                        {t("history.defect.count", { count: item.segments?.length ?? 0 })}
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <Button variant="outline" size="sm" onClick={() => handleViewAnalysis(item)}>
                        {t("history.view.details")}
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
