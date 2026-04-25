from rest_framework import serializers
from .models import KnowledgeDocument, DocumentChunk, ProcessingLog


class ProcessingLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcessingLog
        fields = ["id", "level", "message", "created_at"]


class DocumentChunkSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentChunk
        fields = ["id", "chunk_index", "page_number", "token_count", "content"]


class KnowledgeDocumentSerializer(serializers.ModelSerializer):
    logs = ProcessingLogSerializer(many=True, read_only=True)
    created_by_email = serializers.CharField(
        source="created_by.email", read_only=True, default=None
    )

    class Meta:
        model = KnowledgeDocument
        fields = [
            "id", "title", "source_type", "source_id", "status",
            "error_message", "chunk_count", "indexed_at",
            "created_at", "updated_at", "created_by_email",
            "doc_metadata", "logs",
        ]
        read_only_fields = [
            "status", "chunk_count", "indexed_at", "created_at", "updated_at",
        ]


class KnowledgeDocumentUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeDocument
        fields = ["title", "source_type", "file", "content_text", "doc_metadata"]
