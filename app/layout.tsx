import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { HistoryProvider } from "@/context/history-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Steel Pipe Defect Analysis",
  description: "Analyze X-Ray images to detect defects in steel pipes",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <HistoryProvider>{children}</HistoryProvider>
      </body>
    </html>
  )
}
