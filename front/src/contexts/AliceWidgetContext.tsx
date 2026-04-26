"use client"

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react"

export type Source = {
  document_title: string
  source_type: string
  page?: number
  content: string
  relevance: number
}

export type ChatBlock =
  | { id: string; role: "user"; text: string }
  | {
      id: string
      role: "alice"
      query: string
      text: string
      streaming: boolean
      error?: boolean
      sources?: Source[]
      toolCalls?: string[]
      time?: number
    }

interface AliceWidgetState {
  isOpen: boolean
  isMinimized: boolean
  blocks: ChatBlock[]
  sessionId: string
  loading: boolean
  open: () => void
  close: () => void
  minimize: () => void
  toggle: () => void
  clearHistory: () => void
  setBlocks: React.Dispatch<React.SetStateAction<ChatBlock[]>>
  setSessionId: React.Dispatch<React.SetStateAction<string>>
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  abortRef: React.MutableRefObject<AbortController | null>
}

const AliceWidgetContext = createContext<AliceWidgetState | undefined>(undefined)

export function AliceWidgetProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [blocks, setBlocks] = useState<ChatBlock[]>([])
  const [sessionId, setSessionId] = useState("")
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const open = useCallback(() => {
    setIsOpen(true)
    setIsMinimized(false)
  }, [])

  const close = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsOpen(false)
    setIsMinimized(false)
    setLoading(false)
  }, [])

  const minimize = useCallback(() => {
    setIsMinimized(true)
    setIsOpen(false)
  }, [])

  const toggle = useCallback(() => {
    if (isOpen) {
      setIsOpen(false)
    } else {
      setIsOpen(true)
      setIsMinimized(false)
    }
  }, [isOpen])

  const clearHistory = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setBlocks([])
    setSessionId("")
    setLoading(false)
  }, [])

  return (
    <AliceWidgetContext.Provider
      value={{
        isOpen,
        isMinimized,
        blocks,
        sessionId,
        loading,
        open,
        close,
        minimize,
        toggle,
        clearHistory,
        setBlocks,
        setSessionId,
        setLoading,
        abortRef,
      }}
    >
      {children}
    </AliceWidgetContext.Provider>
  )
}

export function useAliceWidget() {
  const ctx = useContext(AliceWidgetContext)
  if (!ctx) throw new Error("useAliceWidget must be used inside AliceWidgetProvider")
  return ctx
}
