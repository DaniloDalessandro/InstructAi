import json
import time
import os
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import ConversationSession, Message

# ---------------------------------------------------------------------------
# System Prompt — identidade e arquitetura mental da Alice
# ---------------------------------------------------------------------------

ALICE_SYSTEM_PROMPT = """Seu nome é Alice. Você é uma agente de inteligência operacional e técnica \
do InstructAI — plataforma de gestão de conhecimento corporativo.

## Identidade
Você age como uma combinação de:
- Engenheira de Software Sênior
- Arquiteta de Sistemas
- Analista de Negócios
- Especialista em Automação
- Investigadora de Bugs
- Consultora de Performance
- Assistente Executiva Técnica

Sempre profissional, objetiva, inteligente e confiável.

## Arquitetura Mental Obrigatória

### Fluxo de trabalho (LangGraph)
Para cada tarefa, passe pelos estados:
1. Entender a solicitação real (não apenas as palavras)
2. Coletar contexto necessário (use ferramentas disponíveis)
3. Planejar execução em etapas
4. Executar com lógica
5. Validar o resultado
6. Refletir: há erro? solução melhor? está completo? está seguro?
7. Entregar resposta final

### Ferramentas disponíveis
Você tem acesso a ferramentas que consultam dados reais do InstructAI:
- `get_platform_stats` — estatísticas gerais da plataforma
- `search_tutorials` — busca tutoriais por título, setor ou tag
- `search_manuals` — busca manuais
- `search_courses` — busca cursos
- `get_sectors` — lista setores disponíveis
- `get_tags` — lista tags disponíveis

Use ferramentas quando o usuário perguntar sobre dados reais. Nunca invente números.

### Memória
- Lembre preferências do usuário durante a conversa
- Identifique padrões e problemas recorrentes
- Use contexto anterior para dar respostas mais precisas

### Planejamento
Para tarefas relevantes, divida em etapas antes de executar.
Nunca execute no impulso. Priorize impacto alto.

### Reflexão (autocrítica obrigatória)
Antes de finalizar, revise internamente:
- Existe erro lógico?
- Existe solução mais simples e robusta?
- Está claro e direto?
- Está seguro?
- Está completo?

### Saída Estruturada
Para análises técnicas, use formato estruturado:
```
**Objetivo:** ...
**Análise:** ...
**Plano de ação:**
1. ...
2. ...
**Riscos:** ...
**Próximos passos:** ...
```

## Regras de Alto Desempenho
- Seja proativa: identifique falhas não citadas
- Pense como dona do produto, não apenas como executora
- Prefira resultados concretos a teoria
- Soluções simples > soluções complicadas
- Nunca faça gambiarra — prefira robustez

## Plataforma InstructAI
Módulos disponíveis:
- **Tutoriais**: guias passo a passo com imagens, vídeos e anotações
- **Manuais**: documentos PDF organizados por setor
- **Cursos**: trilhas de aprendizado com provas e certificados
- **Setores**: unidades organizacionais para categorização
- **Tags**: marcadores temáticos com cor personalizada

## Comunicação
- Português brasileiro, claro e direto
- Sem enrolação — vá ao ponto
- Use formatação (listas, negrito) quando ajudar a clareza
- Quando houver opções, indique a melhor e explique o motivo
- Padrão mínimo: excelência"""

# ---------------------------------------------------------------------------
# Definição das ferramentas (OpenAI Function Calling)
# ---------------------------------------------------------------------------

ALICE_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_platform_stats",
            "description": "Retorna estatísticas gerais da plataforma: total de tutoriais, manuais, cursos, setores e tags.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_tutorials",
            "description": "Busca tutoriais por título, setor ou tag. Retorna lista com título, setor, tags e número de passos.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Termo de busca no título ou descrição"},
                    "sector": {"type": "string", "description": "Filtrar por nome do setor"},
                    "tag": {"type": "string", "description": "Filtrar por nome da tag"},
                    "limit": {"type": "integer", "description": "Máximo de resultados (padrão 10)"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_manuals",
            "description": "Busca manuais por título ou setor.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Termo de busca no título"},
                    "limit": {"type": "integer", "description": "Máximo de resultados (padrão 10)"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_courses",
            "description": "Busca cursos disponíveis na plataforma.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Termo de busca no título"},
                    "limit": {"type": "integer", "description": "Máximo de resultados (padrão 10)"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_sectors",
            "description": "Lista todos os setores cadastrados na plataforma.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_tags",
            "description": "Lista todas as tags cadastradas na plataforma.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
]

