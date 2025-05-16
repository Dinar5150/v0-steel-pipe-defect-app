"use client"

import { useState } from "react"
import { Upload } from "@/components/upload"
import { Results } from "@/components/results"
import { AnimatedBackground } from "@/components/animated-background"
import { motion } from "framer-motion"

export default function Home() {
  const [image, setImage] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [results, setResults] = useState<any | null>(null)

  const handleImageUpload = (imageUrl: string) => {
    setImage(imageUrl)
    setIsAnalyzing(true)

    // Simulate analysis process
    setTimeout(() => {
      setIsAnalyzing(false)
      setResults({
        classification: "Longitudinal Crack",
        confidence: 0.92,
        segments: [
          { id: 1, x: 120, y: 80, width: 100, height: 30, label: "Crack", confidence: 0.95 },
          { id: 2, x: 250, y: 150, width: 70, height: 25, label: "Porosity", confidence: 0.87 },
        ],
      })
    }, 2000)
  }

  const resetAnalysis = () => {
    setImage(null)
    setResults(null)
  }

  return (
    <main className="min-h-screen bg-gray-50 relative overflow-hidden">
      <AnimatedBackground />

      <div className="container mx-auto px-4 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">Steel Pipe Defects Analysis</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Upload X-Ray images to detect and classify defects in steel pipes
          </p>
        </motion.div>

        {!image ? (
          <Upload onImageUpload={handleImageUpload} />
        ) : (
          <Results image={image} isAnalyzing={isAnalyzing} results={results} onReset={resetAnalysis} />
        )}
      </div>
    </main>
  )
}
