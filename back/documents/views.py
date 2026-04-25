from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response

from .models import KnowledgeDocument, DocumentChunk
from .serializers import (
    KnowledgeDocumentSerializer,
    KnowledgeDocumentUploadSerializer,
    DocumentChunkSerializer,
)
from .tasks import process_document, reprocess_document


class DocumentListView(generics.ListCreateAPIView):
    """Lista todos os documentos e permite upload de novos."""
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return KnowledgeDocumentUploadSerializer
        return KnowledgeDocumentSerializer

    def get_queryset(self):
        qs = KnowledgeDocument.objects.prefetch_related("logs")
        status_filter = self.request.query_params.get("status")
        source_type = self.request.query_params.get("source_type")
        if status_filter:
            qs = qs.filter(status=status_filter)
        if source_type:
            qs = qs.filter(source_type=source_type)
        return qs

    def perform_create(self, serializer):
        doc = serializer.save(created_by=self.request.user)
        # Dispara indexação assíncrona
        process_document.delay(doc.id)


class DocumentDetailView(generics.RetrieveDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = KnowledgeDocumentSerializer
    queryset = KnowledgeDocument.objects.prefetch_related("logs", "chunks")


class DocumentChunksView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DocumentChunkSerializer

    def get_queryset(self):
        return DocumentChunk.objects.filter(
            document_id=self.kwargs["pk"]
        ).order_by("chunk_index")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reprocess_view(request, pk):
    """Força reprocessamento de um documento."""
    try:
        doc = KnowledgeDocument.objects.get(pk=pk)
    except KnowledgeDocument.DoesNotExist:
        return Response({"detail": "Não encontrado."}, status=status.HTTP_404_NOT_FOUND)
    reprocess_document.delay(doc.id)
    return Response({"detail": "Reprocessamento iniciado.", "document_id": doc.id})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def stats_view(request):
    """Estatísticas do knowledge base."""
    from django.db.models import Count, Sum
    from django.db.models.functions import TruncDate

    qs = KnowledgeDocument.objects.values("status").annotate(total=Count("id"))
    by_type = KnowledgeDocument.objects.values("source_type").annotate(total=Count("id"))
    total_chunks = DocumentChunk.objects.count()

    return Response({
        "by_status": list(qs),
        "by_type": list(by_type),
        "total_documents": KnowledgeDocument.objects.count(),
        "total_chunks": total_chunks,
        "indexed_documents": KnowledgeDocument.objects.filter(status="indexed").count(),
    })
