"""
Sistema central de permissões do InstructAI.

Hierarquia de acesso (do mais restrito ao mais amplo):
  1. Leitura pública           — qualquer usuário autenticado
  2. Escrita do dono           — owner do conteúdo
  3. Escrita do admin delegado — usuário em shared_admins
  4. Admin do sistema          — is_staff ou is_superuser (acesso total)

Uso nas views:
    permission_classes = [IsAuthenticated, ContentPermission]
"""
from rest_framework.permissions import BasePermission, SAFE_METHODS


# ── Helpers ──────────────────────────────────────────────────────────────────

def _get_owner(obj):
    """Retorna o owner do objeto (suporta FK `owner` e FK `created_by`)."""
    # Campo owner explícito (Manual, Course)
    if hasattr(obj, "owner") and obj.owner_id is not None:
        return obj.owner
    # Tutorial usa created_by como FK para User
    created_by = getattr(obj, "created_by", None)
    if created_by and hasattr(created_by, "pk"):
        return created_by
    return None


def _is_owner(user, obj):
    owner = _get_owner(obj)
    return owner is not None and owner.pk == user.pk


def _is_delegated_admin(user, obj):
    if hasattr(obj, "shared_admins"):
        return obj.shared_admins.filter(pk=user.pk).exists()
    return False


def _is_system_admin(user):
    return bool(user and user.is_authenticated and (user.is_staff or user.is_superuser))


def _can_write(user, obj):
    """True se o usuário pode editar o objeto."""
    if not user or not user.is_authenticated:
        return False
    return _is_system_admin(user) or _is_owner(user, obj) or _is_delegated_admin(user, obj)


def _can_delete(user, obj):
    """Apenas owner e system admin podem excluir."""
    if not user or not user.is_authenticated:
        return False
    return _is_system_admin(user) or _is_owner(user, obj)


def _can_manage_access(user, obj):
    """Apenas owner e system admin podem gerenciar quem tem acesso."""
    if not user or not user.is_authenticated:
        return False
    return _is_system_admin(user) or _is_owner(user, obj)


def get_user_permissions(user, obj) -> dict:
    """
    Retorna dict de permissões do usuário para um objeto.
    Usado pelos serializers para expor flags ao frontend.
    """
    if not user or not user.is_authenticated:
        return {"can_edit": False, "can_delete": False, "can_manage_access": False}
    return {
        "can_edit": _can_write(user, obj),
        "can_delete": _can_delete(user, obj),
        "can_manage_access": _can_manage_access(user, obj),
    }


# ── DRF Permission Classes ────────────────────────────────────────────────────

class IsSystemAdmin(BasePermission):
    """Acesso total — apenas is_staff ou is_superuser."""
    message = "Apenas administradores do sistema têm acesso."

    def has_permission(self, request, view):
        return _is_system_admin(request.user)

    def has_object_permission(self, request, view, obj):
        return _is_system_admin(request.user)


class IsOwner(BasePermission):
    """Somente o dono do objeto tem acesso."""
    message = "Somente o proprietário do conteúdo pode realizar esta ação."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        return _is_owner(request.user, obj)


class IsOwnerOrDelegatedAdmin(BasePermission):
    """Dono ou admin delegado têm acesso de escrita."""
    message = "Apenas o proprietário ou administrador delegado pode realizar esta ação."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        return _is_owner(request.user, obj) or _is_delegated_admin(request.user, obj)


class ContentPermission(BasePermission):
    """
    Permissão principal para conteúdo (Manual, Tutorial, Curso).

    GET/HEAD/OPTIONS → qualquer autenticado
    POST              → qualquer autenticado
    PUT/PATCH         → owner, delegated admin, system admin
    DELETE            → owner, system admin (delegado NÃO pode excluir)
    """
    message = "Você não tem permissão para realizar esta ação neste conteúdo."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return True

    def has_object_permission(self, request, view, obj):
        user = request.user

        # Leitura — qualquer autenticado
        if request.method in SAFE_METHODS:
            return True

        # Admin do sistema — acesso total
        if _is_system_admin(user):
            return True

        # DELETE — somente owner
        if request.method == "DELETE":
            return _is_owner(user, obj)

        # PUT / PATCH — owner ou delegado
        return _is_owner(user, obj) or _is_delegated_admin(user, obj)


class CanManageAccess(BasePermission):
    """
    Permissão para gerenciar shared_admins (concessão/revogação).
    Apenas o owner ou system admin.
    Delegado NÃO pode promover outros.
    """
    message = "Somente o proprietário pode gerenciar os acessos deste conteúdo."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        return _can_manage_access(request.user, obj)


# ── Step / Media (objetos filhos) ─────────────────────────────────────────────

class ChildObjectPermission(BasePermission):
    """
    Para TutorialStep e TutorialMedia — verifica permissão no tutorial pai.
    """
    message = "Você não tem permissão para modificar este conteúdo."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True

        # Sobe até o tutorial pai
        if hasattr(obj, "tutorial"):
            parent = obj.tutorial
        elif hasattr(obj, "step"):
            parent = obj.step.tutorial
        else:
            return False

        user = request.user
        if _is_system_admin(user):
            return True
        if request.method == "DELETE":
            return _is_owner(user, parent)
        return _is_owner(user, parent) or _is_delegated_admin(user, parent)
