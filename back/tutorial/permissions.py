from rest_framework import permissions


class IsAuthorOrStaffOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow authors or staff to edit tutorials.
    Read-only permissions are allowed for published tutorials.
    """

    def has_permission(self, request, view):
        # Allow authenticated users to create
        if request.method == 'POST':
            return request.user and request.user.is_authenticated

        # Allow read for everyone (will check object permission for unpublished)
        if request.method in permissions.SAFE_METHODS:
            return True

        # Require authentication for other methods
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Read permissions for published tutorials
        if request.method in permissions.SAFE_METHODS:
            # Allow if published, or if user is author/staff
            if obj.is_published:
                return True
            return request.user and (obj.author == request.user or request.user.is_staff)

        # Write permissions only for author or staff
        return request.user and (obj.author == request.user or request.user.is_staff)


class IsStaffOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow staff to create/edit.
    Read permissions are allowed to everyone.
    """

    def has_permission(self, request, view):
        # Read permissions for everyone
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions only for staff
        return request.user and request.user.is_staff


class IsAuthorOrStaff(permissions.BasePermission):
    """
    Permission to only allow authors of a tutorial or staff to access/edit.
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

        # Allow access if user is author or staff
        return request.user and (tutorial.author == request.user or request.user.is_staff)
