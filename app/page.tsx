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
import { HistoryIcon, ArrowRight, Bug } from "lucide-react"
import { useHistory } from "@/context/history-context"

export default function Home() {
  const router = useRouter()
  const { addToHistory, updateHistoryItem } = useHistory()
  const [image, setImage] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [results, setResults] = useState<any | null>(null)
  const [showDebug, setShowDebug] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

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

  const handleImageUpload = (imageUrl: string) => {
    setImage(imageUrl)
    setIsAnalyzing(true)

    // Simulate analysis process
    setTimeout(() => {
      setIsAnalyzing(false)
      const analysisResults = {
        classification: "Longitudinal Crack",
        segments: [
          { id: 1, x0: 120, y0: 80, x1: 220, y1: 110, label: "Crack" },
          { id: 2, x0: 250, y0: 150, x1: 320, y1: 175, label: "Porosity" },
        ],
      }

      setResults(analysisResults)

      // Add to history
      addToHistory(imageUrl, analysisResults)
    }, 2000)
  }

  const resetAnalysis = () => {
    setImage(null)
    setResults(null)
    setIsEditMode(false)
  }

  const navigateToHistory = () => {
    router.push("/history")
  }

  const toggleDebug = () => {
    setShowDebug(!showDebug)
  }

  const toggleEditMode = () => {
    const newEditMode = !isEditMode
    setIsEditMode(newEditMode)
    
    // When exiting edit mode, update the history with current results
    if (!newEditMode && image && results) {
      updateHistoryItem(image, results)
    }
  }

  const handleSegmentsChange = (updatedSegments: any[]) => {
    if (results) {
      setResults({
        ...results,
        segments: updatedSegments,
      })
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />

        <main className="flex-1 relative overflow-hidden">
          <AnimatedBackground />

          <div className="container mx-auto px-4 py-12 relative z-10">
            <div className="flex flex-col items-center justify-between mb-8">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center mb-6"
              >
                <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">Steel Pipe Defects Analysis</h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Upload X-Ray images to detect and classify defects in steel pipes
                </p>
              </motion.div>

              <div className="flex space-x-2">
                <Button variant="outline" onClick={navigateToHistory} className="flex items-center">
                  <HistoryIcon className="mr-2 h-4 w-4" />
                  View History
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  onClick={toggleDebug}
                  className={`flex items-center ${showDebug ? "bg-amber-100" : ""}`}
                >
                  <Bug className="mr-2 h-4 w-4" />
                  {showDebug ? "Hide Debug" : "Show Debug"}
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
                />

                {showDebug && results && !isAnalyzing && (
                  <DebugPanel segments={results.segments} onSegmentsChange={handleSegmentsChange} />
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
