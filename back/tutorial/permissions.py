from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow creators or staff to edit tutorials.
    Read-only permissions are allowed for active tutorials.
    """

    def has_permission(self, request, view):
        # Allow authenticated users to create
        if request.method == 'POST':
            return request.user and request.user.is_authenticated

        # Allow read for everyone (will check object permission for inactive)
        if request.method in permissions.SAFE_METHODS:
            return True

        # Require authentication for other methods
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Read permissions for active tutorials
        if request.method in permissions.SAFE_METHODS:
            # Allow if active, or if user is creator/staff
            if obj.is_active:
                return True
            return request.user and (obj.created_by == request.user or request.user.is_staff)

        # Write permissions only for creator or staff
        return request.user and (obj.created_by == request.user or request.user.is_staff)


class IsOwnerOrStaff(permissions.BasePermission):
    """
    Permission to only allow creators of a tutorial or staff to access/edit.
    Used for tutorial steps and media (inherits parent tutorial permission).
    """

    def has_object_permission(self, request, view, obj):
        # Get the parent tutorial
        if hasattr(obj, 'tutorial'):
            tutorial = obj.tutorial
        elif hasattr(obj, 'step'):
            tutorial = obj.step.tutorial
        else:
            return False

        # Allow access if user is creator or staff
        return request.user and (tutorial.created_by == request.user or request.user.is_staff)
