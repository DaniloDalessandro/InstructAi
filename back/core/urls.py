"""
Configuração de URLs do projeto InstructAI.
Roteia requisições para os apps correspondentes.
"""

from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

admin.site.site_header = "InstructAI"
admin.site.site_title = "InstructAI Admin"
admin.site.index_title = "Painel de Administração"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/accounts/", include("accounts.urls")),
    path("api/v1/tutorials/", include("tutorial.urls")),
    path("api/v1/", include("tags.urls")),
    path("api/v1/", include("sectors.urls")),
    path("api/v1/", include("manual.urls")),
    path("api/v1/", include("courses.urls")),
    path("api/v1/alice/", include("agent.urls")),
    # OpenAPI schema + UI
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # Serve de arquivos de mídia (em produção usar nginx/S3)
    re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
]
