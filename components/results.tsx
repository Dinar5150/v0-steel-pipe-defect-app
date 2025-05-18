"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { RefreshCw, ZoomIn, ZoomOut, Download, Edit, Check, Trash2, Plus, Undo, Redo, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/context/language-context"

// Updated Segment interface to use x0, y0, x1, y1 coordinates
interface Segment {
  id: number
  x0: number
  y0: number
  x1: number
  y1: number
  label: string
}

interface ResultsProps {
  image: string
  isAnalyzing: boolean
  results: any | null
  onReset: () => void
  isEditMode?: boolean
  onToggleEditMode?: () => void
  onSegmentsChange?: (segments: Segment[]) => void
}

export function Results({
  image,
  isAnalyzing,
  results,
  onReset,
  isEditMode = false,
  onToggleEditMode,
  onSegmentsChange,
}: ResultsProps) {
  const [zoom, setZoom] = useState(1)
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null)
  const [isDraggingSegment, setIsDraggingSegment] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })
  const [imageDisplayDimensions, setImageDisplayDimensions] = useState({ width: 0, height: 0 })
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  const [resizeStartData, setResizeStartData] = useState<{
    x0: number
    y0: number
    x1: number
    y1: number
    mouseX: number
    mouseY: number
  } | null>(null)
  const [editingLabel, setEditingLabel] = useState<number | null>(null)
  const [editingLabelText, setEditingLabelText] = useState("")

  // For undo/redo functionality
  const [history, setHistory] = useState<Segment[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // For image panning
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const imageWrapperRef = useRef<HTMLDivElement>(null)
  const segmentsContainerRef = useRef<HTMLDivElement>(null)

  const { t, toggleLanguage, language } = useLanguage()

  // Convert legacy segments (if any) to the new format
  useEffect(() => {
    if (results?.segments && history.length === 0) {
      // Check if we need to convert from the old format
      const convertedSegments = results.segments.map((segment: any) => {
        // If segment already has x0, y0, x1, y1 format, return as is
        if ("x0" in segment && "y0" in segment && "x1" in segment && "y1" in segment) {
          return segment
        }

        // Convert from x, y, width, height to x0, y0, x1, y1
        return {
          id: segment.id,
          x0: segment.x,
          y0: segment.y,
          x1: segment.x + segment.width,
          y1: segment.y + segment.height,
          label: segment.label,
        }
      })

      // Update the results with converted segments
      if (onSegmentsChange) {
        onSegmentsChange(convertedSegments)
      }

      setHistory([convertedSegments])
      setHistoryIndex(0)
    }
  }, [results, history, onSegmentsChange])

  // Update image dimensions when the image loads
  useEffect(() => {
    if (imageRef.current && imageRef.current.complete) {
      setImageDimensions({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight,
      })
    }
  }, [image])

  // Add image load event listener
  useEffect(() => {
    const handleImageLoad = () => {
      if (imageRef.current) {
        setImageDimensions({
          width: imageRef.current.naturalWidth,
          height: imageRef.current.naturalHeight,
        })
      }
    }

    const imgElement = imageRef.current
    if (imgElement) {
      imgElement.addEventListener("load", handleImageLoad)

      // If the image is already loaded, update dimensions
      if (imgElement.complete) {
        handleImageLoad()
      }
    }

    return () => {
      if (imgElement) {
        imgElement.removeEventListener("load", handleImageLoad)
      }
    }
  }, [imageRef.current])

  // Update image display dimensions and position on resize or zoom change
  useEffect(() => {
    const updateImageDisplayInfo = () => {
      if (!imageRef.current || !imageContainerRef.current) return

      const imgRect = imageRef.current.getBoundingClientRect()
      const containerRect = imageContainerRef.current.getBoundingClientRect()

      setImageDisplayDimensions({
        width: imgRect.width,
        height: imgRect.height,
      })

      // Calculate image position relative to container
      setImagePosition({
        x: imgRect.left - containerRect.left,
        y: imgRect.top - containerRect.top,
      })
    }

    // Initial update
    updateImageDisplayInfo()

    // Set up resize observer to detect changes in image size
    const resizeObserver = new ResizeObserver(updateImageDisplayInfo)

    if (imageRef.current) {
      resizeObserver.observe(imageRef.current)
    }

    if (imageContainerRef.current) {
      resizeObserver.observe(imageContainerRef.current)
    }

    // Update when zoom or position changes
    window.addEventListener("resize", updateImageDisplayInfo)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener("resize", updateImageDisplayInfo)
    }
  }, [zoom, position])

  // Add a new state to history
  const addToHistory = (newSegments: Segment[]) => {
    // If we're not at the end of the history, truncate it
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push([...newSegments])
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  // Undo function
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      if (onSegmentsChange) {
        onSegmentsChange([...history[newIndex]])
      }
    }
  }

  // Redo function
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      if (onSegmentsChange) {
        onSegmentsChange([...history[newIndex]])
      }
    }
  }

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
    if (isEditMode && selectedSegment !== null) return

    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }

  // Convert between screen coordinates and image coordinates
  const screenToImageCoords = (screenX: number, screenY: number) => {
    if (!imageRef.current || !imageContainerRef.current) {
      return { x: 0, y: 0 }
    }

    const containerRect = imageContainerRef.current.getBoundingClientRect()
    const imgRect = imageRef.current.getBoundingClientRect()

    // Calculate position relative to the container
    const relativeX = screenX - containerRect.left - position.x
    const relativeY = screenY - containerRect.top - position.y

    // Account for zoom
    const zoomedX = relativeX / zoom
    const zoomedY = relativeY / zoom

    // Calculate position relative to the image element
    const imgCenterX = imgRect.width / (2 * zoom)
    const imgCenterY = imgRect.height / (2 * zoom)

    // Calculate the offset from the center of the image
    const offsetX = zoomedX - imgCenterX
    const offsetY = zoomedY - imgCenterY

    // Convert to image natural coordinates
    const scaleX = (imageDimensions.width / imgRect.width) * zoom
    const scaleY = (imageDimensions.height / imgRect.height) * zoom

    return {
      x: imageDimensions.width / 2 + offsetX * scaleX,
      y: imageDimensions.height / 2 + offsetY * scaleY,
    }
  }

  // Ensure segment stays within image boundaries
  const constrainSegmentToImage = (segment: Segment): Segment => {
    if (imageDimensions.width === 0 || imageDimensions.height === 0) {
      return segment
    }

    let { x0, y0, x1, y1 } = segment

    // Ensure minimum size (20px in image coordinates)
    const minSize = 20

    // Constrain to image boundaries while maintaining minimum size
    x0 = Math.max(0, Math.min(x0, imageDimensions.width - minSize))
    y0 = Math.max(0, Math.min(y0, imageDimensions.height - minSize))
    x1 = Math.max(minSize, Math.min(x1, imageDimensions.width))
    y1 = Math.max(minSize, Math.min(y1, imageDimensions.height))

    // Ensure minimum size is maintained
    if (x1 - x0 < minSize) {
      if (x1 >= imageDimensions.width) {
        x0 = x1 - minSize
      } else {
        x1 = x0 + minSize
      }
    }
    if (y1 - y0 < minSize) {
      if (y1 >= imageDimensions.height) {
        y0 = y1 - minSize
      } else {
        y1 = y0 + minSize
      }
    }

    return { ...segment, x0, y0, x1, y1 }
  }

  // Handle mouse move event for dragging
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isEditMode) {
      // Handle segment dragging or resizing
      if (isDraggingSegment && selectedSegment !== null && results?.segments) {
        const imageCoords = screenToImageCoords(e.clientX, e.clientY)
        const mouseX = imageCoords.x
        const mouseY = imageCoords.y

        const updatedSegments = results.segments.map((segment: Segment) => {
          if (segment.id === selectedSegment) {
            let updatedSegment = { ...segment }

            if (resizeHandle && resizeStartData) {
              // Improved resizing logic with better handle behavior
              const {
                x0: startX0,
                y0: startY0,
                x1: startX1,
                y1: startY1,
                mouseX: startMouseX,
                mouseY: startMouseY,
              } = resizeStartData

              // Calculate mouse movement deltas
              const deltaX = mouseX - startMouseX
              const deltaY = mouseY - startMouseY

              let newX0 = startX0
              let newY0 = startY0
              let newX1 = startX1
              let newY1 = startY1

              // Apply changes based on which handle is being dragged
              if (resizeHandle.includes("e")) {
                newX1 = startX1 + deltaX
              }
              if (resizeHandle.includes("w")) {
                newX0 = startX0 + deltaX
              }
              if (resizeHandle.includes("s")) {
                newY1 = startY1 + deltaY
              }
              if (resizeHandle.includes("n")) {
                newY0 = startY0 + deltaY
              }

              // Create the updated segment
              updatedSegment = {
                ...segment,
                x0: newX0,
                y0: newY0,
                x1: newX1,
                y1: newY1,
              }
            } else {
              // Moving logic
              const width = segment.x1 - segment.x0
              const height = segment.y1 - segment.y0
              const newX0 = mouseX - dragOffset.x
              const newY0 = mouseY - dragOffset.y

              updatedSegment = {
                ...segment,
                x0: newX0,
                y0: newY0,
                x1: newX0 + width,
                y1: newY0 + height,
              }
            }

            // Constrain to image boundaries
            return constrainSegmentToImage(updatedSegment)
          }
          return segment
        })

        if (onSegmentsChange) {
          onSegmentsChange(updatedSegments)
          // Don't add to history during drag/resize - we'll add on mouse up
        }
        return
      }
    }

    // Regular image dragging
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
    // If we were dragging or resizing a segment, add the current state to history
    if (isDraggingSegment && results?.segments) {
      addToHistory([...results.segments])
    }

    setIsDragging(false)
    setIsDraggingSegment(false)
    setResizeHandle(null)
    setResizeStartData(null)
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

  // Handle mouse leave for disabling page scroll
  const handleMouseLeave = () => {
    setIsHovering(false)
    document.body.style.overflow = ""
  }

  // Handle container click to deselect segment when clicking outside
  const handleContainerClick = (e: React.MouseEvent) => {
    if (isEditMode) {
      // Check if the click target is the container or image wrapper
      const isClickOnContainer = e.target === e.currentTarget || 
        e.target === imageWrapperRef.current ||
        e.target === imageRef.current;
        
      if (isClickOnContainer) {
        setSelectedSegment(null);
      }
    }
  }

  // Handle segment selection
  const handleSegmentClick = (e: React.MouseEvent, segmentId: number) => {
    if (!isEditMode) return
    e.stopPropagation()
    setSelectedSegment(segmentId)
  }

  // Handle segment drag start
  const handleSegmentDragStart = (e: React.MouseEvent, segmentId: number) => {
    if (!isEditMode) return
    e.stopPropagation()

    setSelectedSegment(segmentId)
    setIsDraggingSegment(true)

    const segment = results.segments.find((s: Segment) => s.id === segmentId)
    if (!segment) return

    // Get mouse position in image coordinates
    const imageCoords = screenToImageCoords(e.clientX, e.clientY)

    setDragOffset({
      x: imageCoords.x - segment.x0,
      y: imageCoords.y - segment.y0,
    })
  }

  // Handle resize handle drag start
  const handleResizeStart = (e: React.MouseEvent, segmentId: number, handle: string) => {
    if (!isEditMode) return
    e.stopPropagation()

    setSelectedSegment(segmentId)
    setIsDraggingSegment(true)
    setResizeHandle(handle)

    const segment = results.segments.find((s: Segment) => s.id === segmentId)
    if (!segment) return

    // Get mouse position in image coordinates
    const imageCoords = screenToImageCoords(e.clientX, e.clientY)

    // Store the initial segment data and mouse position
    setResizeStartData({
      x0: segment.x0,
      y0: segment.y0,
      x1: segment.x1,
      y1: segment.y1,
      mouseX: imageCoords.x,
      mouseY: imageCoords.y,
    })
  }

  // Handle adding a new segment
  const handleAddSegment = () => {
    if (!results || !onSegmentsChange) return

    const newId = Math.max(0, ...results.segments.map((s: Segment) => s.id)) + 1
    const newSegment: Segment = {
      id: newId,
      x0: imageDimensions.width * 0.3,
      y0: imageDimensions.height * 0.3,
      x1: imageDimensions.width * 0.5,
      y1: imageDimensions.height * 0.4,
      label: t("new.defect")
    }

    const newSegments = [...results.segments, newSegment]
    onSegmentsChange(newSegments)
    addToHistory(newSegments)
    setSelectedSegment(newId)
  }

  // Handle deleting a segment
  const handleDeleteSegment = () => {
    if (!results || !onSegmentsChange || selectedSegment === null) return

    const updatedSegments = results.segments.filter((s: Segment) => s.id !== selectedSegment)
    onSegmentsChange(updatedSegments)
    addToHistory(updatedSegments)
    setSelectedSegment(null)
  }

  // Handle image download with defect markers
  const handleSaveImage = () => {
    if (!image || !results?.segments) return

    // Create a canvas element to draw the image and defect markers
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Create a new image object to load the source image
    const img = new Image()
    img.crossOrigin = "anonymous" // Avoid CORS issues

    img.onload = () => {
      // Constants for padding and label height
      const PADDING = 20
      const LABEL_HEIGHT = 25
      const LABEL_PADDING = 5
      const FONT_SIZE = 14

      // Calculate the extra space needed at the top, right, bottom, and left
      let topExtension = PADDING
      let rightExtension = PADDING
      const bottomExtension = PADDING
      let leftExtension = PADDING

      // Check each segment to see if its label extends beyond the image boundaries
      results.segments.forEach((segment: any) => {
        const x = segment.x0
        const y = segment.y0

        // Set font to measure text width
        ctx.font = `bold ${FONT_SIZE}px Arial`
        const labelText = segment.label
        const labelWidth = ctx.measureText(labelText).width + LABEL_PADDING * 2

        // Check if label extends beyond top
        const labelTop = y - LABEL_HEIGHT
        if (labelTop < topExtension) {
          topExtension = Math.max(PADDING, Math.abs(labelTop) + PADDING)
        }

        // Check if label extends beyond left
        if (x < leftExtension) {
          leftExtension = Math.max(PADDING, Math.abs(x) + PADDING)
        }

        // Check if label extends beyond right
        const labelRight = x + labelWidth
        if (labelRight > img.width + rightExtension) {
          rightExtension = Math.max(PADDING, labelRight - img.width + PADDING)
        }
      })

      // Set canvas dimensions with extensions
      canvas.width = img.width + leftExtension + rightExtension
      canvas.height = img.height + topExtension + bottomExtension

      // Fill the canvas with white background
      ctx.fillStyle = "white"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw the original image with offset to account for extensions
      ctx.drawImage(img, leftExtension, topExtension, img.width, img.height)

      // Draw border around the original image area
      ctx.strokeStyle = "#e2e8f0" // Light gray border
      ctx.lineWidth = 1
      ctx.strokeRect(leftExtension, topExtension, img.width, img.height)

      // Draw the defect markers
      ctx.strokeStyle = "red"
      ctx.fillStyle = "rgba(255, 0, 0, 0.2)"
      ctx.lineWidth = 2

      // Draw each defect marker
      results.segments.forEach((segment: any) => {
        const x = segment.x0 + leftExtension
        const y = segment.y0 + topExtension
        const width = segment.x1 - segment.x0
        const height = segment.y1 - segment.y0

        // Draw rectangle
        ctx.beginPath()
        ctx.rect(x, y, width, height)
        ctx.fill()
        ctx.stroke()

        // Prepare for drawing label
        const labelText = segment.label
        ctx.font = `bold ${FONT_SIZE}px Arial`
        const textMetrics = ctx.measureText(labelText)
        const labelWidth = textMetrics.width + LABEL_PADDING * 2

        // Calculate text baseline for better vertical alignment
        // The actual height of the text is approximately 70% of FONT_SIZE
        const textHeight = FONT_SIZE * 0.7
        const verticalOffset = (LABEL_HEIGHT - textHeight) / 2

        // Draw label background with proper dimensions
        ctx.fillStyle = "red"
        ctx.beginPath()
        ctx.rect(x, y - LABEL_HEIGHT, labelWidth, LABEL_HEIGHT)
        ctx.fill()

        // Draw label text with proper vertical alignment
        ctx.fillStyle = "white"
        ctx.fillText(labelText, x + LABEL_PADDING, y - LABEL_HEIGHT + LABEL_HEIGHT / 2 + textHeight / 2)

        // Reset fill style for next rectangle
        ctx.fillStyle = "rgba(255, 0, 0, 0.2)"
      })

      // Convert canvas to data URL
      const dataUrl = canvas.toDataURL("image/png")

      // Create download link
      const link = document.createElement("a")
      link.href = dataUrl
      link.download = "steel-pipe-analysis-with-defects.png"

      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }

    // Set the source of the image
    img.src = image
  }

  // Update history when segments change (except during drag/resize)
  useEffect(() => {
    if (results?.segments && !isDraggingSegment) {
      // Only add to history if the segments have actually changed
      if (history.length === 0 || JSON.stringify(history[historyIndex]) !== JSON.stringify(results.segments)) {
        addToHistory([...results.segments]);
      }
    }
  }, [results?.segments]);

  // Add event listeners for mouse up outside the component
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDraggingSegment && results?.segments) {
        addToHistory([...results.segments])
      }

      setIsDragging(false)
      setIsDraggingSegment(false)
      setResizeHandle(null)
      setResizeStartData(null)
    }

    window.addEventListener("mouseup", handleGlobalMouseUp)

    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp)
      // Ensure we restore scrolling when component unmounts
      if (isHovering) {
        document.body.style.overflow = ""
      }
    }
  }, [isHovering, isDraggingSegment, results])

  // Add effect to deselect when edit mode is disabled
  useEffect(() => {
    if (!isEditMode) {
      setSelectedSegment(null)
    }
  }, [isEditMode])

  // Handle label edit start
  const handleLabelDoubleClick = (e: React.MouseEvent, segmentId: number, currentLabel: string) => {
    if (!isEditMode) return
    e.stopPropagation()
    setEditingLabel(segmentId)
    setEditingLabelText(currentLabel)
  }

  // Handle label edit save
  const handleLabelSave = (segmentId: number) => {
    if (!results?.segments || editingLabel === null) return

    const updatedSegments = results.segments.map((segment: Segment) => {
      if (segment.id === segmentId) {
        return { ...segment, label: editingLabelText }
      }
      return segment
    })

    if (onSegmentsChange) {
      onSegmentsChange(updatedSegments)
    }
    setEditingLabel(null)
  }

  // Handle label edit cancel
  const handleLabelKeyDown = (e: React.KeyboardEvent, segmentId: number) => {
    if (e.key === 'Enter') {
      handleLabelSave(segmentId)
    } else if (e.key === 'Escape') {
      setEditingLabel(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Image display area */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm p-4 relative">
          <div className="flex justify-between mb-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>

              {onToggleEditMode && results && !isAnalyzing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggleEditMode}
                  className={isEditMode ? "bg-blue-100" : ""}
                >
                  {isEditMode ? <Check className="h-4 w-4 mr-1" /> : <Edit className="h-4 w-4 mr-1" />}
                  {isEditMode ? t("done") : t("edit")}
                </Button>
              )}

              {isEditMode && (
                <>
                  <Button variant="outline" size="sm" onClick={handleUndo} disabled={historyIndex <= 0}>
                    <Undo className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                  >
                    <Redo className="h-4 w-4" />
                  </Button>

                  <Button variant="outline" size="sm" onClick={handleAddSegment}>
                    <Plus className="h-4 w-4 mr-1" /> {t("add")}
                  </Button>

                  {selectedSegment !== null && (
                    <Button variant="outline" size="sm" onClick={handleDeleteSegment} className="text-red-500">
                      <Trash2 className="h-4 w-4 mr-1" /> {t("delete")}
                    </Button>
                  )}
                </>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleSaveImage}>
              <Download className="h-4 w-4 mr-2" /> {t("save")}
            </Button>
          </div>

          <div
            ref={imageContainerRef}
            className="relative w-full h-[380px] overflow-hidden rounded-lg bg-gray-100 select-none flex items-center justify-center"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onWheel={handleWheel}
            onClick={handleContainerClick}
          >
            {isAnalyzing ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <div
                className="relative flex items-center justify-center"
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
                  <div className="relative">
                    <img
                      ref={imageRef}
                      src={image || "/placeholder.svg"}
                      alt="X-Ray image"
                      className="max-h-[380px] object-contain"
                      draggable="false" // Prevent default image dragging
                    />

                    {results && results.segments && (
                      <div
                        ref={segmentsContainerRef}
                        className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none"
                        style={{
                          width: imageRef.current?.width || 0,
                          height: imageRef.current?.height || 0,
                        }}
                      >
                        {results.segments.map((segment: Segment) => {
                          const isSelected = selectedSegment === segment.id

                          // Calculate position as percentage of image dimensions
                          const percentX0 = (segment.x0 / imageDimensions.width) * 100
                          const percentY0 = (segment.y0 / imageDimensions.height) * 100
                          const percentX1 = (segment.x1 / imageDimensions.width) * 100
                          const percentY1 = (segment.y1 / imageDimensions.height) * 100

                          return (
                            <div
                              key={segment.id}
                              className={`absolute border-2 rounded-sm ${
                                isSelected ? "border-blue-500 bg-blue-500/20" : "border-red-500 bg-red-500/20"
                              }`}
                              style={{
                                left: `${percentX0}%`,
                                top: `${percentY0}%`,
                                width: `${percentX1 - percentX0}%`,
                                height: `${percentY1 - percentY0}%`,
                                pointerEvents: isEditMode ? "auto" : "none",
                                cursor: isEditMode ? "move" : "default",
                              }}
                              onClick={(e) => handleSegmentClick(e, segment.id)}
                              onMouseDown={(e) => handleSegmentDragStart(e, segment.id)}
                            >
                              {editingLabel === segment.id ? (
                                <input
                                  type="text"
                                  className="absolute -top-8 left-0 text-xs font-medium px-2 py-1 rounded bg-white border border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  value={editingLabelText}
                                  onChange={(e) => setEditingLabelText(e.target.value)}
                                  onKeyDown={(e) => handleLabelKeyDown(e, segment.id)}
                                  onBlur={() => handleLabelSave(segment.id)}
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span
                                  className={`absolute -top-6 left-0 text-xs font-medium px-1 rounded whitespace-nowrap ${
                                    isSelected ? "bg-blue-500" : "bg-red-500"
                                  } text-white`}
                                  onDoubleClick={(e) => handleLabelDoubleClick(e, segment.id, segment.label)}
                                >
                                  {segment.label}
                                </span>
                              )}

                              {/* Resize handles - only show for selected segment in edit mode */}
                              {isEditMode && isSelected && (
                                <>
                                  {/* Corner handles */}
                                  <div
                                    className="absolute -top-1 -left-1 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-nwse-resize"
                                    onMouseDown={(e) => handleResizeStart(e, segment.id, "nw")}
                                  />
                                  <div
                                    className="absolute -top-1 -right-1 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-nesw-resize"
                                    onMouseDown={(e) => handleResizeStart(e, segment.id, "ne")}
                                  />
                                  <div
                                    className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-nesw-resize"
                                    onMouseDown={(e) => handleResizeStart(e, segment.id, "sw")}
                                  />
                                  <div
                                    className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-nwse-resize"
                                    onMouseDown={(e) => handleResizeStart(e, segment.id, "se")}
                                  />

                                  {/* Edge handles */}
                                  <div
                                    className="absolute top-1/2 -left-1 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-ew-resize transform -translate-y-1/2"
                                    onMouseDown={(e) => handleResizeStart(e, segment.id, "w")}
                                  />
                                  <div
                                    className="absolute top-1/2 -right-1 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-ew-resize transform -translate-y-1/2"
                                    onMouseDown={(e) => handleResizeStart(e, segment.id, "e")}
                                  />
                                  <div
                                    className="absolute -top-1 left-1/2 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-ns-resize transform -translate-x-1/2"
                                    onMouseDown={(e) => handleResizeStart(e, segment.id, "n")}
                                  />
                                  <div
                                    className="absolute -bottom-1 left-1/2 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-ns-resize transform -translate-x-1/2"
                                    onMouseDown={(e) => handleResizeStart(e, segment.id, "s")}
                                  />
                                </>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Analysis results area */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">{t("analysis.results")}</h3>

          {isAnalyzing ? (
            <div className="space-y-4">
              <div className="flex items-center">
                <RefreshCw className="animate-spin mr-2 h-4 w-4 text-blue-500" />
                <span>{t("analyzing")}</span>
              </div>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : results ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
              <div>
                <p className="text-sm text-gray-500 mb-2">{t("detected.defects")}</p>
                <ul className="space-y-3">
                  {results.segments.map((segment: Segment) => (
                    <motion.li
                      key={segment.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 * segment.id }}
                      className={`flex justify-between p-2 rounded ${
                        selectedSegment === segment.id ? "bg-blue-50 border border-blue-200" : "bg-gray-50"
                      }`}
                      onClick={() => isEditMode && setSelectedSegment(segment.id)}
                      style={{ cursor: isEditMode ? "pointer" : "default" }}
                    >
                      <span>{segment.label}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <Button onClick={onReset} variant="outline" className="w-full text-sm whitespace-normal py-2">
                  {t("analyze.another")}
                </Button>
              </div>
            </motion.div>
          ) : (
            <p className="text-gray-500">{t("no.results")}</p>
          )}
        </div>
      </div>
    </div>
  )
}