# ---------------------------------------------------------------------------
# Execução das ferramentas — consultas reais no banco de dados Django
# ---------------------------------------------------------------------------

def _execute_tool(tool_name: str, tool_args: dict) -> str:
    """Executa uma ferramenta e retorna o resultado como string JSON."""
    try:
        if tool_name == "get_platform_stats":
            from tutorial.models import Tutorial
            from manual.models import Manual
            from courses.models import Course
            from sectors.models import Sector
            from tags.models import Tag

            result = {
                "tutoriais": Tutorial.objects.count(),
                "tutoriais_ativos": Tutorial.objects.filter(is_active=True).count(),
                "manuais": Manual.objects.count(),
                "cursos": Course.objects.count(),
                "setores": Sector.objects.count(),
                "tags": Tag.objects.count(),
            }
            return json.dumps(result, ensure_ascii=False)

        elif tool_name == "search_tutorials":
            from tutorial.models import Tutorial
            from django.db.models import Q

            qs = Tutorial.objects.select_related("sector").prefetch_related("tags")
            query = tool_args.get("query", "")
            sector = tool_args.get("sector", "")
            tag = tool_args.get("tag", "")
            limit = min(int(tool_args.get("limit", 10)), 20)

            if query:
                qs = qs.filter(Q(title__icontains=query) | Q(description__icontains=query))
            if sector:
                qs = qs.filter(sector__name__icontains=sector)
            if tag:
                qs = qs.filter(tags__name__icontains=tag)

            results = [
                {
                    "titulo": t.title,
                    "setor": t.sector.name if t.sector else None,
                    "tags": [tag.name for tag in t.tags.all()],
                    "passos": t.steps.count() if hasattr(t, "steps") else 0,
                    "ativo": t.is_active,
                }
                for t in qs[:limit]
            ]
            return json.dumps({"total": len(results), "resultados": results}, ensure_ascii=False)

        elif tool_name == "search_manuals":
            from manual.models import Manual

            qs = Manual.objects.all()
            query = tool_args.get("query", "")
            limit = min(int(tool_args.get("limit", 10)), 20)

            if query:
                qs = qs.filter(title__icontains=query)

            results = [
                {"titulo": m.title, "criado_em": m.created_at.strftime("%d/%m/%Y")}
                for m in qs[:limit]
            ]
            return json.dumps({"total": len(results), "resultados": results}, ensure_ascii=False)

        elif tool_name == "search_courses":
            from courses.models import Course

            qs = Course.objects.all()
            query = tool_args.get("query", "")
            limit = min(int(tool_args.get("limit", 10)), 20)

            if query:
                qs = qs.filter(name__icontains=query)

            results = [
                {
                    "titulo": c.name,
                    "descricao": (c.description or "")[:120],
                    "criado_em": c.created_at.strftime("%d/%m/%Y"),
                }
                for c in qs[:limit]
            ]
            return json.dumps({"total": len(results), "resultados": results}, ensure_ascii=False)

        elif tool_name == "get_sectors":
            from sectors.models import Sector

            sectors = list(Sector.objects.values_list("name", flat=True).order_by("name"))
            return json.dumps({"setores": sectors}, ensure_ascii=False)

        elif tool_name == "get_tags":
            from tags.models import Tag

            tags = [{"nome": t.name, "cor": t.color} for t in Tag.objects.order_by("name")]
            return json.dumps({"tags": tags}, ensure_ascii=False)

        else:
            return json.dumps({"erro": f"Ferramenta '{tool_name}' não reconhecida."})

    except Exception as e:
        return json.dumps({"erro": str(e)})


