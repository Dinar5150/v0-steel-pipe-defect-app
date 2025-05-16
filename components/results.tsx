"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { RefreshCw, ZoomIn, ZoomOut, RotateCw, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

interface ResultsProps {
  image: string
  isAnalyzing: boolean
  results: any | null
  onReset: () => void
}

export function Results({ image, isAnalyzing, results, onReset }: ResultsProps) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5))
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360)

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Image display area */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm p-4 relative">
          <div className="flex justify-between mb-4">
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleRotate}>
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" /> Save
            </Button>
          </div>

          <div className="relative overflow-hidden rounded-lg bg-gray-100 h-[400px] flex items-center justify-center">
            {isAnalyzing ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <div className="relative">
                <motion.img
                  src={image}
                  alt="X-Ray image"
                  className="max-h-[380px] object-contain"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: "transform 0.3s ease",
                  }}
                />

                {results && results.segments && (
                  <div className="absolute inset-0 pointer-events-none">
                    {results.segments.map((segment: any) => (
                      <motion.div
                        key={segment.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 * segment.id }}
                        className="absolute border-2 border-red-500 bg-red-500/20 rounded-sm"
                        style={{
                          left: `${segment.x}px`,
                          top: `${segment.y}px`,
                          width: `${segment.width}px`,
                          height: `${segment.height}px`,
                          transform: `scale(${zoom}) rotate(${rotation}deg)`,
                          transformOrigin: "center",
                        }}
                      >
                        <span className="absolute -top-6 left-0 text-xs font-medium bg-red-500 text-white px-1 rounded">
                          {segment.label} ({(segment.confidence * 100).toFixed(0)}%)
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Analysis results area */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Analysis Results</h3>

          {isAnalyzing ? (
            <div className="space-y-4">
              <div className="flex items-center">
                <RefreshCw className="animate-spin mr-2 h-4 w-4 text-blue-500" />
                <span>Analyzing image...</span>
              </div>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : results ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-1">Classification</p>
                <div className="flex items-center">
                  <Badge className="bg-blue-500 mr-2">{results.classification}</Badge>
                  <span className="text-sm text-gray-500">{(results.confidence * 100).toFixed(0)}% confidence</span>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Detected Defects</p>
                <ul className="space-y-3">
                  {results.segments.map((segment: any) => (
                    <motion.li
                      key={segment.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 * segment.id }}
                      className="flex justify-between p-2 bg-gray-50 rounded"
                    >
                      <span>{segment.label}</span>
                      <span className="text-sm text-gray-500">{(segment.confidence * 100).toFixed(0)}%</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ) : (
            <p className="text-gray-500">No results available</p>
          )}

          <div className="mt-8">
            <Button onClick={onReset} variant="outline" className="w-full">
              Analyze Another Image
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
