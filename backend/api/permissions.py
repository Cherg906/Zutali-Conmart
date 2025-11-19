"""
Custom permissions for Zutali Conmart API.
"""
from rest_framework import permissions


class IsProductOwner(permissions.BasePermission):
    """
    Permission to only allow product owners to access certain views.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'product_owner' and
            hasattr(request.user, 'product_owner_profile')
        )


class IsAdmin(permissions.BasePermission):
    """
    Permission to only allow admins to access certain views.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'admin'
        )


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Object-level permission to only allow owners to edit objects.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed for any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions only for the owner
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'owner'):
            return obj.owner.user == request.user
        
        return False


class IsProductOwnerOfProduct(permissions.BasePermission):
    """
    Permission to check if user is the owner of the product.
    """
    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'owner'):
            return (
                hasattr(request.user, 'product_owner_profile') and
                obj.owner == request.user.product_owner_profile
            )
        return False
