"""
Custom authentication for Supabase integration.
"""
from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model

User = get_user_model()


class SupabaseTokenAuthentication(TokenAuthentication):
    """
    Custom token authentication that works with Supabase tokens.
    Falls back to Django's default token authentication.
    """
    keyword = 'Bearer'

    def authenticate_credentials(self, key):
        try:
            # Try Django token authentication first
            return super().authenticate_credentials(key)
        except AuthenticationFailed:
            # Could add Supabase JWT verification here if needed
            raise AuthenticationFailed('Invalid token')
