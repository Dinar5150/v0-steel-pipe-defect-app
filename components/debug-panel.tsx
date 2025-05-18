"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Plus } from "lucide-react"

interface Segment {
  id: number
  x0: number
  y0: number
  x1: number
  y1: number
  label: string
  confidence: number
}

interface DebugPanelProps {
  segments: Segment[]
  onSegmentsChange: (segments: Segment[]) => void
}

export function DebugPanel({ segments, onSegmentsChange }: DebugPanelProps) {
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null)

  const handleSegmentChange = (id: number, field: keyof Segment, value: any) => {
    const updatedSegments = segments.map((segment) => {
      if (segment.id === id) {
        return { ...segment, [field]: field === "confidence" ? Number.parseFloat(value) : Number.parseInt(value) }
      }
      return segment
    })
    onSegmentsChange(updatedSegments)
  }

  const handleDeleteSegment = (id: number) => {
    const updatedSegments = segments.filter((segment) => segment.id !== id)
    onSegmentsChange(updatedSegments)
    if (selectedSegment === id) {
      setSelectedSegment(null)
    }
  }

  const handleAddSegment = () => {
    const newId = Math.max(0, ...segments.map((s) => s.id)) + 1
    const newSegment: Segment = {
      id: newId,
      x0: 100,
      y0: 100,
      x1: 180,
      y1: 130,
      label: "New Defect",
      confidence: 0.75,
    }
    onSegmentsChange([...segments, newSegment])
    setSelectedSegment(newId)
  }

  return (
    <div className="mt-6 bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-amber-800">Debug Panel</h3>
          <p className="text-sm text-amber-700">⚠️ This panel should be disabled in production</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddSegment}
          className="bg-amber-100 hover:bg-amber-200 border-amber-300"
        >
          <Plus className="h-4 w-4 mr-1" /> Add Segment
        </Button>
      </div>

      <div className="space-y-4">
        {segments.map((segment) => (
          <div
            key={segment.id}
            className={`p-3 rounded-md ${selectedSegment === segment.id ? "bg-amber-100 border border-amber-300" : "bg-white"}`}
            onClick={() => setSelectedSegment(segment.id)}
          >
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium">
                Segment #{segment.id}: {segment.label}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteSegment(segment.id)}
                className="text-red-500 h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1">X0 (Left)</label>
                <Input
                  type="number"
                  value={segment.x0}
                  onChange={(e) => handleSegmentChange(segment.id, "x0", e.target.value)}
                  className="h-8"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Y0 (Top)</label>
                <Input
                  type="number"
                  value={segment.y0}
                  onChange={(e) => handleSegmentChange(segment.id, "y0", e.target.value)}
                  className="h-8"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">X1 (Right)</label>
                <Input
                  type="number"
                  value={segment.x1}
                  onChange={(e) => handleSegmentChange(segment.id, "x1", e.target.value)}
                  className="h-8"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Y1 (Bottom)</label>
                <Input
                  type="number"
                  value={segment.y1}
                  onChange={(e) => handleSegmentChange(segment.id, "y1", e.target.value)}
                  className="h-8"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Label</label>
                <Input
                  type="text"
                  value={segment.label}
                  onChange={(e) => handleSegmentChange(segment.id, "label", e.target.value)}
                  className="h-8"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Confidence (0-1)</label>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={segment.confidence}
                  onChange={(e) => handleSegmentChange(segment.id, "confidence", e.target.value)}
                  className="h-8"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
