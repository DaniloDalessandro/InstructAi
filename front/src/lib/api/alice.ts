import { API_URL } from '../config/config'
import { authFetch } from './authFetch'

export interface ChatMessage {
  message: string
  session_id?: string
  create_new_session?: boolean
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

export interface SessionSummary {
  session_id: string
  title: string
  updated_at: string
  message_count: number
}

export interface SessionDetail {
  session_id: string
  title: string
  messages: { role: 'user' | 'assistant'; content: string; created_at: string }[]
}

export const aliceAPI = {
  getSessions: async (): Promise<SessionSummary[]> => {
    const res = await authFetch(`${API_URL}/api/v1/alice/sessions/`)
    if (!res.ok) throw new Error('Erro ao carregar sessões')
    return res.json()
  },

  getSession: async (sessionId: string): Promise<SessionDetail> => {
    const res = await authFetch(`${API_URL}/api/v1/alice/sessions/${sessionId}/`)
    if (!res.ok) throw new Error('Erro ao carregar sessão')
    return res.json()
  },

  deleteSession: async (sessionId: string): Promise<void> => {
    await authFetch(`${API_URL}/api/v1/alice/sessions/${sessionId}/`, { method: 'DELETE' })
  },

  // Chat com streaming SSE
  streamMessage: async (
    data: ChatMessage,
    onEvent: (event: StreamEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> => {
    const response = await authFetch(`${API_URL}/api/v1/alice/stream/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
}
