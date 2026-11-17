import json
import logging

from django.http import StreamingHttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, serializers as s
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiResponse, inline_serializer
from drf_spectacular.types import OpenApiTypes

from .models import ConversationSession, Message
from .services.alice_agent import stream_alice

logger = logging.getLogger(__name__)


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


_alice_request = inline_serializer("AliceChatRequest", {
    "message": s.CharField(help_text="Mensagem do usuário"),
    "session_id": s.UUIDField(required=False, help_text="UUID da sessão existente (omitir para nova sessão)"),
    "create_new_session": s.BooleanField(required=False, default=False),
})

_session_summary = inline_serializer("SessionSummary", {
    "session_id": s.UUIDField(),
    "title": s.CharField(),
    "updated_at": s.DateTimeField(),
    "message_count": s.IntegerField(),
})

_session_detail = inline_serializer("SessionDetail", {
    "session_id": s.UUIDField(),
    "title": s.CharField(),
    "messages": inline_serializer("SessionMessage", {
        "role": s.ChoiceField(choices=["user", "assistant"]),
        "content": s.CharField(),
        "created_at": s.DateTimeField(),
    }, many=True),
})

_detail_msg = inline_serializer("AgentDetailMsg", {"detail": s.CharField()})


@extend_schema_view(
    post=extend_schema(
        tags=["Alice"],
        summary="Chat com Alice — streaming SSE",
        description=(
            "Envia uma mensagem para a Alice e recebe a resposta como `text/event-stream`.\n\n"
            "Cada evento SSE tem formato `data: <JSON>\\n\\n`. Tipos de evento:\n"
            "- `{\"type\": \"session\", \"session_id\": \"<uuid>\"}` — enviado imediatamente\n"
            "- `{\"type\": \"token\", \"content\": \"...\"}` — fragmento de texto\n"
            "- `{\"type\": \"tool_start\", \"tool\": \"<nome>\"}` — ferramenta RAG acionada\n"
            "- `{\"type\": \"done\", \"full_response\": \"...\"}` — fim do stream\n"
            "- `{\"type\": \"error\", \"message\": \"...\"}` — erro"
        ),
        request=_alice_request,
        responses={200: OpenApiResponse(description="text/event-stream SSE"), 400: _detail_msg},
    )
)
class AliceStreamView(APIView):
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


@extend_schema_view(
    get=extend_schema(
        tags=["Alice"],
        summary="Lista sessões do usuário (últimas 50)",
        responses={200: inline_serializer("SessionSummaryList", {
            "session_id": s.UUIDField(),
            "title": s.CharField(),
            "updated_at": s.DateTimeField(),
            "message_count": s.IntegerField(),
        }, many=True)},
    ),
    delete=extend_schema(
        tags=["Alice"],
        operation_id="sessions_delete_all",
        summary="Apaga todo o histórico de conversas do usuário",
        responses={204: None},
    ),
)
class SessionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = (
            ConversationSession.objects
            .filter(user=request.user, is_active=True)
            .order_by("-updated_at")[:50]
        )
        data = [
            {
                "session_id": str(s.session_id),
                "title": s.title,
                "updated_at": s.updated_at.isoformat(),
                "message_count": s.message_count,
            }
            for s in sessions
        ]
        return Response(data)

    def delete(self, request):
        ConversationSession.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(
    get=extend_schema(
        tags=["Alice"],
        summary="Retorna mensagens de uma sessão",
        responses={200: _session_detail, 404: _detail_msg},
    ),
    delete=extend_schema(
        tags=["Alice"],
        summary="Apaga uma sessão",
        responses={204: None, 404: _detail_msg},
    ),
)
class SessionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        try:
            session = ConversationSession.objects.get(
                session_id=session_id, user=request.user
            )
        except ConversationSession.DoesNotExist:
            return Response({"detail": "Sessão não encontrada."}, status=status.HTTP_404_NOT_FOUND)

        messages = session.messages.order_by("created_at").values("role", "content", "created_at")
        return Response({
            "session_id": str(session.session_id),
            "title": session.title,
            "messages": list(messages),
        })

    def delete(self, request, session_id):
        try:
            session = ConversationSession.objects.get(
                session_id=session_id, user=request.user
            )
        except ConversationSession.DoesNotExist:
            return Response({"detail": "Sessão não encontrada."}, status=status.HTTP_404_NOT_FOUND)
        session.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
