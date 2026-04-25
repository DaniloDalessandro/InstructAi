"""
Views da Alice — chat síncrono e streaming SSE.
"""
import json
import time
import logging

from django.http import StreamingHttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import ConversationSession, Message
from .services.alice_agent import run_alice, stream_alice

logger = logging.getLogger(__name__)


# ── Helpers ─────────────────────────────────────────────────────────────────

def _get_or_create_session(user, session_id_str=None, create_new=False):
    """Retorna sessão existente ou cria nova."""
    if session_id_str and not create_new:
        try:
            return ConversationSession.objects.get(
                session_id=session_id_str, user=user
            )
        except ConversationSession.DoesNotExist:
            pass
    return ConversationSession.objects.create(user=user)


def _load_history(session):
    """Carrega histórico da sessão como lista de dicts."""
    return [
        {"role": msg.role, "content": msg.content}
        for msg in session.messages.order_by("-created_at")[:20][::-1]
    ]


def _persist_messages(session, user_message: str, ai_response: str):
    """Salva par de mensagens e atualiza título se for a primeira."""
    Message.objects.create(session=session, role="user", content=user_message)
    Message.objects.create(session=session, role="assistant", content=ai_response)

    if session.message_count <= 2 and session.title == "Nova conversa":
        session.title = user_message[:80]
        session.save(update_fields=["title"])


# ── Views ────────────────────────────────────────────────────────────────────

class AliceChatView(APIView):
    """Chat síncrono — retorna resposta completa."""
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

        session = _get_or_create_session(request.user, session_id_str, create_new)
        history = _load_history(session)

        start = time.time()
        result = run_alice(message, history)
        elapsed_ms = int((time.time() - start) * 1000)

        ai_response = result["response"]
        _persist_messages(session, message, ai_response)

        return Response({
            "success": result["success"],
            "session_id": str(session.session_id),
            "response": ai_response,
            "sources": result.get("sources", []),
            "execution_time_ms": elapsed_ms,
            "error": None if result["success"] else ai_response,
        })


class AliceStreamView(APIView):
    """
    Chat com streaming SSE.
    Retorna text/event-stream com tokens em tempo real.
    """
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

        session = _get_or_create_session(request.user, session_id_str, create_new)
        history = _load_history(session)

        collected_tokens = []

        def sse_generator():
            nonlocal collected_tokens
            # Envia session_id imediatamente
            yield f"data: {json.dumps({'type': 'session', 'session_id': str(session.session_id)})}\n\n"

            for event in stream_alice(message, history):
                # Coleta tokens para persistir ao final
                try:
                    payload = json.loads(event.replace("data: ", "").strip())
                    if payload.get("type") == "token":
                        collected_tokens.append(payload.get("content", ""))
                    elif payload.get("type") == "done":
                        full = payload.get("full_response", "".join(collected_tokens))
                        _persist_messages(session, message, full)
                except Exception:
                    pass
                yield event

        response = StreamingHttpResponse(
            sse_generator(),
            content_type="text/event-stream",
        )
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        response["Access-Control-Allow-Origin"] = "*"
        return response


class AliceQuickView(APIView):
    """Pergunta rápida sem sessão."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        question = request.data.get("question", "").strip()
        if not question:
            return Response(
                {"success": False, "error": "Pergunta não pode ser vazia."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        start = time.time()
        result = run_alice(question, [])
        elapsed_ms = int((time.time() - start) * 1000)

        return Response({
            "success": result["success"],
            "response": result["response"],
            "sources": result.get("sources", []),
            "execution_time_ms": elapsed_ms,
            "error": None if result["success"] else result["response"],
        })


class AliceSessionListView(APIView):
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

        history = _load_history(session)
        start = time.time()
        result = run_alice(message, history)
        elapsed_ms = int((time.time() - start) * 1000)

        _persist_messages(session, message, result["response"])

        return Response({
            "success": result["success"],
            "session_id": str(session.session_id),
            "response": result["response"],
            "execution_time_ms": elapsed_ms,
        })


class AliceSessionClearView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_pk):
        try:
            session = ConversationSession.objects.get(pk=session_pk, user=request.user)
        except ConversationSession.DoesNotExist:
            return Response({"detail": "Sessão não encontrada."}, status=status.HTTP_404_NOT_FOUND)

        session.messages.all().delete()
        return Response({"success": True, "message": "Histórico da sessão removido."})


class AliceStatsView(APIView):
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
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(["tutoriais", "manuais", "cursos", "setores", "tags", "usuarios"])


class AliceSchemaView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response([
            {"type": "tutoriais", "description": "Guias passo a passo com mídia e anotações"},
            {"type": "manuais", "description": "Documentos PDF organizados por setor"},
            {"type": "cursos", "description": "Trilhas de aprendizado com provas e certificados"},
            {"type": "setores", "description": "Unidades organizacionais para categorização"},
            {"type": "tags", "description": "Marcadores temáticos com cor personalizada"},
        ])
