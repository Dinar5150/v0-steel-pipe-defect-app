"use client"

import React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ZoomIn, ZoomOut, Move, OctagonIcon as Polygon, Edit3, Trash2, Save, Upload, Minus } from "lucide-react"
import { PredictionResult } from "@/lib/api"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import * as XLSX from "xlsx"

interface ResultsProps {
  image: string
  isAnalyzing: boolean
  results: PredictionResult[] | null
  onReset: () => void
  isEditMode?: boolean
  onToggleEditMode?: () => void
  onSegmentsChange?: (segments: PredictionResult[]) => void
}

interface Point {
  x: number
  y: number
}

interface PolygonSelection {
  id: string
  points: Point[]
  label: string
  color: string
  isComplete: boolean
}

type Tool = "pan" | "polygon" | "edit"

const COLORS = ["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#feca57", "#ff9ff3", "#54a0ff", "#5f27cd"]

const SEGMENT_LABELS = [
  "пора",
  "включение",
  "подрез",
  "прожог",
  "трещина",
  "наплыв",
  "эталон1",
  "эталон2",
  "эталон3",
  "пора-скрытая",
  "утяжина",
  "несплавление",
  "непровар-корня",
]

export function Results({
  image,
  isAnalyzing,
  results,
  onReset,
  isEditMode = false,
  onToggleEditMode,
  onSegmentsChange,
}: ResultsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selections, setSelections] = useState<PolygonSelection[]>([])
  const [currentSelection, setCurrentSelection] = useState<PolygonSelection | null>(null)
  const [selectedSelectionId, setSelectedSelectionId] = useState<string | null>(null)
  const [tool, setTool] = useState<Tool>("pan")
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [editingNodeIndex, setEditingNodeIndex] = useState<number | null>(null)
  const [isDraggingNode, setIsDraggingNode] = useState(false)
  const [newLabel, setNewLabel] = useState("")
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [hoveredAddButton, setHoveredAddButton] = useState<number | null>(null)
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null)
  const [zoomInput, setZoomInput] = useState("100")
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null)
  const [editingLabelValue, setEditingLabelValue] = useState("")

  // Setup canvas with proper DPI handling
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    // Set display size
    canvas.style.width = rect.width + "px"
    canvas.style.height = rect.height + "px"

    // Set actual canvas size accounting for device pixel ratio
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    // Scale the context to match device pixel ratio
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.scale(dpr, dpr)
    }

    setCanvasSize({ width: rect.width, height: rect.height })
  }, [])

  // Convert screen coordinates to canvas coordinates
  const getCanvasCoordinates = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }, [])

  // Convert canvas coordinates to image coordinates
  const canvasToImage = useCallback(
    (canvasX: number, canvasY: number) => {
      const x = (canvasX - pan.x) / zoom
      const y = (canvasY - pan.y) / zoom
      return { x, y }
    },
    [zoom, pan],
  )

  // Convert image coordinates to canvas coordinates
  const imageToCanvas = useCallback(
    (imageX: number, imageY: number) => {
      return {
        x: imageX * zoom + pan.x,
        y: imageY * zoom + pan.y,
      }
    },
    [zoom, pan],
  )

  // Combined function: screen to image coordinates
  const screenToImage = useCallback(
    (clientX: number, clientY: number) => {
      const canvasCoords = getCanvasCoordinates(clientX, clientY)
      return canvasToImage(canvasCoords.x, canvasCoords.y)
    },
    [getCanvasCoordinates, canvasToImage],
  )

  // Calculate midpoint of an edge
  const getEdgeMidpoint = useCallback((point1: Point, point2: Point) => {
    return {
      x: (point1.x + point2.x) / 2,
      y: (point1.y + point2.y) / 2,
    }
  }, [])

  // Check if click is on an add button
  const getClickedAddButton = useCallback(
    (canvasCoords: Point, selection: PolygonSelection) => {
      if (!selection.isComplete) return null

      for (let i = 0; i < selection.points.length; i++) {
        const point1 = selection.points[i]
        const point2 = selection.points[(i + 1) % selection.points.length]
        const midpoint = getEdgeMidpoint(point1, point2)
        const screenMidpoint = imageToCanvas(midpoint.x, midpoint.y)

        const distance = Math.sqrt(
          Math.pow(canvasCoords.x - screenMidpoint.x, 2) + Math.pow(canvasCoords.y - screenMidpoint.y, 2),
        )

        // Check if click is within the add button radius
        if (distance <= 8) {
          return i
        }
      }
      return null
    },
    [getEdgeMidpoint, imageToCanvas],
  )

  // Add node at midpoint of edge
  const addNodeAtMidpoint = useCallback(
    (selectionId: string, edgeIndex: number) => {
      setSelections((prev) =>
        prev.map((selection) => {
          if (selection.id === selectionId) {
            const newPoints = [...selection.points]
            const point1 = newPoints[edgeIndex]
            const point2 = newPoints[(edgeIndex + 1) % newPoints.length]
            const midPoint = getEdgeMidpoint(point1, point2)
            newPoints.splice(edgeIndex + 1, 0, midPoint)
            return { ...selection, points: newPoints }
          }
          return selection
        }),
      )
    },
    [getEdgeMidpoint],
  )

  // Remove node from polygon
  const removeNodeFromPolygon = useCallback((selectionId: string, nodeIndex: number) => {
    setSelections((prev) =>
      prev.map((selection) => {
        if (selection.id === selectionId && selection.points.length > 3) {
          const newPoints = selection.points.filter((_, index) => index !== nodeIndex)
          return { ...selection, points: newPoints }
        }
        return selection
      }),
    )
  }, [])

  // Draw everything on canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)

    // Draw image if loaded
    if (imageElement) {
      ctx.save()
      ctx.translate(pan.x, pan.y)
      ctx.scale(zoom, zoom)
      ctx.drawImage(imageElement, 0, 0)
      ctx.restore()
    }

    // Draw completed selections
    selections.forEach((selection) => {
      if (selection.points.length > 0) {
        ctx.save()
        ctx.translate(pan.x, pan.y)
        ctx.scale(zoom, zoom)

        ctx.strokeStyle = selection.color
        ctx.fillStyle = selection.color + "20"
        ctx.lineWidth = 2 / zoom

        ctx.beginPath()
        ctx.moveTo(selection.points[0].x, selection.points[0].y)
        selection.points.forEach((point) => {
          ctx.lineTo(point.x, point.y)
        })
        if (selection.isComplete) {
          ctx.closePath()
          ctx.fill()
        }
        ctx.stroke()

        // Draw nodes if this selection is selected
        if (selectedSelectionId === selection.id) {
          selection.points.forEach((point, index) => {
            ctx.beginPath()
            ctx.arc(point.x, point.y, 4 / zoom, 0, 2 * Math.PI)

            // Highlight the node being dragged
            if (isDraggingNode && editingNodeIndex === index) {
              ctx.fillStyle = "#fff"
              ctx.fill()
              ctx.strokeStyle = selection.color
              ctx.lineWidth = 3 / zoom
            } else {
              ctx.fillStyle = selection.color
              ctx.fill()
              ctx.strokeStyle = "#fff"
              ctx.lineWidth = 1 / zoom
            }
            ctx.stroke()

            // Add node number for easier identification
            if (tool === "edit") {
              ctx.fillStyle = "#fff"
              ctx.font = `${8 / zoom}px Arial`
              ctx.textAlign = "center"
              ctx.fillText((index + 1).toString(), point.x, point.y + 2 / zoom)
            }
          })

          // Draw interactive add buttons at edge midpoints
          if (tool === "edit" && selection.isComplete && !isDraggingNode) {
            for (let i = 0; i < selection.points.length; i++) {
              const point1 = selection.points[i]
              const point2 = selection.points[(i + 1) % selection.points.length]
              const midpoint = getEdgeMidpoint(point1, point2)

              // Draw add button background
              ctx.beginPath()
              ctx.arc(midpoint.x, midpoint.y, 8 / zoom, 0, 2 * Math.PI)

              // Highlight if hovered
              if (hoveredAddButton === i) {
                ctx.fillStyle = "#00dd00"
                ctx.strokeStyle = "#fff"
                ctx.lineWidth = 3 / zoom
              } else {
                ctx.fillStyle = "#00aa00"
                ctx.strokeStyle = "#fff"
                ctx.lineWidth = 2 / zoom
              }

              ctx.fill()
              ctx.stroke()

              // Draw plus sign
              ctx.strokeStyle = "#fff"
              ctx.lineWidth = 2 / zoom
              const size = 4 / zoom

              ctx.beginPath()
              ctx.moveTo(midpoint.x - size, midpoint.y)
              ctx.lineTo(midpoint.x + size, midpoint.y)
              ctx.moveTo(midpoint.x, midpoint.y - size)
              ctx.lineTo(midpoint.x, midpoint.y + size)
              ctx.stroke()
            }
          }
        }

        // Draw label
        if (selection.label && selection.isComplete) {
          const centerX = selection.points.reduce((sum, p) => sum + p.x, 0) / selection.points.length
          const centerY = selection.points.reduce((sum, p) => sum + p.y, 0) / selection.points.length

          // Find the topmost point to position label above the polygon
          const minY = Math.min(...selection.points.map((p) => p.y))
          const labelY = minY - 20 / zoom // Position label above the polygon

          ctx.font = `${12 / zoom}px Arial`
          ctx.textAlign = "center"

          // Measure text to get proper dimensions
          const textMetrics = ctx.measureText(selection.label)
          const textWidth = textMetrics.width
          const textHeight = 12 / zoom
          const padding = 4 / zoom

          // Draw background with segment color
          ctx.fillStyle = selection.color
          ctx.fillRect(
            centerX - textWidth / 2 - padding,
            labelY - textHeight - padding,
            textWidth + padding * 2,
            textHeight + padding * 2,
          )

          // Draw text in white for better contrast
          ctx.fillStyle = "#fff"
          ctx.fillText(selection.label, centerX, labelY - padding)
        }

        ctx.restore()
      }
    })

    // Draw current selection being created
    if (currentSelection && currentSelection.points.length > 0) {
      ctx.save()
      ctx.translate(pan.x, pan.y)
      ctx.scale(zoom, zoom)

      ctx.strokeStyle = currentSelection.color
      ctx.lineWidth = 2 / zoom

      ctx.beginPath()
      ctx.moveTo(currentSelection.points[0].x, currentSelection.points[0].y)
      currentSelection.points.forEach((point) => {
        ctx.lineTo(point.x, point.y)
      })
      ctx.stroke()

      // Draw nodes
      currentSelection.points.forEach((point) => {
        ctx.beginPath()
        ctx.arc(point.x, point.y, 4 / zoom, 0, 2 * Math.PI)
        ctx.fillStyle = currentSelection.color
        ctx.fill()
        ctx.strokeStyle = "#fff"
        ctx.lineWidth = 1 / zoom
        ctx.stroke()
      })

      ctx.restore()
    }
  }, [
    imageElement,
    selections,
    currentSelection,
    selectedSelectionId,
    zoom,
    pan,
    canvasSize,
    isDraggingNode,
    editingNodeIndex,
    tool,
    hoveredAddButton,
    getEdgeMidpoint,
  ])

  // Check if a point is inside a polygon using ray casting algorithm
  const isPointInPolygon = useCallback((point: Point, polygon: Point[]) => {
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      if (
        polygon[i].y > point.y !== polygon[j].y > point.y &&
        point.x <
          ((polygon[j].x - polygon[i].x) * (point.y - polygon[i].y)) / (polygon[j].y - polygon[i].y) + polygon[i].x
      ) {
        inside = !inside
      }
    }
    return inside
  }, [])

  // Handle canvas click
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()

      // Don't handle clicks if we were dragging
      if (isDraggingNode || isPanning) return

      const imageCoords = screenToImage(e.clientX, e.clientY)
      const canvasCoords = getCanvasCoordinates(e.clientX, e.clientY)

      if (tool === "polygon") {
        if (!currentSelection) {
          // Start new polygon
          const newSelection: PolygonSelection = {
            id: Date.now().toString(),
            points: [imageCoords],
            label: "",
            color: COLORS[selections.length % COLORS.length],
            isComplete: false,
          }
          setCurrentSelection(newSelection)
        } else {
          // Add point to current polygon
          const updatedSelection = {
            ...currentSelection,
            points: [...currentSelection.points, imageCoords],
          }
          setCurrentSelection(updatedSelection)
        }
      } else if (tool === "edit") {
        // Check if clicking on an add button first (if a selection is already selected)
        if (selectedSelectionId) {
          const selectedSelection = selections.find((s) => s.id === selectedSelectionId)
          if (selectedSelection) {
            const addButtonIndex = getClickedAddButton(canvasCoords, selectedSelection)
            if (addButtonIndex !== null) {
              addNodeAtMidpoint(selectedSelectionId, addButtonIndex)
              return
            }
          }
        }

        // Check if clicking inside any polygon to select it
        let clickedSelection: PolygonSelection | null = null

        // Check selections in reverse order (top to bottom) to select the topmost one
        for (let i = selections.length - 1; i >= 0; i--) {
          const selection = selections[i]
          if (selection.isComplete && isPointInPolygon(imageCoords, selection.points)) {
            clickedSelection = selection
            break
          }
        }

        if (clickedSelection) {
          // Select the clicked polygon
          setSelectedSelectionId(clickedSelection.id)
        } else {
          // Click was not inside any polygon, deselect current selection
          setSelectedSelectionId(null)
        }
      }
    },
    [
      tool,
      currentSelection,
      selections,
      screenToImage,
      getCanvasCoordinates,
      isDraggingNode,
      isPanning,
      selectedSelectionId,
      getClickedAddButton,
      addNodeAtMidpoint,
      isPointInPolygon,
    ],
  )

  // Handle right click for node deletion
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()

      if (tool === "edit" && selectedSelectionId) {
        const canvasCoords = getCanvasCoordinates(e.clientX, e.clientY)
        const selectedSelection = selections.find((s) => s.id === selectedSelectionId)

        if (selectedSelection) {
          // Check if right-clicking on a node
          const nodeIndex = selectedSelection.points.findIndex((point) => {
            const screenPoint = imageToCanvas(point.x, point.y)
            const distance = Math.sqrt(
              Math.pow(canvasCoords.x - screenPoint.x, 2) + Math.pow(canvasCoords.y - screenPoint.y, 2),
            )
            return distance < 8
          })

          if (nodeIndex !== -1 && selectedSelection.points.length > 3) {
            removeNodeFromPolygon(selectedSelectionId, nodeIndex)
          }
        }
      }
    },
    [tool, selectedSelectionId, selections, getCanvasCoordinates, imageToCanvas, removeNodeFromPolygon],
  )

  // Handle mouse down for panning and node dragging
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()

      if (e.button !== 0) return // Only handle left mouse button

      const canvasCoords = getCanvasCoordinates(e.clientX, e.clientY)

      if (tool === "edit" && selectedSelectionId) {
        // Check if clicking on a node for dragging (prioritize over add buttons)
        const selectedSelection = selections.find((s) => s.id === selectedSelectionId)
        if (selectedSelection) {
          const nodeIndex = selectedSelection.points.findIndex((point) => {
            const screenPoint = imageToCanvas(point.x, point.y)
            const distance = Math.sqrt(
              Math.pow(canvasCoords.x - screenPoint.x, 2) + Math.pow(canvasCoords.y - screenPoint.y, 2),
            )
            return distance < 8
          })

          if (nodeIndex !== -1) {
            setEditingNodeIndex(nodeIndex)
            setIsDraggingNode(true)
            return
          }
        }
      }

      if (tool === "pan") {
        setIsPanning(true)
        setDragStart({
          x: canvasCoords.x - pan.x,
          y: canvasCoords.y - pan.y,
        })
      }
    },
    [tool, pan, getCanvasCoordinates, selectedSelectionId, selections, imageToCanvas],
  )

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const canvasCoords = getCanvasCoordinates(e.clientX, e.clientY)

      if (isPanning && tool === "pan") {
        setPan({
          x: canvasCoords.x - dragStart.x,
          y: canvasCoords.y - dragStart.y,
        })
      } else if (isDraggingNode && editingNodeIndex !== null && selectedSelectionId) {
        // Real-time node position update
        const imageCoords = screenToImage(e.clientX, e.clientY)
        setSelections((prev) =>
          prev.map((selection) => {
            if (selection.id === selectedSelectionId) {
              const newPoints = [...selection.points]
              newPoints[editingNodeIndex] = imageCoords
              return { ...selection, points: newPoints }
            }
            return selection
          }),
        )
      } else if (tool === "edit" && selectedSelectionId && !isDraggingNode) {
        // Check for add button hovering
        const selectedSelection = selections.find((s) => s.id === selectedSelectionId)
        if (selectedSelection) {
          const addButtonIndex = getClickedAddButton(canvasCoords, selectedSelection)
          setHoveredAddButton(addButtonIndex)
        }
      }
    },
    [
      isPanning,
      tool,
      dragStart,
      isDraggingNode,
      editingNodeIndex,
      selectedSelectionId,
      getCanvasCoordinates,
      screenToImage,
      selections,
      getClickedAddButton,
    ],
  )

  // Handle mouse up
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    e.preventDefault()

    if (e.button !== 0) return // Only handle left mouse button

    // Stop all dragging operations
    setIsPanning(false)
    setIsDraggingNode(false)
    setEditingNodeIndex(null)
  }, [])

  // Complete current polygon
  const completePolygon = useCallback(() => {
    if (currentSelection && currentSelection.points.length >= 3) {
      const completedSelection = {
        ...currentSelection,
        isComplete: true,
        label: newLabel || `Polygon ${selections.length + 1}`,
      }
      setSelections((prev) => [...prev, completedSelection])
      setCurrentSelection(null)
      setNewLabel("")
    }
  }, [currentSelection, selections.length, newLabel])

  // Cancel current polygon
  const cancelPolygon = useCallback(() => {
    setCurrentSelection(null)
    setNewLabel("")
  }, [])

  // Delete selection
  const deleteSelection = useCallback(
    (id: string) => {
      setSelections((prev) => prev.filter((s) => s.id !== id))
      if (selectedSelectionId === id) {
        setSelectedSelectionId(null)
      }
    },
    [selectedSelectionId],
  )

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const img = new Image()
      img.onload = () => {
        setImageElement(img)
        // Reset view and fit image with proper aspect ratio
        fitImageToCanvas(img)
        // Clear selections
        setSelections([])
        setCurrentSelection(null)
        setSelectedSelectionId(null)
      }
      img.src = URL.createObjectURL(file)
    }
  }, [])

  // Fit image to canvas with proper aspect ratio
  const fitImageToCanvas = useCallback(
    (img?: HTMLImageElement) => {
      const targetImage = img || imageElement
      if (!targetImage || !canvasSize.width || !canvasSize.height) return

      // Calculate scale to fit image while maintaining aspect ratio
      const scaleX = canvasSize.width / targetImage.width
      const scaleY = canvasSize.height / targetImage.height
      const scale = Math.min(scaleX, scaleY) * 0.9 // 90% to leave some margin

      setZoom(scale)

      // Center the image
      const scaledWidth = targetImage.width * scale
      const scaledHeight = targetImage.height * scale
      setPan({
        x: (canvasSize.width - scaledWidth) / 2,
        y: (canvasSize.height - scaledHeight) / 2,
      })
    },
    [imageElement, canvasSize],
  )

  // Zoom functions
  const zoomIn = useCallback(() => {
    setZoom((prevZoom) => {
      const newZoom = Math.min(prevZoom * 1.2, 10)
      if (!canvasRef.current) return newZoom
      const canvas = canvasRef.current
      const center = { x: canvas.width / 2 / (window.devicePixelRatio || 1), y: canvas.height / 2 / (window.devicePixelRatio || 1) }
      // Image coordinates at center before zoom
      const imageCenter = { x: (center.x - pan.x) / prevZoom, y: (center.y - pan.y) / prevZoom }
      // New pan to keep imageCenter at canvas center
      setPan({
        x: center.x - imageCenter.x * newZoom,
        y: center.y - imageCenter.y * newZoom,
      })
      return newZoom
    })
  }, [pan])

  const zoomOut = useCallback(() => {
    setZoom((prevZoom) => {
      const newZoom = Math.max(prevZoom / 1.2, 0.1)
      if (!canvasRef.current) return newZoom
      const canvas = canvasRef.current
      const center = { x: canvas.width / 2 / (window.devicePixelRatio || 1), y: canvas.height / 2 / (window.devicePixelRatio || 1) }
      // Image coordinates at center before zoom
      const imageCenter = { x: (center.x - pan.x) / prevZoom, y: (center.y - pan.y) / prevZoom }
      // New pan to keep imageCenter at canvas center
      setPan({
        x: center.x - imageCenter.x * newZoom,
        y: center.y - imageCenter.y * newZoom,
      })
      return newZoom
    })
  }, [pan])

  const handleZoomInputChange = useCallback((value: string) => {
    setZoomInput(value)
    const numValue = Number.parseFloat(value)
    if (!isNaN(numValue) && numValue > 0 && numValue <= 1000) {
      setZoom((prevZoom) => {
        const newZoom = numValue / 100
        if (!canvasRef.current) return newZoom
        const canvas = canvasRef.current
        const center = { x: canvas.width / 2 / (window.devicePixelRatio || 1), y: canvas.height / 2 / (window.devicePixelRatio || 1) }
        // Image coordinates at center before zoom
        const imageCenter = { x: (center.x - pan.x) / prevZoom, y: (center.y - pan.y) / prevZoom }
        // New pan to keep imageCenter at canvas center
        setPan({
          x: center.x - imageCenter.x * newZoom,
          y: center.y - imageCenter.y * newZoom,
        })
        return newZoom
      })
    }
  }, [pan])

  const downloadPNG = useCallback(() => {
    if (!imageElement) return

    // 1. Calculate bounding box for image, polygons, and labels
    let minX = 0, minY = 0, maxX = imageElement.width, maxY = imageElement.height

    selections.forEach((selection) => {
      if (selection.points.length > 0 && selection.isComplete) {
        // Polygon points
        selection.points.forEach((p) => {
          minX = Math.min(minX, p.x)
          minY = Math.min(minY, p.y)
          maxX = Math.max(maxX, p.x)
          maxY = Math.max(maxY, p.y)
        })
        // Label rectangle
        if (selection.label) {
          const centerX = selection.points.reduce((sum, p) => sum + p.x, 0) / selection.points.length
          const minYPoly = Math.min(...selection.points.map((p) => p.y))
          const labelY = minYPoly - 20
          // Estimate label size
          const font = "12px Arial"
          const tempCanvas = document.createElement("canvas")
          const tempCtx = tempCanvas.getContext("2d")
          let textWidth = 0, textHeight = 12, padding = 4
          if (tempCtx) {
            tempCtx.font = font
            textWidth = tempCtx.measureText(selection.label).width
          }
          const labelMinX = centerX - textWidth / 2 - padding
          const labelMaxX = centerX + textWidth / 2 + padding
          const labelMinY = labelY - textHeight - padding
          const labelMaxY = labelY + padding
          minX = Math.min(minX, labelMinX)
          minY = Math.min(minY, labelMinY)
          maxX = Math.max(maxX, labelMaxX)
          maxY = Math.max(maxY, labelMaxY)
        }
      }
    })

    // Add margin
    const margin = 16
    minX = Math.floor(minX - margin)
    minY = Math.floor(minY - margin)
    maxX = Math.ceil(maxX + margin)
    maxY = Math.ceil(maxY + margin)
    const width = maxX - minX
    const height = maxY - minY

    // 2. Create a temporary canvas with the new size
    const tempCanvas = document.createElement("canvas")
    const tempCtx = tempCanvas.getContext("2d")
    if (!tempCtx) return
    tempCanvas.width = width
    tempCanvas.height = height

    // Fill with white background
    tempCtx.fillStyle = "white"
    tempCtx.fillRect(0, 0, width, height)

    // 3. Draw the original image shifted
    tempCtx.drawImage(imageElement, -minX, -minY)

    // 4. Draw all completed selections and labels shifted
    selections.forEach((selection) => {
      if (selection.points.length > 0 && selection.isComplete) {
        tempCtx.save()
        tempCtx.strokeStyle = selection.color
        tempCtx.fillStyle = selection.color + "20"
        tempCtx.lineWidth = 2
        tempCtx.beginPath()
        tempCtx.moveTo(selection.points[0].x - minX, selection.points[0].y - minY)
        selection.points.forEach((point) => {
          tempCtx.lineTo(point.x - minX, point.y - minY)
        })
        tempCtx.closePath()
        tempCtx.fill()
        tempCtx.stroke()
        // Draw label
        if (selection.label) {
          const centerX = selection.points.reduce((sum, p) => sum + p.x, 0) / selection.points.length
          const minYPoly = Math.min(...selection.points.map((p) => p.y))
          const labelY = minYPoly - 20
          tempCtx.font = "12px Arial"
          tempCtx.textAlign = "center"
          const textMetrics = tempCtx.measureText(selection.label)
          const textWidth = textMetrics.width
          const textHeight = 12
          const padding = 4
          // Draw background with segment color
          tempCtx.fillStyle = selection.color
          tempCtx.fillRect(
            centerX - textWidth / 2 - padding - minX,
            labelY - textHeight - padding - minY,
            textWidth + padding * 2,
            textHeight + padding * 2,
          )
          // Draw text in white for better contrast
          tempCtx.fillStyle = "#fff"
          tempCtx.fillText(selection.label, centerX - minX, labelY - padding - minY)
        }
        tempCtx.restore()
      }
    })

    // 5. Create download link
    const link = document.createElement("a")
    link.download = "segmented-image.png"
    link.href = tempCanvas.toDataURL("image/png")
    link.click()
  }, [imageElement, selections])

  const startEditingLabel = useCallback((selection: PolygonSelection) => {
    setEditingLabelId(selection.id)
    setEditingLabelValue(selection.label)
  }, [])

  const saveEditingLabel = useCallback(() => {
    if (editingLabelId && editingLabelValue.trim()) {
      setSelections((prev) =>
        prev.map((selection) =>
          selection.id === editingLabelId ? { ...selection, label: editingLabelValue.trim() } : selection,
        ),
      )
    }
    setEditingLabelId(null)
    setEditingLabelValue("")
  }, [editingLabelId, editingLabelValue])

  const cancelEditingLabel = useCallback(() => {
    setEditingLabelId(null)
    setEditingLabelValue("")
  }, [])

  // Handle window resize
  const handleResize = useCallback(() => {
    setupCanvas()
  }, [setupCanvas])

  // Setup canvas on mount and resize
  useEffect(() => {
    setupCanvas()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [setupCanvas, handleResize])

  // Redraw when canvas size changes
  useEffect(() => {
    if (image && canvasSize.width && canvasSize.height) {
      fitImageToCanvas()
    }
  }, [canvasSize, fitImageToCanvas])

  // Effect to redraw canvas
  useEffect(() => {
    draw()
  }, [draw])

  useEffect(() => {
    setZoomInput(Math.round(zoom * 100).toString())
  }, [zoom])

  const handleMouseLeave = useCallback(() => {
    // Stop all dragging operations when mouse leaves canvas
    setIsPanning(false)
    setIsDraggingNode(false)
    setEditingNodeIndex(null)
    setHoveredAddButton(null)
  }, [])

  // Load image when image prop changes
  useEffect(() => {
    if (image) {
      const img = new Image()
      img.onload = () => {
        setImageElement(img)
        fitImageToCanvas(img)
      }
      img.src = image
    } else {
      setImageElement(null)
    }
  }, [image])

  // Debug function to show polygon coordinates
  const debugShowCoordinates = useCallback(() => {
    console.log('Current Polygon Selections:')
    selections.forEach((selection, index) => {
      console.log(`\nPolygon ${index + 1} (${selection.label}):`)
      console.log('Points:', selection.points.map(p => `(${p.x.toFixed(2)}, ${p.y.toFixed(2)})`).join(', '))
    })
  }, [selections])

  // Expose debug function to window
  useEffect(() => {
    // @ts-ignore
    window.debugShowCoordinates = debugShowCoordinates
  }, [debugShowCoordinates])

  // Excel report generation
  const downloadExcelReport = useCallback(() => {
    if (!imageElement) return
    const width = imageElement.width
    const regionCount = 10
    const regionWidth = width / regionCount
    const mmRanges = [
      "0-300", "300-600", "600-900", "900-1200", "1200-1500", "1500-1800", "1800-2100", "2100-2400", "2400-2700", "2700-3000"
    ]
    const rows = []
    for (let i = 0; i < regionCount; ++i) {
      // Find all segment names that have at least one point in this region
      const xStart = i * regionWidth
      const xEnd = (i + 1) * regionWidth
      const regionDefects = selections
        .filter(sel => sel.isComplete && sel.points.some(p => p.x >= xStart && p.x < xEnd))
        .map(sel => sel.label)
      rows.push({
        "Номер сварного соединения по журналу сварки": "<Напишите здесь>",
        "Диаметр и толщина стенки трубы, мм": "<Напишите здесь>",
        "Шифр бригады или клеймо сварщика": "<Напишите здесь>",
        "Номер участка контроля (координаты мерного пояса)": mmRanges[i],
        "Чувствительность контроля, мм": 0.5,
        "Описание выявленных дефектов": regionDefects.join(", "),
        "Координаты недопустимых дефектов по периметру шва": "<Напишите здесь>",
        "Заключение (годен, ремонт, вырезать)": "<Напишите здесь>",
        "Примечания": "<Напишите здесь>"
      })
    }
    const ws = XLSX.utils.json_to_sheet(rows, {header: [
      "Номер сварного соединения по журналу сварки",
      "Диаметр и толщина стенки трубы, мм",
      "Шифр бригады или клеймо сварщика",
      "Номер участка контроля (координаты мерного пояса)",
      "Чувствительность контроля, мм",
      "Описание выявленных дефектов",
      "Координаты недопустимых дефектов по периметру шва",
      "Заключение (годен, ремонт, вырезать)",
      "Примечания"
    ]})
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Отчет")
    XLSX.writeFile(wb, "report.xlsx")
  }, [imageElement, selections])

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Panel */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <CardHeader>
          <CardTitle>Image Segmentation</CardTitle>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto space-y-4">
          {/* File Upload */}
          <div>
            <Button onClick={onReset} className="w-full" variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Upload Image
            </Button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </div>

          {image && (
            <>
              <Button onClick={downloadPNG} className="w-full mb-2" variant="outline">
                <Save className="w-4 h-4 mr-2" />
                Image Report
              </Button>
              <Button onClick={downloadExcelReport} className="w-full" variant="outline">
                <Save className="w-4 h-4 mr-2" />
                Excel Report
              </Button>
            </>
          )}

          <Separator />

          {/* Tools */}
          <div>
            <h3 className="font-semibold mb-2">Tools</h3>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={tool === "pan" ? "default" : "outline"}
                className={tool === "pan" ? "bg-blue-500 hover:bg-blue-600 text-white" : ""}
                size="sm"
                onClick={() => setTool("pan")}
              >
                <Move className="w-4 h-4" />
              </Button>
              <Button
                variant={tool === "polygon" ? "default" : "outline"}
                className={tool === "polygon" ? "bg-blue-500 hover:bg-blue-600 text-white" : ""}
                size="sm"
                onClick={() => setTool("polygon")}
              >
                <Polygon className="w-4 h-4" />
              </Button>
              <Button
                variant={tool === "edit" ? "default" : "outline"}
                className={tool === "edit" ? "bg-blue-500 hover:bg-blue-600 text-white" : ""}
                size="sm"
                onClick={() => setTool("edit")}
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Zoom Controls */}
          <div>
            <h3 className="font-semibold mb-2">Zoom</h3>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={zoomOut}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-1">
                <Input
                  type="text"
                  value={zoomInput}
                  onChange={(e) => handleZoomInputChange(e.target.value)}
                  className="w-16 h-8 text-center text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur()
                    }
                  }}
                />
                <span className="text-sm">%</span>
              </div>
              <Button size="sm" variant="outline" onClick={zoomIn}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => fitImageToCanvas()}>
                Fit
              </Button>
            </div>
          </div>

          {/* Current Polygon */}
          {currentSelection && (
            <div>
              <h3 className="font-semibold mb-2">Current Polygon</h3>
              <div className="space-y-2">
                <Select value={newLabel} onValueChange={setNewLabel}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Выберите имя сегмента" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEGMENT_LABELS.map((label) => (
                      <SelectItem key={label} value={label}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button size="sm" onClick={completePolygon} disabled={!newLabel}>
                    <Save className="w-4 h-4 mr-1" />
                    Complete
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelPolygon}>
                    Cancel
                  </Button>
                </div>
                <p className="text-sm text-gray-600">Points: {currentSelection.points.length}</p>
              </div>
            </div>
          )}

          <Separator />

          {/* Selections List */}
          <div>
            <h3 className="font-semibold mb-2">Selections ({selections.length})</h3>
            <div className="space-y-2 max-h-60 overflow-auto">
              {selections.map((selection) => (
                <div
                  key={selection.id}
                  className={`p-2 border rounded cursor-pointer ${
                    selectedSelectionId === selection.id ? "border-blue-500 bg-blue-50" : "border-gray-200"
                  }`}
                  onClick={() => setSelectedSelectionId(selectedSelectionId === selection.id ? null : selection.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: selection.color }} />
                      {editingLabelId === selection.id ? (
                        <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                          <Select value={editingLabelValue} onValueChange={setEditingLabelValue}>
                            <SelectTrigger className="h-6 text-sm flex-1">
                              <SelectValue placeholder="Выберите имя сегмента" />
                            </SelectTrigger>
                            <SelectContent>
                              {SEGMENT_LABELS.map((label) => (
                                <SelectItem key={label} value={label}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" variant="ghost" onClick={saveEditingLabel} className="h-6 w-6 p-0" disabled={!editingLabelValue}>
                            <Save className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <span
                          className="text-sm font-medium flex-1 cursor-text"
                          onClick={(e) => {
                            e.stopPropagation()
                            startEditingLabel(selection)
                          }}
                        >
                          {selection.label}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteSelection(selection.id)
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{selection.points.length} points</div>
                </div>
              ))}
            </div>
          </div>

          {/* Edit Controls */}
          {selectedSelectionId && tool === "edit" && (
            <div>
              <h3 className="font-semibold mb-2">Edit Polygon</h3>
              <div className="space-y-2">
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">+</span>
                    </div>
                    <span>Click green buttons on edges to add nodes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Minus className="w-4 h-4 text-red-600" />
                    <span>Right-click nodes to remove</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Move className="w-4 h-4 text-blue-600" />
                    <span>Drag nodes to reposition</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </div>

      {/* Main Canvas Area */}
      <div ref={containerRef} className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair"
          onClick={handleCanvasClick}
          onContextMenu={handleContextMenu}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />

        {/* Instructions Overlay */}
        {!image && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-gray-500">
              <Upload className="w-12 h-12 mx-auto mb-4" />
              <p className="text-lg font-medium">Upload an image to start</p>
              <p className="text-sm">Supports large images up to 30k×1k pixels</p>
            </div>
          </div>
        )}

        {/* Tool Instructions */}
        {image && (
          <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-lg pointer-events-none">
            <div className="text-sm">
              {tool === "pan" && "Click and drag to pan the image"}
              {tool === "polygon" && "Click to add points, complete polygon in sidebar"}
              {tool === "edit" && selectedSelectionId && (
                <div className="space-y-1">
                  <div>• Click green buttons to add nodes</div>
                  <div>• Right-click nodes to remove</div>
                  <div>• Drag nodes to move them</div>
                </div>
              )}
              {tool === "edit" && !selectedSelectionId && "Select a polygon to edit"}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 