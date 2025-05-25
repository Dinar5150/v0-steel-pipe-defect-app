"use client"

import { useCallback, useState, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { UploadIcon } from "lucide-react"
import { useLanguage } from "@/context/language-context"
import { useAuth } from "@/context/auth-context"
import { motion } from "framer-motion"
import { analyzeImage } from "@/lib/api"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface UploadProps {
  onImageUpload: (imageUrl: string, predictions: any, time: number) => void
}

export function Upload({ onImageUpload }: UploadProps) {
  const { t } = useLanguage()
  const { token } = useAuth()
  const router = useRouter()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)

  // Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isAnalyzing) {
      timer = setInterval(() => {
        setElapsedTime(prev => prev + 0.1)
      }, 100)
    } else {
      setElapsedTime(0)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isAnalyzing])

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!token) {
        toast.error(t("auth.required"))
        router.push("/login")
        return
      }

      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0]
        const imageUrl = URL.createObjectURL(file)
        
        try {
          setIsAnalyzing(true)
          const startTime = performance.now()
          const predictions = await analyzeImage(file, token)
          const endTime = performance.now()
          const inferenceTime = (endTime - startTime) / 1000 // Convert to seconds
          setIsAnalyzing(false)
          onImageUpload(imageUrl, predictions, inferenceTime)
        } catch (error: any) {
          console.error('Error analyzing image:', error)
          setIsAnalyzing(false)
          if (error.message === 'Authentication required') {
            toast.error(t("auth.required"))
            router.push("/login")
          } else {
            toast.error(t("error.analysis"))
          }
        }
      }
    },
    [onImageUpload, token, router, t]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".tiff", ".bmp"],
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

          <h3 className="text-xl font-semibold mb-2">{t("upload.title")}</h3>
          <p className="text-gray-500 mb-6">{t("upload.subtitle")}</p>

          <Button className="bg-blue-500 hover:bg-blue-600">
            <UploadIcon className="mr-2 h-4 w-4" /> {t("upload.button")}
          </Button>

          <p className="mt-4 text-sm text-gray-400">{t("upload.formats")}</p>

          {isAnalyzing && (
            <div className="mt-4 text-sm text-blue-500">
              {t("analyzing")} ({elapsedTime.toFixed(1)}s)
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
