"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

// Define the structure of an analysis history item
export interface AnalysisHistoryItem {
  id: string
  timestamp: number
  image: string
  results: any
  isEdited?: boolean
}

export interface HistoryContextType {
  history: AnalysisHistoryItem[]
  addToHistory: (image: string, results: any) => void
  updateHistoryItem: (image: string, results: any) => void
  clearHistory: () => void
  deleteHistoryItem: (id: string) => void
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined)

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([])

  // Load history from localStorage on initial render
  useEffect(() => {
    const savedHistory = localStorage.getItem("analysisHistory")
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory))
      } catch (error) {
        console.error("Failed to parse history from localStorage:", error)
        localStorage.removeItem("analysisHistory")
      }
    }
  }, [])

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("analysisHistory", JSON.stringify(history))
  }, [history])

  // Add a new analysis to history
  const addToHistory = (image: string, results: any) => {
    const newItem: AnalysisHistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      image,
      results,
    }
    setHistory((prev) => [newItem, ...prev])
  }

  // Update an existing history item
  const updateHistoryItem = (image: string, results: any) => {
    setHistory((prev) => {
      const existingItemIndex = prev.findIndex(item => item.image === image)
      if (existingItemIndex === -1) {
        // If item doesn't exist, add as new
        const newItem: AnalysisHistoryItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          image,
          results,
        }
        return [newItem, ...prev]
      }

      // Update existing item
      const updatedHistory = [...prev]
      updatedHistory[existingItemIndex] = {
        ...updatedHistory[existingItemIndex],
        results,
        isEdited: true,
        timestamp: Date.now(), // Update timestamp to move it to the top
      }
      
      // Sort by timestamp to keep most recent first
      return updatedHistory.sort((a, b) => b.timestamp - a.timestamp)
    })
  }

  // Clear all history
  const clearHistory = () => {
    setHistory([])
  }

  // Delete a specific history item
  const deleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id))
  }

  return (
    <HistoryContext.Provider value={{ history, addToHistory, updateHistoryItem, clearHistory, deleteHistoryItem }}>
      {children}
    </HistoryContext.Provider>
  )
}

// Custom hook to use the history context
export function useHistory() {
  const context = useContext(HistoryContext)
  if (context === undefined) {
    throw new Error("useHistory must be used within a HistoryProvider")
  }
  return context
}
