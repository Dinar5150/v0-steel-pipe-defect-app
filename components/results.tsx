"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { RefreshCw, ZoomIn, ZoomOut, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface ResultsProps {
  image: string
  isAnalyzing: boolean
  results: any | null
  onReset: () => void
}

export function Results({ image, isAnalyzing, results, onReset }: ResultsProps) {
  const [zoom, setZoom] = useState(1)

  // For image panning
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const imageWrapperRef = useRef<HTMLDivElement>(null)

  // Zoom from window center (for button zooming)
  const zoomFromWindowCenter = (zoomDelta: number) => {
    if (!imageContainerRef.current || !imageWrapperRef.current) return

    // Get container bounds
    const containerRect = imageContainerRef.current.getBoundingClientRect()
    const wrapperRect = imageWrapperRef.current.getBoundingClientRect()

    // Calculate the center of the container (window)
    const containerCenterX = containerRect.width / 2
    const containerCenterY = containerRect.height / 2

    // Calculate the center of the image wrapper
    const wrapperCenterX = wrapperRect.left + wrapperRect.width / 2 - containerRect.left
    const wrapperCenterY = wrapperRect.top + wrapperRect.height / 2 - containerRect.top

    // Calculate container center position relative to the center of the image wrapper
    const relativeX = containerCenterX - wrapperCenterX
    const relativeY = containerCenterY - wrapperCenterY

    // Calculate new zoom level with limits
    const newZoom = Math.min(Math.max(zoom + zoomDelta, 0.5), 3)
    const zoomFactor = newZoom / zoom

    // Calculate how the position should change to keep the window center over the same image point
    const newPosition = {
      x: position.x - relativeX * (zoomFactor - 1),
      y: position.y - relativeY * (zoomFactor - 1),
    }

    // Update state
    setZoom(newZoom)
    setPosition(newPosition)
  }

  const handleZoomIn = () => {
    zoomFromWindowCenter(0.25)
  }

  const handleZoomOut = () => {
    zoomFromWindowCenter(-0.25)
  }

  // Handle mouse down event to start dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }

  // Handle mouse move event for dragging
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return

    const newX = e.clientX - dragStart.x
    const newY = e.clientY - dragStart.y

    setPosition({
      x: newX,
      y: newY,
    })
  }

  // Handle mouse up event to stop dragging
  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Handle mouse wheel for zooming
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()

    if (!imageContainerRef.current || !imageWrapperRef.current) return

    // Get container bounds
    const containerRect = imageContainerRef.current.getBoundingClientRect()
    const wrapperRect = imageWrapperRef.current.getBoundingClientRect()

    // Calculate mouse position relative to the container
    const mouseX = e.clientX - containerRect.left
    const mouseY = e.clientY - containerRect.top

    // Calculate the center of the image wrapper
    const wrapperCenterX = wrapperRect.left + wrapperRect.width / 2 - containerRect.left
    const wrapperCenterY = wrapperRect.top + wrapperRect.height / 2 - containerRect.top

    // Calculate mouse position relative to the center of the image wrapper
    const relativeX = mouseX - wrapperCenterX
    const relativeY = mouseY - wrapperCenterY

    // Determine zoom direction based on wheel delta
    const zoomDelta = e.deltaY < 0 ? 0.1 : -0.1

    // Calculate new zoom level with limits
    const newZoom = Math.min(Math.max(zoom + zoomDelta, 0.5), 3)
    const zoomFactor = newZoom / zoom

    // Calculate how the position should change to keep the mouse over the same image point
    const newPosition = {
      x: position.x - relativeX * (zoomFactor - 1),
      y: position.y - relativeY * (zoomFactor - 1),
    }

    // Update state
    setZoom(newZoom)
    setPosition(newPosition)
  }

  // Handle mouse enter/leave for disabling page scroll
  const handleMouseEnter = () => {
    setIsHovering(true)
    document.body.style.overflow = "hidden"
  }

  const handleMouseLeave = () => {
    setIsHovering(false)
    document.body.style.overflow = ""
  }

  // Add event listeners for mouse up outside the component
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener("mouseup", handleGlobalMouseUp)

    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp)
      // Ensure we restore scrolling when component unmounts
      if (isHovering) {
        document.body.style.overflow = ""
      }
    }
  }, [isHovering])

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
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" /> Save
            </Button>
          </div>

          <div
            ref={imageContainerRef}
            className="relative overflow-hidden rounded-lg bg-gray-100 h-[400px] flex items-center justify-center"
            onMouseMove={handleMouseMove}
            onWheel={handleWheel}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: isDragging ? "grabbing" : "grab" }}
          >
            {isAnalyzing ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <div
                className="relative"
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                style={{
                  transform: `translate(${position.x}px, ${position.y}px)`,
                  transition: isDragging ? "none" : "transform 0.3s ease",
                }}
                ref={imageWrapperRef}
              >
                {/* Wrapper div with zoom applied */}
                <div
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: "center",
                    transition: isDragging ? "none" : "transform 0.3s ease",
                    position: "relative", // Important for positioning child elements
                  }}
                >
                  <img
                    ref={imageRef}
                    src={image || "/placeholder.svg"}
                    alt="X-Ray image"
                    className="max-h-[380px] object-contain"
                    draggable="false" // Prevent default image dragging
                  />

                  {results && results.segments && (
                    <div className="absolute inset-0 pointer-events-none">
                      {results.segments.map((segment: any) => (
                        <div
                          key={segment.id}
                          className="absolute border-2 border-red-500 bg-red-500/20 rounded-sm"
                          style={{
                            left: `${segment.x}px`,
                            top: `${segment.y}px`,
                            width: `${segment.width}px`,
                            height: `${segment.height}px`,
                          }}
                        >
                          <span className="absolute -top-6 left-0 text-xs font-medium bg-red-500 text-white px-1 rounded whitespace-nowrap">
                            {segment.label} ({(segment.confidence * 100).toFixed(0)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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

              <div className="mt-8">
                <Button onClick={onReset} variant="outline" className="w-full">
                  Analyze Another Image
                </Button>
              </div>
            </motion.div>
          ) : (
            <p className="text-gray-500">No results available</p>
          )}
        </div>
      </div>
    </div>
  )
}
