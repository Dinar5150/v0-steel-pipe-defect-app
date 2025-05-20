"use client"

import { PredictionResult } from "@/lib/api"

interface DebugPanelProps {
  segments: PredictionResult[]
  onSegmentsChange: (segments: PredictionResult[]) => void
}

export function DebugPanel({ segments, onSegmentsChange }: DebugPanelProps) {
  return (
    <div className="mt-8 p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Debug Panel</h3>
      <div className="space-y-4">
        {segments.map((segment, index) => (
          <div key={index} className="p-2 bg-white rounded">
            <p>Box {index + 1}:</p>
            <p>x1: {segment.x1.toFixed(2)}</p>
            <p>y1: {segment.y1.toFixed(2)}</p>
            <p>x2: {segment.x2.toFixed(2)}</p>
            <p>y2: {segment.y2.toFixed(2)}</p>
            <p>Confidence: {(segment.conf * 100).toFixed(2)}%</p>
            <p>Class: {segment.cls}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
