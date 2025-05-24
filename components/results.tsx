"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ZoomIn, ZoomOut, Move, OctagonIcon as Polygon, Edit3, Trash2, Save, Upload, Minus } from "lucide-react"
import { PredictionResult } from "@/lib/api"

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

          ctx.font = `${12 / zoom}px Arial`
          ctx.fillStyle = "#000"
          ctx.fillRect(centerX - 20 / zoom, centerY - 8 / zoom, 40 / zoom, 16 / zoom)
          ctx.fillStyle = "#fff"
          ctx.textAlign = "center"
          ctx.fillText(selection.label, centerX, centerY + 4 / zoom)
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
      } else if (tool === "edit" && selectedSelectionId) {
        // Check if clicking on an add button
        const selectedSelection = selections.find((s) => s.id === selectedSelectionId)
        if (selectedSelection) {
          const addButtonIndex = getClickedAddButton(canvasCoords, selectedSelection)
          if (addButtonIndex !== null) {
            addNodeAtMidpoint(selectedSelectionId, addButtonIndex)
            return
          }
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
    setZoom((prev) => Math.min(prev * 1.2, 10))
  }, [])

  const zoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev / 1.2, 0.1))
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

  const handleMouseLeave = useCallback(() => {
    // Stop all dragging operations when mouse leaves canvas
    setIsPanning(false)
    setIsDraggingNode(false)
    setEditingNodeIndex(null)
    setHoveredAddButton(null)
  }, [])

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
            <Button onClick={() => fileInputRef.current?.click()} className="w-full" variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Upload Image
            </Button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </div>

          <Separator />

          {/* Tools */}
          <div>
            <h3 className="font-semibold mb-2">Tools</h3>
            <div className="grid grid-cols-3 gap-2">
              <Button variant={tool === "pan" ? "default" : "outline"} size="sm" onClick={() => setTool("pan")}>
                <Move className="w-4 h-4" />
              </Button>
              <Button variant={tool === "polygon" ? "default" : "outline"} size="sm" onClick={() => setTool("polygon")}>
                <Polygon className="w-4 h-4" />
              </Button>
              <Button variant={tool === "edit" ? "default" : "outline"} size="sm" onClick={() => setTool("edit")}>
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
              <span className="text-sm font-mono">{Math.round(zoom * 100)}%</span>
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
                <Input placeholder="Enter label" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={completePolygon}>
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
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: selection.color }} />
                      <span className="text-sm font-medium">{selection.label}</span>
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