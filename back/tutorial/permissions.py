from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permissão customizada para tutoriais.
    Permite leitura de tutoriais ativos para todos.
    Apenas o criador ou staff pode editar/deletar.
    """

    def has_permission(self, request, view):
        # Leitura é permitida para todos
        if request.method in permissions.SAFE_METHODS:
            return True

        # Criação e demais métodos requerem autenticação
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Tutoriais ativos podem ser lidos por qualquer pessoa
        if request.method in permissions.SAFE_METHODS:
            if obj.is_active:
                return True
            # Tutoriais inativos só podem ser vistos pelo criador ou staff
            return request.user and (obj.created_by == request.user or request.user.is_staff)

        # Escrita apenas para criador ou staff
        return request.user and (obj.created_by == request.user or request.user.is_staff)


class IsOwnerOrStaff(permissions.BasePermission):
    """
    Permissão para passos e mídias de tutoriais.
    Apenas o criador do tutorial pai ou staff pode acessar/editar.
    """

    def has_object_permission(self, request, view, obj):
        # Obter o tutorial pai
        if hasattr(obj, 'tutorial'):
            tutorial = obj.tutorial
        elif hasattr(obj, 'step'):
            tutorial = obj.step.tutorial
        else:
            return False

        # Acesso apenas para criador ou staff
        return request.user and (tutorial.created_by == request.user or request.user.is_staff)