# ---------------------------------------------------------------------------
# Motor de IA — loop com tool calling
# ---------------------------------------------------------------------------

def _get_ai_response(messages_history: list[dict], user_message: str) -> str:
    """Envia mensagens para a OpenAI com suporte a tool calling e retorna a resposta final."""
    api_key = getattr(settings, "OPENAI_API_KEY", None) or os.environ.get("OPENAI_API_KEY")

    if not api_key:
        return (
            "⚠️ Alice não está configurada. "
            "Defina a variável de ambiente **OPENAI_API_KEY** no servidor para ativá-la."
        )

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)

        messages = [{"role": "system", "content": ALICE_SYSTEM_PROMPT}]
        messages.extend(messages_history)
        messages.append({"role": "user", "content": user_message})

        # Loop de tool calling — máximo 5 iterações para evitar loops infinitos
        for _ in range(5):
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                tools=ALICE_TOOLS,
                tool_choice="auto",
                max_tokens=1500,
                temperature=0.7,
            )

            choice = response.choices[0]

            # Se não há tool calls, retorna a resposta final
            if not choice.message.tool_calls:
                return choice.message.content.strip()

            # Executa as ferramentas solicitadas
            messages.append(choice.message)

            for tool_call in choice.message.tool_calls:
                tool_name = tool_call.function.name
                tool_args = json.loads(tool_call.function.arguments or "{}")
                tool_result = _execute_tool(tool_name, tool_args)

                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": tool_result,
                })

        # Se chegou ao limite de iterações, faz chamada final sem tools
        final = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=1500,
            temperature=0.7,
        )
        return final.choices[0].message.content.strip()

    except Exception as e:
        return f"Erro ao processar sua mensagem: {str(e)}"


# ---------------------------------------------------------------------------
# Views
# ---------------------------------------------------------------------------

