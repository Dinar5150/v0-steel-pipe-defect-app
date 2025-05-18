import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { HistoryProvider } from "@/context/history-context"
import { AuthProvider } from "@/context/auth-context"
import { LanguageProvider } from "@/context/language-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Steel Pipe Defect Analysis",
  description: "AI-powered analysis of steel pipe defects",
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
        <AuthProvider>
          <LanguageProvider>
            <HistoryProvider>{children}</HistoryProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
