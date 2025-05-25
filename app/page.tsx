"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Upload } from "@/components/upload"
import { Results } from "@/components/results"
import { AnimatedBackground } from "@/components/animated-background"
import { Header } from "@/components/header"
import { DebugPanel } from "@/components/debug-panel"
import { ProtectedRoute } from "@/components/protected-route"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { History, Bug } from "lucide-react"
import { useLanguage } from "@/context/language-context"
import { useHistory } from "@/context/history-context"
import { PredictionResult } from "@/lib/api"

export default function Home() {
  const router = useRouter()
  const { t } = useLanguage()
  const { addToHistory, updateHistoryItem } = useHistory()
  const [image, setImage] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [results, setResults] = useState<PredictionResult[] | null>(null)
  const [showDebug, setShowDebug] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [inferenceTime, setInferenceTime] = useState<number | undefined>()

  // Check for a selected analysis from history
  useEffect(() => {
    const selectedAnalysis = sessionStorage.getItem("selectedAnalysis")
    if (selectedAnalysis) {
      try {
        const parsedAnalysis = JSON.parse(selectedAnalysis)
        setImage(parsedAnalysis.image)
        setResults(parsedAnalysis.results)
        // Clear the session storage to prevent reloading on refresh
        sessionStorage.removeItem("selectedAnalysis")
      } catch (error) {
        console.error("Failed to parse selected analysis:", error)
      }
    }
  }, [])

  // Remove the debug button from the UI
  // Add a console command to toggle debug panel
  useEffect(() => {
    (window as any).toggleDebugPanel = () => setShowDebug((prev) => !prev);
    return () => {
      delete (window as any).toggleDebugPanel;
    };
  }, []);

  const handleImageUpload = (imageUrl: string, predictions: PredictionResult[], time: number) => {
    setImage(imageUrl)
    setResults(predictions)
    setInferenceTime(time)
    setIsAnalyzing(false)
    addToHistory(imageUrl, predictions)
  }

  const resetAnalysis = () => {
    setImage(null)
    setResults(null)
    setIsEditMode(false)
    setInferenceTime(undefined)
  }

  const navigateToHistory = () => {
    router.push("/history")
  }

  const toggleEditMode = () => {
    const newEditMode = !isEditMode
    setIsEditMode(newEditMode)
    
    // When exiting edit mode, update the history with current results
    if (!newEditMode && image && results) {
      updateHistoryItem(image, results)
    }
  }

  const handleSegmentsChange = (updatedSegments: PredictionResult[]) => {
    if (results) {
      setResults(updatedSegments)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />

        <main className="flex-1 relative overflow-hidden pt-14">
          <AnimatedBackground />

          <div className="container mx-auto px-4 py-12 relative z-10">
            <div className="flex flex-col items-center justify-between mb-8">
              {!image && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-center mb-6"
                >
                  <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">{t("upload.title")}</h1>
                  <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                    {t("upload.subtitle")}
                  </p>
                </motion.div>
              )}
              <div className="flex space-x-2">
                <Button variant="outline" onClick={navigateToHistory} className="flex items-center">
                  <History className="mr-2 h-4 w-4" />
                  {t("view.history")}
                </Button>
              </div>
            </div>

            {!image ? (
              <Upload onImageUpload={handleImageUpload} />
            ) : (
              <>
                <Results
                  image={image}
                  isAnalyzing={isAnalyzing}
                  results={results}
                  onReset={resetAnalysis}
                  isEditMode={isEditMode}
                  onToggleEditMode={toggleEditMode}
                  onSegmentsChange={handleSegmentsChange}
                  inferenceTime={inferenceTime}
                />

                {showDebug && results && !isAnalyzing && (
                  <DebugPanel segments={results} onSegmentsChange={handleSegmentsChange} />
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
