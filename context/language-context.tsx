"use client"

import React, { createContext, useContext, useState } from "react"

type Language = "en" | "ru"

type TranslationKeys = 
  | "analyze.another"
  | "analyzing"
  | "no.results"
  | "detected.defects"
  | "analysis.results"
  | "new.defect"
  | "edit"
  | "done"
  | "add"
  | "delete"
  | "save"
  | "upload.title"
  | "upload.subtitle"
  | "upload.button"
  | "upload.formats"
  | "view.history"
  | "show.debug"
  | "login.title"
  | "login.subtitle"
  | "login.username"
  | "login.password"
  | "login.button"
  | "login.error"

type Translations = {
  [key in Language]: {
    [key in TranslationKeys]: string
  }
}

interface LanguageContextType {
  language: Language
  toggleLanguage: () => void
  t: (key: TranslationKeys) => string
}

const translations: Translations = {
  en: {
    "analyze.another": "Analyze Another Image",
    "analyzing": "Analyzing image...",
    "no.results": "No results available",
    "detected.defects": "Detected Weld Defects",
    "analysis.results": "Analysis Results",
    "new.defect": "New Defect",
    "edit": "Edit",
    "done": "Done",
    "add": "Add",
    "delete": "Delete",
    "save": "Save",
    "upload.title": "Steel Pipe Weld Analysis",
    "upload.subtitle": "Upload X-Ray images to detect and classify defects in pipe weld connections",
    "upload.button": "Select Image",
    "upload.formats": "Supported formats: PNG, JPG, TIFF, BMP",
    "view.history": "View History",
    "show.debug": "Show Debug",
    "login.title": "Welcome Back",
    "login.subtitle": "Sign in to continue to the application",
    "login.username": "Username",
    "login.password": "Password",
    "login.button": "Sign In",
    "login.error": "Invalid username or password"
  },
  ru: {
    "analyze.another": "Проанализировать другое изображение",
    "analyzing": "Анализ изображения...",
    "no.results": "Результаты отсутствуют",
    "detected.defects": "Обнаруженные дефекты сварки",
    "analysis.results": "Результаты анализа",
    "new.defect": "Новый дефект",
    "edit": "Редактировать",
    "done": "Готово",
    "add": "Добавить",
    "delete": "Удалить",
    "save": "Сохранить",
    "upload.title": "Анализ сварных соединений труб",
    "upload.subtitle": "Загрузите рентгеновские снимки для обнаружения и классификации дефектов в сварных соединениях труб",
    "upload.button": "Выбрать изображение",
    "upload.formats": "Поддерживаемые форматы: PNG, JPG, TIFF, BMP",
    "view.history": "История",
    "show.debug": "Отладка",
    "login.title": "Добро пожаловать",
    "login.subtitle": "Войдите, чтобы продолжить работу с приложением",
    "login.username": "Имя пользователя",
    "login.password": "Пароль",
    "login.button": "Войти",
    "login.error": "Неверное имя пользователя или пароль"
  }
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("ru")

  const toggleLanguage = () => {
    setLanguage(prev => prev === "en" ? "ru" : "en")
  }

  const t = (key: TranslationKeys): string => {
    return translations[language][key]
  }

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
} 