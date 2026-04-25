import { authFetch } from './authFetch'
import { API_URL } from '../config/config'

export interface ChatMessage {
  message: string
  session_id?: string
  create_new_session?: boolean
}

export interface ChatResponse {
  success: boolean
  session_id: string
  response: string
  sources?: Array<{
    document_title: string
    source_type: string
    page?: number
    content: string
    relevance: number
  }>
  execution_time_ms?: number
  error?: string
}

export interface SessionStats {
  total_sessions: number
  active_sessions: number
  total_messages: number
  total_queries: number
  successful_queries: number
  average_response_time: number
  most_active_user: string
  popular_questions: Array<{ user_question: string; count: number }>
}

export interface ConversationSession {
  id: number
  session_id: string
  title: string
  created_at: string
  updated_at: string
  is_active: boolean
  message_count: number
}

// SSE stream event types
export type StreamEvent =
  | { type: 'session'; session_id: string }
  | { type: 'token'; content: string }
  | { type: 'tool_start'; tool: string; input: string }
  | { type: 'tool_end' }
  | { type: 'agent_finish'; output: string }
  | { type: 'done'; full_response: string }
  | { type: 'error'; message: string }

export const aliceAPI = {
  // Chat síncrono (resposta completa)
  sendMessage: async (data: ChatMessage): Promise<ChatResponse> => {
    const response = await authFetch(`${API_URL}/api/v1/alice/chat/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Erro ao enviar mensagem')
    return response.json()
  },

  // Chat com streaming SSE
  streamMessage: async (
    data: ChatMessage,
    onEvent: (event: StreamEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> => {
    // Lê token de acesso do cookie (mesmo mecanismo do authFetch)
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return parts.pop()?.split(';').shift() ?? null
      return null
    }
    const accessToken = getCookie('access')

    const response = await fetch(`${API_URL}/api/v1/alice/stream/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(data),
      signal,
    })

    if (!response.ok || !response.body) {
      throw new Error('Erro ao iniciar stream')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const raw = line.slice(6).trim()
          if (!raw) continue
          try {
            const event = JSON.parse(raw) as StreamEvent
            onEvent(event)
          } catch {
            // ignore malformed lines
          }
        }
      }
    }
  },

  // Pergunta rápida sem sessão
  quickQuestion: async (question: string): Promise<Omit<ChatResponse, 'session_id'>> => {
    const response = await authFetch(`${API_URL}/api/v1/alice/quick/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    })
    if (!response.ok) throw new Error('Erro ao enviar pergunta rápida')
    return response.json()
  },

  getStats: async (): Promise<SessionStats> => {
    const response = await authFetch(`${API_URL}/api/v1/alice/stats/`)
    if (!response.ok) throw new Error('Erro ao buscar estatísticas')
    return response.json()
  },

  getSessions: async (): Promise<{ results: ConversationSession[] }> => {
    const response = await authFetch(`${API_URL}/api/v1/alice/sessions/`)
    if (!response.ok) throw new Error('Erro ao buscar sessões')
    return response.json()
  },

  getSessionDetail: async (sessionId: number) => {
    const response = await authFetch(`${API_URL}/api/v1/alice/sessions/${sessionId}/`)
    if (!response.ok) throw new Error('Erro ao buscar sessão')
    return response.json()
  },

  clearSession: async (sessionId: number) => {
    const response = await authFetch(`${API_URL}/api/v1/alice/sessions/${sessionId}/clear/`, {
      method: 'POST',
    })
    if (!response.ok) throw new Error('Erro ao limpar sessão')
    return response.json()
  },
}
