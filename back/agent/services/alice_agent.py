"""
Motor principal da Alice: LangChain ReAct Agent com RAG + Tools.
Suporta modo síncrono e modo streaming (SSE).
"""
from __future__ import annotations

import json
import logging
import queue
import threading
from typing import Generator, List, Optional

from django.conf import settings

from agent.prompts.alice_prompt import ALICE_SYSTEM_PROMPT
from agent.tools.knowledge_tools import (
    search_knowledge_base,
    search_manuals,
    search_tutorials,
)
from agent.tools.platform_tools import (
    get_platform_stats,
    list_courses,
    list_tutorials,
    list_manuals,
    list_sectors,
    get_recent_content,
)

logger = logging.getLogger(__name__)

ALICE_TOOLS = [
    search_knowledge_base,
    search_manuals,
    search_tutorials,
    get_platform_stats,
    list_courses,
    list_tutorials,
    list_manuals,
    list_sectors,
    get_recent_content,
]

# Cache de agentes por modelo (evita rebuild a cada request)
_agent_cache: dict = {}


def _build_agent(streaming: bool = False):
    """Constrói o agente LangChain. Reutiliza instância cached."""
    cache_key = f"streaming={streaming}"
    if cache_key in _agent_cache:
        return _agent_cache[cache_key]

    from langchain_openai import ChatOpenAI
    from langchain.agents import create_react_agent, AgentExecutor
    from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
    from langchain import hub

    llm = ChatOpenAI(
        model=settings.OPENAI_CHAT_MODEL,
        api_key=settings.OPENAI_API_KEY,
        temperature=0.3,
        streaming=streaming,
        max_tokens=2000,
    )

    # Prompt ReAct com system prompt da Alice + histórico
    prompt = ChatPromptTemplate.from_messages([
        ("system", ALICE_SYSTEM_PROMPT),
        MessagesPlaceholder("chat_history", optional=True),
        ("human", "{input}"),
        MessagesPlaceholder("agent_scratchpad"),
    ])

    agent = create_react_agent(llm, ALICE_TOOLS, prompt)
    executor = AgentExecutor(
        agent=agent,
        tools=ALICE_TOOLS,
        verbose=False,
        max_iterations=6,
        handle_parsing_errors=True,
        return_intermediate_steps=False,
    )

    _agent_cache[cache_key] = executor
    return executor


def _build_messages_history(history: list[dict]) -> list:
    """Converte histórico de mensagens para formato LangChain."""
    from langchain_core.messages import HumanMessage, AIMessage
    messages = []
    for msg in history[-10:]:  # Últimas 10 mensagens para não estourar contexto
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] in ("assistant", "ai"):
            messages.append(AIMessage(content=msg["content"]))
    return messages


def run_alice(
    message: str,
    history: Optional[List[dict]] = None,
) -> dict:
    """
    Executa a Alice de forma síncrona.
    Retorna dict com response, sources extraídas do contexto.
    """
    if not settings.OPENAI_API_KEY:
        return {
            "success": False,
            "response": (
                "⚠️ Alice não está configurada. "
                "Defina **OPENAI_API_KEY** no servidor."
            ),
            "sources": [],
        }

    try:
        executor = _build_agent(streaming=False)
        chat_history = _build_messages_history(history or [])

        result = executor.invoke({
            "input": message,
            "chat_history": chat_history,
        })

        response_text = result.get("output", "")
        return {
            "success": True,
            "response": response_text,
            "sources": [],
        }

    except Exception as e:
        logger.error("Erro no agente Alice: %s", e, exc_info=True)
        return {
            "success": False,
            "response": f"Erro ao processar sua mensagem: {str(e)}",
            "sources": [],
        }


def stream_alice(
    message: str,
    history: Optional[List[dict]] = None,
) -> Generator[str, None, None]:
    """
    Executa a Alice com streaming via SSE.
    Gera eventos no formato: data: <json>\\n\\n

    Tipos de evento:
      - {"type": "token", "content": "..."}
      - {"type": "tool_start", "tool": "...", "input": "..."}
      - {"type": "tool_end", "tool": "..."}
      - {"type": "done", "full_response": "..."}
      - {"type": "error", "message": "..."}
    """
    if not settings.OPENAI_API_KEY:
        payload = json.dumps({
            "type": "error",
            "message": "OPENAI_API_KEY não configurada.",
        }, ensure_ascii=False)
        yield f"data: {payload}\n\n"
        return

    token_queue: queue.Queue = queue.Queue()

    from langchain_core.callbacks import BaseCallbackHandler

    class StreamingHandler(BaseCallbackHandler):
        def on_llm_new_token(self, token: str, **kwargs):
            token_queue.put({"type": "token", "content": token})

        def on_tool_start(self, serialized, input_str, **kwargs):
            tool_name = serialized.get("name", "tool")
            token_queue.put({"type": "tool_start", "tool": tool_name, "input": str(input_str)[:100]})

        def on_tool_end(self, output, **kwargs):
            token_queue.put({"type": "tool_end"})

        def on_llm_end(self, response, **kwargs):
            pass

        def on_agent_finish(self, finish, **kwargs):
            token_queue.put({"type": "agent_finish", "output": finish.return_values.get("output", "")})

        def on_chain_error(self, error, **kwargs):
            token_queue.put({"type": "error", "message": str(error)})

        def on_llm_error(self, error, **kwargs):
            token_queue.put({"type": "error", "message": str(error)})

    handler = StreamingHandler()

    def run_in_thread():
        try:
            from langchain_openai import ChatOpenAI
            from langchain.agents import create_react_agent, AgentExecutor
            from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

            llm = ChatOpenAI(
                model=settings.OPENAI_CHAT_MODEL,
                api_key=settings.OPENAI_API_KEY,
                temperature=0.3,
                streaming=True,
                max_tokens=2000,
                callbacks=[handler],
            )

            prompt = ChatPromptTemplate.from_messages([
                ("system", ALICE_SYSTEM_PROMPT),
                MessagesPlaceholder("chat_history", optional=True),
                ("human", "{input}"),
                MessagesPlaceholder("agent_scratchpad"),
            ])

            agent = create_react_agent(llm, ALICE_TOOLS, prompt)
            executor = AgentExecutor(
                agent=agent,
                tools=ALICE_TOOLS,
                verbose=False,
                max_iterations=6,
                handle_parsing_errors=True,
                callbacks=[handler],
            )

            chat_history = _build_messages_history(history or [])
            executor.invoke({"input": message, "chat_history": chat_history})
        except Exception as e:
            token_queue.put({"type": "error", "message": str(e)})
        finally:
            token_queue.put(None)  # Sinal de fim

    thread = threading.Thread(target=run_in_thread, daemon=True)
    thread.start()

    full_response = []
    while True:
        try:
            item = token_queue.get(timeout=60)
        except queue.Empty:
            yield f"data: {json.dumps({'type': 'error', 'message': 'Timeout.'})}\n\n"
            break

        if item is None:
            # Fim do stream
            yield f"data: {json.dumps({'type': 'done', 'full_response': ''.join(full_response)}, ensure_ascii=False)}\n\n"
            break

        if item.get("type") == "token":
            full_response.append(item["content"])

        yield f"data: {json.dumps(item, ensure_ascii=False)}\n\n"

    thread.join(timeout=2)
