from django.urls import path
from . import views

urlpatterns = [
    path("chat/", views.AliceChatView.as_view(), name="alice-chat"),
    path("quick/", views.AliceQuickView.as_view(), name="alice-quick"),
    path("stats/", views.AliceStatsView.as_view(), name="alice-stats"),
    path("sessions/", views.AliceSessionListView.as_view(), name="alice-sessions"),
    path("sessions/<int:session_pk>/", views.AliceSessionDetailView.as_view(), name="alice-session-detail"),
    path("sessions/<int:session_pk>/send/", views.AliceSessionSendView.as_view(), name="alice-session-send"),
    path("sessions/<int:session_pk>/clear/", views.AliceSessionClearView.as_view(), name="alice-session-clear"),
    path("schema/", views.AliceSchemaView.as_view(), name="alice-schema"),
    path("schema/tables/", views.AliceSchemaTablesView.as_view(), name="alice-schema-tables"),
]
