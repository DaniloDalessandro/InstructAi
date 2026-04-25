from django.urls import path
from . import views

urlpatterns = [
    path("", views.DocumentListView.as_view(), name="document-list"),
    path("<int:pk>/", views.DocumentDetailView.as_view(), name="document-detail"),
    path("<int:pk>/chunks/", views.DocumentChunksView.as_view(), name="document-chunks"),
    path("<int:pk>/reprocess/", views.reprocess_view, name="document-reprocess"),
    path("stats/", views.stats_view, name="document-stats"),
]
