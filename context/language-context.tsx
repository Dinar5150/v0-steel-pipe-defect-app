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
  | "login.switchToLogin"
  | "login.switchToSignup"
  | "signup.title"
  | "signup.subtitle"
  | "signup.button"
  | "signup.error"
  | "history.title"
  | "history.clear"
  | "history.no"
  | "history.no.search"
  | "history.go.to.analysis"
  | "history.clear.search"
  | "history.view.details"
  | "history.edited"
  | "history.search.placeholder"
  | "back"
  | "download_report"
  | "results.image.segmentation"
  | "results.upload.image"
  | "results.image.report"
  | "results.excel.report"
  | "results.tools"
  | "results.zoom"
  | "results.fit"
  | "results.current.polygon"
  | "results.select.segment"
  | "results.complete"
  | "results.cancel"
  | "results.points"
  | "results.selections"
  | "results.edit.polygon"
  | "results.add.nodes"
  | "results.remove.nodes"
  | "results.move.nodes"
  | "results.select.polygon"
  | "results.pan.image"
  | "results.add.points"
  | "results.complete.polygon"
  | "results.inference.time"
  | "auth.required"
  | "error.analysis"

type Translations = {
  [key in Language]: {
    [key in TranslationKeys]: string
  }
}

interface LanguageContextType {
  language: Language
  toggleLanguage: () => void
  t: (key: TranslationKeys, params?: Record<string, string | number>) => string
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
    "login.error": "Invalid username or password",
    "login.switchToLogin": "Already have an account? Sign in",
    "login.switchToSignup": "Don't have an account? Sign up",
    "signup.title": "Create Account",
    "signup.subtitle": "Sign up to get started with the application",
    "signup.button": "Sign Up",
    "signup.error": "Failed to create account",
    "history.title": "Analysis History",
    "history.clear": "Clear History",
    "history.no": "No analysis history available.",
    "history.no.search": "No results matching your search.",
    "history.go.to.analysis": "Go to Analysis",
    "history.clear.search": "Clear Search",
    "history.view.details": "View Details",
    "history.edited": "Edited",
    "history.search.placeholder": "Search by defect type...",
    "back": "Back",
    "download_report": "Download CSV report",
    "results.image.segmentation": "Analysis Results",
    "results.upload.image": "Upload Image",
    "results.image.report": "Image Report",
    "results.excel.report": "Excel Report",
    "results.tools": "Tools",
    "results.zoom": "Zoom",
    "results.fit": "Fit",
    "results.current.polygon": "Current Polygon",
    "results.select.segment": "Select segment name",
    "results.complete": "Complete",
    "results.cancel": "Cancel",
    "results.points": "Points",
    "results.selections": "Defects",
    "results.edit.polygon": "Edit Polygon",
    "results.add.nodes": "Click green buttons on edges to add nodes",
    "results.remove.nodes": "Right-click nodes to remove",
    "results.move.nodes": "Drag nodes to reposition",
    "results.select.polygon": "Select a polygon to edit",
    "results.pan.image": "Click and drag to pan the image",
    "results.add.points": "Click to add points, complete polygon in sidebar",
    "results.complete.polygon": "Complete polygon in sidebar",
    "results.inference.time": "Inference time: {time}s",
    "auth.required": "Please sign in to continue",
    "error.analysis": "Failed to analyze image. Please try again."
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
    "login.error": "Неверное имя пользователя или пароль",
    "login.switchToLogin": "Уже есть аккаунт? Войти",
    "login.switchToSignup": "Нету аккаунта? Зарегистрироваться",
    "signup.title": "Создать аккаунт",
    "signup.subtitle": "Зарегистрируйтесь, чтобы начать работу с приложением",
    "signup.button": "Зарегистрироваться",
    "signup.error": "Не удалось создать аккаунт",
    "history.title": "История анализов",
    "history.clear": "Очистить историю",
    "history.no": "История анализов отсутствует.",
    "history.no.search": "Нет результатов по вашему запросу.",
    "history.go.to.analysis": "К анализу",
    "history.clear.search": "Сбросить поиск",
    "history.view.details": "Подробнее",
    "history.edited": "Изменено",
    "history.search.placeholder": "Поиск по типу дефекта...",
    "back": "Назад",
    "download_report": "Скачать CSV-отчёт",
    "results.image.segmentation": "Результаты анализа",
    "results.upload.image": "Загрузить изображение",
    "results.image.report": "Изображение-отчет",
    "results.excel.report": "Excel отчет",
    "results.tools": "Инструменты",
    "results.zoom": "Масштаб",
    "results.fit": "По размеру",
    "results.current.polygon": "Текущий полигон",
    "results.select.segment": "Выберите имя сегмента",
    "results.complete": "Завершить",
    "results.cancel": "Отмена",
    "results.points": "Точки",
    "results.selections": "Дефекты",
    "results.edit.polygon": "Редактировать полигон",
    "results.add.nodes": "Нажмите зеленые кнопки на краях, чтобы добавить узлы",
    "results.remove.nodes": "Правый клик по узлам для удаления",
    "results.move.nodes": "Перетащите узлы для перемещения",
    "results.select.polygon": "Выберите полигон для редактирования",
    "results.pan.image": "Нажмите и перетащите для перемещения изображения",
    "results.add.points": "Нажмите для добавления точек, завершите полигон в боковой панели",
    "results.complete.polygon": "Завершите полигон в боковой панели",
    "results.inference.time": "Время обработки: {time}с",
    "auth.required": "Пожалуйста, войдите в систему",
    "error.analysis": "Не удалось проанализировать изображение. Пожалуйста, попробуйте снова."
  }
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("ru")

  const toggleLanguage = () => {
    setLanguage(prev => prev === "en" ? "ru" : "en")
  }

  const t = (key: TranslationKeys, params?: Record<string, string | number>): string => {
    let text = translations[language][key]
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        text = text.replace(`{${key}}`, value.toString())
      })
    }
    return text
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