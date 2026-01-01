from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer
import logging

logger = logging.getLogger(__name__)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        logger.info(f"Login attempt - Data keys: {list(request.data.keys())}")
        logger.info(f"Login attempt - Has email: {'email' in request.data}")
        logger.info(f"Login attempt - Has password: {'password' in request.data}")
        return super().post(request, *args, **kwargs)
