"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Upload } from "@/components/upload"
import { Results } from "@/components/results"
import { AnimatedBackground } from "@/components/animated-background"
import { Header } from "@/components/header"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { History, ArrowRight } from "lucide-react"
import { useHistory } from "@/context/history-context"

export default function Home() {
  const router = useRouter()
  const { addToHistory } = useHistory()
  const [image, setImage] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [results, setResults] = useState<any | null>(null)

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
        confidence: 0.92,
        segments: [
          { id: 1, x: 120, y: 80, width: 100, height: 30, label: "Crack", confidence: 0.95 },
          { id: 2, x: 250, y: 150, width: 70, height: 25, label: "Porosity", confidence: 0.87 },
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
  }

  const navigateToHistory = () => {
    router.push("/history")
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 relative overflow-hidden">
        <AnimatedBackground />

        <div className="container mx-auto px-4 py-12 relative z-10">
          <div className="flex justify-between items-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-left"
            >
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">Steel Pipe Defects Analysis</h1>
              <p className="text-xl text-gray-600 max-w-2xl">
                Upload X-Ray images to detect and classify defects in steel pipes
              </p>
            </motion.div>

            <Button variant="outline" onClick={navigateToHistory} className="flex items-center">
              <History className="mr-2 h-4 w-4" />
              View History
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {!image ? (
            <Upload onImageUpload={handleImageUpload} />
          ) : (
            <Results image={image} isAnalyzing={isAnalyzing} results={results} onReset={resetAnalysis} />
          )}
        </div>
      </main>
    </div>
  )
}
