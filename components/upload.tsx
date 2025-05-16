"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { motion } from "framer-motion"
import { UploadIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface UploadProps {
  onImageUpload: (imageUrl: string) => void
}

export function Upload({ onImageUpload }: UploadProps) {
  const [isDragging, setIsDragging] = useState(false)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles && acceptedFiles.length > 0) {
        const file = acceptedFiles[0]
        const reader = new FileReader()

        reader.onload = (e) => {
          if (e.target?.result) {
            onImageUpload(e.target.result as string)
          }
        }

        reader.readAsDataURL(file)
      }
    },
    [onImageUpload],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp"],
    },
    multiple: false,
  })

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto"
    >
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-12 
          transition-all duration-300 ease-in-out
          bg-white shadow-sm hover:shadow-md
          ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"}
        `}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDrop={() => setIsDragging(false)}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center justify-center text-center">
          <motion.div
            animate={{
              y: isDragActive ? [0, -10, 0] : 0,
              scale: isDragActive ? 1.05 : 1,
            }}
            transition={{ duration: 0.5, repeat: isDragActive ? Number.POSITIVE_INFINITY : 0, repeatType: "reverse" }}
            className="w-16 h-16 mb-4 rounded-full bg-blue-100 flex items-center justify-center text-blue-500"
          >
            <UploadIcon size={28} />
          </motion.div>

          <h3 className="text-xl font-semibold mb-2">Upload X-Ray Image</h3>
          <p className="text-gray-500 mb-6">Drag & drop your X-Ray image here, or click to browse</p>

          <Button className="bg-blue-500 hover:bg-blue-600">
            <UploadIcon className="mr-2 h-4 w-4" /> Select Image
          </Button>

          <p className="mt-4 text-sm text-gray-400">Supported formats: PNG, JPG, TIFF, BMP</p>
        </div>
      </div>
    </motion.div>
  )
}
