from django.urls import path
from . import views

urlpatterns = [
    path("stream/", views.AliceStreamView.as_view(), name="alice-stream"),
    path("sessions/", views.SessionListView.as_view(), name="alice-sessions"),
    path("sessions/<uuid:session_id>/", views.SessionDetailView.as_view(), name="alice-session-detail"),
]