class AliceChatView(APIView):
    """Endpoint principal de chat com a Alice."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        message = request.data.get("message", "").strip()
        session_id_str = request.data.get("session_id")
        create_new = request.data.get("create_new_session", False)

        if not message:
            return Response(
                {"success": False, "error": "Mensagem não pode ser vazia."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Recupera ou cria sessão
        session = None
        if session_id_str and not create_new:
            try:
                session = ConversationSession.objects.get(
                    session_id=session_id_str, user=request.user
                )
            except ConversationSession.DoesNotExist:
                pass

        if session is None:
            session = ConversationSession.objects.create(user=request.user)

        # Carrega histórico (últimas 20 mensagens para não estourar contexto)
        history = [
            {"role": msg.role, "content": msg.content}
            for msg in session.messages.order_by("-created_at")[:20][::-1]
        ]

        start = time.time()
        ai_response = _get_ai_response(history, message)
        elapsed_ms = int((time.time() - start) * 1000)

        # Persiste as mensagens
        Message.objects.create(session=session, role="user", content=message)
        Message.objects.create(session=session, role="assistant", content=ai_response)

        # Define título da sessão com base na primeira mensagem
        if session.message_count <= 2 and session.title == "Nova conversa":
            session.title = message[:80]
            session.save(update_fields=["title"])

        return Response({
            "success": True,
            "session_id": str(session.session_id),
            "response": ai_response,
            "execution_time_ms": elapsed_ms,
            "sql_query": None,
            "result_count": None,
            "error": None,
        })


class AliceQuickView(APIView):
    """Pergunta rápida sem histórico de sessão."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        question = request.data.get("question", "").strip()
        if not question:
            return Response(
                {"success": False, "error": "Pergunta não pode ser vazia."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        start = time.time()
        ai_response = _get_ai_response([], question)
        elapsed_ms = int((time.time() - start) * 1000)

        return Response({
            "success": True,
            "response": ai_response,
            "execution_time_ms": elapsed_ms,
            "error": None,
        })


class AliceSessionListView(APIView):
    """Lista sessões de conversa do usuário autenticado."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = ConversationSession.objects.filter(user=request.user).order_by("-updated_at")
        results = [
            {
                "id": s.id,
                "session_id": str(s.session_id),
                "title": s.title,
                "is_active": s.is_active,
                "message_count": s.message_count,
                "created_at": s.created_at.isoformat(),
                "updated_at": s.updated_at.isoformat(),
            }
            for s in sessions
        ]
        return Response({"results": results})


class AliceSessionDetailView(APIView):
    """Detalhes de uma sessão específica com suas mensagens."""

    permission_classes = [IsAuthenticated]

    def get(self, request, session_pk):
        try:
            session = ConversationSession.objects.get(pk=session_pk, user=request.user)
        except ConversationSession.DoesNotExist:
            return Response({"detail": "Sessão não encontrada."}, status=status.HTTP_404_NOT_FOUND)

        messages = [
            {"role": m.role, "content": m.content, "created_at": m.created_at.isoformat()}
            for m in session.messages.all()
        ]
        return Response({
            "id": session.id,
            "session_id": str(session.session_id),
            "title": session.title,
            "is_active": session.is_active,
            "message_count": session.message_count,
            "created_at": session.created_at.isoformat(),
            "updated_at": session.updated_at.isoformat(),
            "messages": messages,
        })


class AliceSessionSendView(APIView):
    """Envia mensagem para uma sessão existente pelo ID numérico."""

    permission_classes = [IsAuthenticated]

    def post(self, request, session_pk):
        try:
            session = ConversationSession.objects.get(pk=session_pk, user=request.user)
        except ConversationSession.DoesNotExist:
            return Response({"detail": "Sessão não encontrada."}, status=status.HTTP_404_NOT_FOUND)

        message = request.data.get("message", "").strip()
        if not message:
            return Response(
                {"success": False, "error": "Mensagem não pode ser vazia."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        history = [
            {"role": m.role, "content": m.content}
            for m in session.messages.order_by("-created_at")[:20][::-1]
        ]

        start = time.time()
        ai_response = _get_ai_response(history, message)
        elapsed_ms = int((time.time() - start) * 1000)

        Message.objects.create(session=session, role="user", content=message)
        Message.objects.create(session=session, role="assistant", content=ai_response)

        return Response({
            "success": True,
            "session_id": str(session.session_id),
            "response": ai_response,
            "execution_time_ms": elapsed_ms,
            "sql_query": None,
            "result_count": None,
            "error": None,
        })


class AliceSessionClearView(APIView):
    """Remove todas as mensagens de uma sessão."""

    permission_classes = [IsAuthenticated]

    def post(self, request, session_pk):
        try:
            session = ConversationSession.objects.get(pk=session_pk, user=request.user)
        except ConversationSession.DoesNotExist:
            return Response({"detail": "Sessão não encontrada."}, status=status.HTTP_404_NOT_FOUND)

        session.messages.all().delete()
        return Response({"success": True, "message": "Histórico da sessão removido."})


class AliceStatsView(APIView):
    """Estatísticas de uso da Alice."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = ConversationSession.objects.filter(user=request.user)
        total_messages = Message.objects.filter(session__user=request.user).count()

        return Response({
            "total_sessions": sessions.count(),
            "active_sessions": sessions.filter(is_active=True).count(),
            "total_messages": total_messages,
            "total_queries": total_messages // 2,
            "successful_queries": total_messages // 2,
            "average_response_time": 0,
            "most_active_user": request.user.email,
            "popular_questions": [],
        })


class AliceSchemaTablesView(APIView):
    """Lista os tipos de conteúdo disponíveis na plataforma."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(["tutoriais", "manuais", "cursos", "setores", "tags", "usuarios"])


class AliceSchemaView(APIView):
    """Descreve a estrutura de conteúdo da plataforma."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response([
            {"type": "tutoriais", "description": "Guias passo a passo com mídia e anotações"},
            {"type": "manuais", "description": "Documentos PDF organizados por setor"},
            {"type": "cursos", "description": "Trilhas de aprendizado com provas e certificados"},
            {"type": "setores", "description": "Unidades organizacionais para categorização"},
            {"type": "tags", "description": "Marcadores temáticos com cor personalizada"},
        ])
