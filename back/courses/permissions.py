from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission para permitir apenas o criador editar/deletar.
    Administradores têm acesso total.
    """

    def has_permission(self, request, view):
        # Sempre permitir listagem e visualização
        if request.method in permissions.SAFE_METHODS:
            return True

        # Para criar, usuário precisa estar autenticado
        if request.method == 'POST':
            return request.user and request.user.is_authenticated

        return True

    def has_object_permission(self, request, view, obj):
        # Leitura é permitida para todos
        if request.method in permissions.SAFE_METHODS:
            return True

        # Administradores têm acesso total
        if request.user.is_staff or request.user.is_superuser:
            return True

        # Verificar se o objeto tem o campo created_by
        if hasattr(obj, 'created_by'):
            # Apenas o criador pode editar/deletar
            return obj.created_by == request.user.email

        # Se não tiver created_by, permitir apenas admins
        return False


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permissão para ações que apenas admins podem executar.
    """

    def has_permission(self, request, view):
        # Leitura é permitida para todos
        if request.method in permissions.SAFE_METHODS:
            return True

        # Apenas admins podem criar/editar/deletar
        return request.user and (request.user.is_staff or request.user.is_superuser)
