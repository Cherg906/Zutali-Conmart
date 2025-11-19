"""
Django REST Framework views for Zutali Conmart API.
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.reverse import reverse
from django.db.models import Q, Avg, Sum, Count, F
import logging
from django.utils import timezone
from django.utils import dateparse
from django.db import transaction as db_transaction
import uuid
import json
import os
from decimal import Decimal
from typing import Optional, List, Dict, Any
from urllib import request as urllib_request
from urllib.error import URLError, HTTPError
from django.core.mail import send_mail
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import UploadedFile
from django.conf import settings
from django.shortcuts import get_object_or_404
from datetime import datetime, timedelta
from django.utils.text import slugify
from django.http import HttpRequest
from .models import (
    User, ProductOwner, Category, Product, Quotation,
    Review, Message, Admin, VerificationRequest,
    SubscriptionPlan, Subscription, PaymentTransaction, Notification
)
from .serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer,
    ProductOwnerSerializer, CategorySerializer, ProductSerializer,
    QuotationSerializer, QuotationResponseSerializer, ReviewSerializer, MessageSerializer,
    AdminSerializer, VerificationRequestSerializer,
    SubscriptionPlanSerializer, SubscriptionSerializer, PaymentTransactionSerializer
)
from .permissions import IsProductOwner, IsAdmin, IsOwnerOrReadOnly, IsProductOwnerOfProduct
from .pagination import StandardResultsSetPagination, LargeResultsSetPagination
from .filters import ProductFilter, QuotationFilter, ReviewFilter
from rest_framework import serializers

logger = logging.getLogger(__name__)


def _parse_expiration_datetime(value: Optional[str]) -> Optional[datetime]:
    """Parse a datetime/date string into an aware datetime."""
    if not value:
        return None

    parsed = dateparse.parse_datetime(value)
    if parsed is None:
        # Try parsing a date-only value (YYYY-MM-DD)
        try:
            parsed = datetime.strptime(value, "%Y-%m-%d")
        except ValueError:
            raise serializers.ValidationError("Invalid expiration date format. Use ISO 8601 or YYYY-MM-DD.")

    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
    return parsed


def _calculate_validity_period_days(start: datetime, end: Optional[datetime], default: int = 365) -> int:
    if not end:
        return default
    delta_days = max((end - start).days, 0)
    return delta_days or default


def _build_document_entry(path: str, *, original_name: Optional[str] = None, label: Optional[str] = None) -> Dict[str, Any]:
    """Return a serializable payload for a stored document."""
    display_name = original_name or os.path.basename(path)
    try:
        url = default_storage.url(path)
    except Exception:  # pragma: no cover - fallback for storages without .url
        url = f"{settings.MEDIA_URL or ''}{path}"

    return {
        'name': display_name,
        'label': label or display_name,
        'path': path,
        'url': url,
    }


def _normalize_document_entries(value: Any) -> List[Dict[str, Any]]:
    """Convert stored document metadata into a uniform list structure."""
    if not value:
        return []

    entries: List[Dict[str, Any]] = []

    if isinstance(value, dict):
        # Prefer explicit files list if present
        files = value.get('files')
        if isinstance(files, list):
            for item in files:
                if isinstance(item, dict) and 'path' in item:
                    entries.append(_build_document_entry(
                        item['path'],
                        original_name=item.get('name'),
                        label=item.get('label')
                    ))
            if entries:
                return entries

        # Fallback legacy structure storing key -> path
        for key, stored in value.items():
            if not stored or key in {'files', 'primary_path'}:
                continue
            if isinstance(stored, str):
                entries.append(_build_document_entry(stored, label=key.replace('_', ' ').title()))
            elif isinstance(stored, list):
                for item in stored:
                    if isinstance(item, str):
                        entries.append(_build_document_entry(item, label=key.replace('_', ' ').title()))
                    elif isinstance(item, dict) and 'path' in item:
                        entries.append(_build_document_entry(
                            item['path'],
                            original_name=item.get('name'),
                            label=item.get('label') or key.replace('_', ' ').title()
                        ))
        return entries

    if isinstance(value, list):
        for item in value:
            if isinstance(item, dict) and 'path' in item:
                entries.append(_build_document_entry(
                    item['path'],
                    original_name=item.get('name'),
                    label=item.get('label')
                ))
            elif isinstance(item, str):
                entries.append(_build_document_entry(item))
        return entries

    if isinstance(value, str):
        return [_build_document_entry(value)]

    return entries


def _save_uploaded_file(subdir: str, prefix: str, upload: UploadedFile) -> str:
    """Persist an uploaded file under the verification directory."""
    base_name, ext = os.path.splitext(upload.name)
    safe_name = slugify(base_name) or 'document'
    timestamp = timezone.now().strftime('%Y%m%d%H%M%S%f')
    relative_path = os.path.join('verification', subdir, f"{prefix}_{timestamp}_{safe_name}{ext.lower()}")
    return default_storage.save(relative_path, upload)


def _save_uploaded_documents(subdir: str, prefix: str, uploads: List[UploadedFile]) -> List[Dict[str, Any]]:
    saved_entries: List[Dict[str, Any]] = []
    for upload in uploads:
        saved_path = _save_uploaded_file(subdir, prefix, upload)
        saved_entries.append(_build_document_entry(saved_path, original_name=upload.name))
    return saved_entries


def _absolute_media_url(path: str, request: Optional[HttpRequest] = None) -> str:
    url = default_storage.url(path)
    if request and not url.startswith('http'):
        return request.build_absolute_uri(url)
    if url.startswith('http'):
        return url
    base = settings.MEDIA_URL or ''
    if base.startswith('http'):
        return base.rstrip('/') + '/' + path.lstrip('/')
    return url


def _admin_documents_payload(documents: Any, request: Optional[HttpRequest] = None) -> Dict[str, Any]:
    normalized = _normalize_document_entries(documents)
    doc_urls: Dict[str, Optional[str]] = {}

    if isinstance(documents, dict):
        for key, value in documents.items():
            if isinstance(value, str):
                doc_urls[key] = _absolute_media_url(value, request)
            elif isinstance(value, dict) and 'path' in value:
                doc_urls[key] = _absolute_media_url(value['path'], request)
            else:
                doc_urls[key] = None

    # Ensure standard keys present
    for standard_key in ['trade_license', 'trade_registration', 'vat_registration', 'tin_certificate']:
        if standard_key not in doc_urls:
            doc_urls[standard_key] = None

    return {
        'entries': normalized,
        'urls': doc_urls,
    }


def _ensure_owner_verification_state(owner: ProductOwner, latest_request: Optional[VerificationRequest] = None) -> None:
    latest_request = latest_request or owner.verification_requests.order_by('-created_at').first()
    if not latest_request:
        return

    update_fields: List[str] = []

    if latest_request.status == 'approved':
        if owner.verification_status != 'verified':
            owner.verification_status = 'verified'
            update_fields.append('verification_status')

        target_verified_at = latest_request.approved_at or owner.verified_at or timezone.now()
        if owner.verified_at != target_verified_at:
            owner.verified_at = target_verified_at
            update_fields.append('verified_at')

        if latest_request.verification_expires_at and owner.verification_expires_at != latest_request.verification_expires_at:
            owner.verification_expires_at = latest_request.verification_expires_at
            update_fields.append('verification_expires_at')

        if latest_request.document_validity_period and owner.document_validity_period != latest_request.document_validity_period:
            owner.document_validity_period = latest_request.document_validity_period
            update_fields.append('document_validity_period')

    elif latest_request.status == 'pending':
        if owner.verification_status != 'pending':
            owner.verification_status = 'pending'
            update_fields.append('verification_status')

    elif latest_request.status == 'rejected':
        if owner.verification_status != 'rejected':
            owner.verification_status = 'rejected'
            update_fields.append('verification_status')
        if owner.verified_at is not None:
            owner.verified_at = None
            update_fields.append('verified_at')

    if update_fields:
        update_fields.append('updated_at')
        owner.save(update_fields=list(dict.fromkeys(update_fields)))


def _serialize_admin_verification_request(verification_request: VerificationRequest, request: Optional[HttpRequest] = None) -> Dict[str, Any]:
    owner = verification_request.product_owner

    # Ensure owner reflects latest request status (handles earlier partial updates)
    _ensure_owner_verification_state(owner, latest_request=verification_request)

    def owner_file_url(field: str) -> Optional[str]:
        file_field = getattr(owner, field, None)
        if file_field and getattr(file_field, 'name', None):
            try:
                return _absolute_media_url(file_field.name, request)
            except Exception:
                if hasattr(file_field, 'url'):
                    return request.build_absolute_uri(file_field.url) if request else file_field.url
        return None

    documents_payload = _admin_documents_payload(verification_request.documents, request)

    combined_documents = {
        'trade_license': owner_file_url('trade_license') or documents_payload['urls'].get('trade_license'),
        'trade_registration': owner_file_url('trade_registration') or documents_payload['urls'].get('trade_registration'),
        'vat_registration': owner_file_url('vat_registration') or documents_payload['urls'].get('vat_registration'),
        'tin_certificate': owner_file_url('tin_certificate') or documents_payload['urls'].get('tin_certificate'),
        'files': documents_payload['entries'],
    }

    has_prior_approvals = owner.verification_requests.filter(status='approved').exclude(id=verification_request.id).exists()

    return {
        'id': str(verification_request.id),
        'status': verification_request.status,
        'rejection_reason': verification_request.review_notes,
        'submitted_at': verification_request.created_at.isoformat() if verification_request.created_at else None,
        'approved_at': verification_request.approved_at.isoformat() if verification_request.approved_at else None,
        'verification_expires_at': verification_request.verification_expires_at.isoformat() if verification_request.verification_expires_at else None,
        'document_validity_period': verification_request.document_validity_period,
        'product_owner': {
            'id': str(owner.id),
            'business_name': owner.business_name,
            'phone_number': owner.business_phone or '',
            'verification_status': owner.verification_status,
            'tier': owner.tier,
            'user': {
                'username': owner.user.username,
                'email': owner.user.email,
                'first_name': owner.user.first_name,
                'last_name': owner.user.last_name,
            } if owner.user else None,
        },
        'verification_documents': combined_documents,
        'parent_verification': None,
        'child_verifications': [],
        'is_update': has_prior_approvals,
    }


def _user_verification_payload(user: User) -> dict:
    return {
        'status': user.verification_status,
        'verified_at': user.verified_at.isoformat() if user.verified_at else None,
        'verification_expires_at': user.verification_expires_at.isoformat() if user.verification_expires_at else None,
        'document_validity_period': user.document_validity_period,
        'rejection_reason': user.verification_rejection_reason,
        'can_update': user.verification_status != 'pending',
        'documents': _normalize_document_entries(user.verification_documents),
    }


def _serialize_verification_request(request_obj: VerificationRequest, owner: ProductOwner) -> dict:
    if not request_obj:
        return None

    has_prior_approvals = owner.verification_requests.filter(status='approved').exclude(id=request_obj.id).exists()

    return {
        'id': str(request_obj.id),
        'status': request_obj.status,
        'rejection_reason': request_obj.review_notes,
        'submitted_at': request_obj.created_at.isoformat() if request_obj.created_at else None,
        'approved_at': request_obj.approved_at.isoformat() if request_obj.approved_at else None,
        'verification_expires_at': request_obj.verification_expires_at.isoformat() if request_obj.verification_expires_at else None,
        'document_validity_period': request_obj.document_validity_period,
        'is_update': has_prior_approvals,
        'documents': _normalize_document_entries(request_obj.documents),
    }


DEFAULT_SUBSCRIPTION_PLANS = {
    'standard_user': {
        'role': 'user',
        'tier': 'standard',
        'display_name': 'Standard Verified',
        'amount': Decimal('50.00'),
        'currency': 'ETB',
        'duration_days': 30,
        'product_limit': None,
        'features': [
            'All Free features',
            '10 quotations/month',
            'Verified badge',
            'Priority support',
        ],
    },
    'premium_user': {
        'role': 'user',
        'tier': 'premium',
        'display_name': 'Premium Verified',
        'amount': Decimal('200.00'),
        'currency': 'ETB',
        'duration_days': 30,
        'product_limit': None,
        'features': [
            'All Standard features',
            'Unlimited quotations',
            'Direct messaging',
            'Premium support',
        ],
    },
    'standard_owner': {
        'role': 'product_owner',
        'tier': 'standard',
        'display_name': 'Standard Supplier',
        'amount': Decimal('200.00'),
        'currency': 'ETB',
        'duration_days': 30,
        'product_limit': 10,
        'features': [
            '10 product listings',
            'Advanced analytics',
            'Receive messages',
            'Priority support',
        ],
    },
    'premium_owner': {
        'role': 'product_owner',
        'tier': 'premium',
        'display_name': 'Premium Supplier',
        'amount': Decimal('500.00'),
        'currency': 'ETB',
        'duration_days': 30,
        'product_limit': None,
        'features': [
            'Unlimited products',
            'Premium analytics',
            'Receive messages',
            'Featured listings',
            '24/7 support',
        ],
    },
}


def ensure_subscription_plan(plan_code: str) -> Optional[SubscriptionPlan]:
    defaults = DEFAULT_SUBSCRIPTION_PLANS.get(plan_code)
    if not defaults:
        return None

    plan, created = SubscriptionPlan.objects.get_or_create(
        code=plan_code,
        defaults=defaults,
    )

    if not plan.is_active:
        plan.is_active = True
        plan.save(update_fields=['is_active', 'updated_at'])

    return plan


def _chapa_request(method: str, endpoint: str, payload: Optional[dict] = None, timeout: int = 30):
    """Minimal HTTP helper to communicate with Chapa without external dependencies."""
    if not settings.CHAPA_SECRET_KEY:
        raise RuntimeError("Chapa secret key is not configured")

    url = f"{settings.CHAPA_BASE_URL.rstrip('/')}/{endpoint.lstrip('/')}"
    data_bytes = None
    headers = {
        'Authorization': f"Bearer {settings.CHAPA_SECRET_KEY}",
        'Content-Type': 'application/json',
    }

    if payload is not None:
        data_bytes = json.dumps(payload).encode('utf-8')

    request_obj = urllib_request.Request(url, data=data_bytes, headers=headers, method=method.upper())

    try:
        with urllib_request.urlopen(request_obj, timeout=timeout) as response:
            body = response.read().decode('utf-8') or '{}'
            return response.getcode(), json.loads(body)
    except HTTPError as exc:
        body = exc.read().decode('utf-8') or '{}'
        try:
            error_payload = json.loads(body)
        except json.JSONDecodeError:
            error_payload = {'error': body}
        return exc.code, error_payload
    except URLError as exc:
        raise RuntimeError(f"Network error contacting Chapa: {exc.reason}") from exc


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Register a new user"""
    try:
        print(f"Registration attempt with data: {request.data}")
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, _ = Token.objects.get_or_create(user=user)
            
            # Create ProductOwner profile if role is product_owner
            if user.role == 'product_owner':
                ProductOwner.objects.create(
                    user=user,
                    business_name=request.data.get('business_name', ''),
                    business_description=request.data.get('business_description', ''),
                    business_address=request.data.get('business_address', '')
                )
            
            print(f"User created successfully: {user.username}")
            return Response({
                'token': token.key,
                'user': UserSerializer(user).data,
                'message': 'Registration successful'
            }, status=status.HTTP_201_CREATED)
        else:
            print(f"Serializer errors: {serializer.errors}")
            return Response({
                'errors': serializer.errors,
                'message': 'Registration failed - please check your input'
            }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        print(f"Registration error: {str(e)}")
        return Response({
            'error': str(e),
            'message': 'Registration failed - server error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """Login user"""
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data
        })

    errors = serializer.errors
    message = None

    if isinstance(errors, dict):
        # Prioritise explicit message keys first
        message_value = errors.get('message') or errors.get('detail')
        if message_value:
            message = message_value[0] if isinstance(message_value, list) else message_value
        elif 'non_field_errors' in errors:
            non_field_errors = errors['non_field_errors']
            if isinstance(non_field_errors, list) and non_field_errors:
                message = non_field_errors[0]
        else:
            # Fallback to the first available error message
            for value in errors.values():
                if isinstance(value, list) and value:
                    message = value[0]
                    break
                if isinstance(value, str):
                    message = value
                    break

    if message and hasattr(message, 'message'):
        message = message.message

    return Response({
        'error': 'Login failed',
        'message': message or 'Invalid credentials',
        'details': errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """Logout user"""
    request.user.auth_token.delete()
    return Response({'message': 'Successfully logged out'})


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
@parser_classes([JSONParser, MultiPartParser, FormParser])
def user_profile(request):
    """Get or update user profile"""
    user = request.user
    
    if request.method == 'GET':
        return Response(UserSerializer(user).data)
    
    elif request.method == 'PUT':
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_avatar(request):
    """Upload or update user avatar"""
    user = request.user

    avatar_file = request.FILES.get('avatar')
    if not avatar_file:
        return Response({'error': 'Avatar file is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user.avatar.save(avatar_file.name, avatar_file, save=True)
        serializer = UserSerializer(user)
        return Response({
            'message': 'Avatar updated successfully',
            'avatar': user.avatar.url if user.avatar else None,
            'user': serializer.data
        })
    except Exception as exc:
        return Response({'error': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Change user password"""
    user = request.user
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')

    if not current_password or not new_password:
        return Response(
            {'error': 'Current password and new password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Verify current password
    if not user.check_password(current_password):
        return Response(
            {'error': 'Current password is incorrect'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate new password length
    if len(new_password) < 8:
        return Response(
            {'error': 'New password must be at least 8 characters long'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Set new password
    user.set_password(new_password)
    user.save()

    return Response({'message': 'Password changed successfully'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_verification_document(request):
    """Upload verification document for regular users"""
    user = request.user

    uploaded_files = list(request.FILES.getlist('documents'))
    id_document = request.FILES.get('id_document')

    if id_document and id_document not in uploaded_files:
        uploaded_files.insert(0, id_document)

    if not uploaded_files:
        return Response(
            {'error': 'At least one document must be uploaded'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        saved_entries = _save_uploaded_documents('user_documents', f'user_{user.id}', uploaded_files)

        user.verification_documents = {'files': saved_entries}
        user.verification_status = 'pending'
        user.save(update_fields=['verification_documents', 'verification_status', 'updated_at'])

        serializer = UserSerializer(user)
        return Response({
            'message': 'Verification document uploaded successfully',
            'verification_status': user.verification_status,
            'user': serializer.data
        })
    except Exception as exc:
        return Response({'error': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def review_user_verification(request, user_id):
    """Admin reviews user verification request"""
    from .models import Admin
    
    # Check if user is admin
    if request.user.role != 'admin':
        return Response(
            {'error': 'Only admins can review user verifications'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        from .models import User
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except ValueError:
        return Response(
            {'error': 'Invalid user ID format'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    action = request.data.get('action')  # 'approve' or 'reject'
    rejection_reason = request.data.get('rejection_reason', '')
    
    if action not in ['approve', 'reject']:
        return Response(
            {'error': "Action must be 'approve' or 'reject'"},
            status=status.HTTP_400_BAD_REQUEST
        )

    admin_profile, _ = Admin.objects.get_or_create(user=request.user)

    verification_expiry_value = request.data.get('verification_expires_at') if action == 'approve' else None
    document_validity_value = request.data.get('document_validity_period') if action == 'approve' else None

    if action == 'approve':
        now = timezone.now()
        expires_at = _parse_expiration_datetime(verification_expiry_value) if verification_expiry_value else None

        if document_validity_value:
            try:
                validity_days = int(document_validity_value)
            except ValueError:
                return Response({'error': 'document_validity_period must be an integer number of days'}, status=status.HTTP_400_BAD_REQUEST)
            expires_at = now + timedelta(days=max(validity_days, 1))
        else:
            validity_days = _calculate_validity_period_days(now, expires_at, target_user.document_validity_period or 365)

        if expires_at is None:
            expires_at = target_user.verification_expires_at or (now + timedelta(days=target_user.document_validity_period or 365))
        else:
            validity_days = _calculate_validity_period_days(now, expires_at, target_user.document_validity_period or 365)

        target_user.verification_status = 'verified'
        target_user.verification_rejection_reason = None
        target_user.verified_at = now
        target_user.verification_expires_at = expires_at
        target_user.document_validity_period = validity_days
    else:
        target_user.verification_status = 'rejected'
        target_user.verification_rejection_reason = rejection_reason

    target_user.save(update_fields=[
        'verification_status',
        'verification_rejection_reason',
        'verified_at',
        'verification_expires_at',
        'document_validity_period',
        'updated_at',
    ])

    serializer = UserSerializer(target_user)
    return Response({
        'message': 'User verification {action}d successfully'.format(action=action),
        'user': serializer.data,
        'verification': _user_verification_payload(target_user)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_verification_status(request):
    """Get user verification status"""
    user = request.user
    return Response(_user_verification_payload(user))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def submit_user_verification(request):
    """Submit or update verification documents for regular users."""
    user = request.user

    id_document = request.FILES.get('id_document')
    if not id_document:
        return Response(
            {'error': 'ID document file is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    verification_expires_at = _parse_expiration_datetime(request.data.get('verification_expires_at'))
    validity_period = request.data.get('document_validity_period')

    if validity_period:
        try:
            validity_days = int(validity_period)
        except ValueError:
            return Response({'error': 'document_validity_period must be an integer number of days'}, status=status.HTTP_400_BAD_REQUEST)
        if validity_days <= 0:
            return Response({'error': 'document_validity_period must be greater than 0'}, status=status.HTTP_400_BAD_REQUEST)
    else:
        validity_days = user.document_validity_period or 365

    if not verification_expires_at:
        verification_expires_at = timezone.now() + timedelta(days=validity_days)

    try:
        saved_entries = _save_uploaded_documents(
            subdir='user_documents',
            prefix=f'user_{user.id}',
            uploads=uploaded_files,
        )

        verification_docs = {'files': saved_entries}
        user.verification_documents = verification_docs
        user.verification_status = 'pending'
        user.verified_at = None
        user.verification_expires_at = verification_expires_at
        user.document_validity_period = validity_days
        user.save(update_fields=[
            'verification_documents',
            'verification_status',
            'verified_at',
            'verification_expires_at',
            'document_validity_period',
            'updated_at',
        ])

        return Response({
            'message': 'Verification document uploaded successfully',
            'verification': _user_verification_payload(user)
        })
    except Exception as exc:
        return Response({'error': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsProductOwner])
def product_owner_verification_status(request):
    """Return the product owner's current verification status."""
    if not hasattr(request.user, 'product_owner_profile'):
        return Response({'error': 'Product owner profile not found'}, status=status.HTTP_404_NOT_FOUND)

    owner = request.user.product_owner_profile

    _ensure_owner_verification_state(owner)

    current_request = owner.verification_requests.order_by('-created_at').first()
    pending_request = owner.verification_requests.filter(status='pending').order_by('-created_at').first() if current_request and current_request.status == 'approved' else None

    return Response({
        'product_owner_id': str(owner.id),
        'business_name': owner.business_name,
        'verification_status': owner.verification_status,
        'tier': owner.tier,
        'current_verification': _serialize_verification_request(current_request, owner),
        'pending_update': _serialize_verification_request(pending_request, owner),
        'can_update': owner.verification_status != 'pending'
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsProductOwner])
@parser_classes([MultiPartParser, FormParser])
def submit_product_owner_verification(request, owner_id: Optional[str] = None):
    """Submit or update business verification for product owners."""
    if not hasattr(request.user, 'product_owner_profile'):
        return Response({'error': 'Product owner profile not found'}, status=status.HTTP_404_NOT_FOUND)

    owner = request.user.product_owner_profile

    if owner_id and str(owner.id) != str(owner_id):
        return Response({'error': 'You may only submit verification for your own account.'}, status=status.HTTP_403_FORBIDDEN)

    verification_expires_at = _parse_expiration_datetime(request.data.get('verification_expires_at'))
    validity_period = request.data.get('document_validity_period')

    if validity_period and verification_expires_at:
        return Response({'error': 'Provide either trade license expiration date or validity period, not both.'}, status=status.HTTP_400_BAD_REQUEST)

    if validity_period:
        try:
            validity_days = int(validity_period)
        except ValueError:
            return Response({'error': 'document_validity_period must be an integer number of days'}, status=status.HTTP_400_BAD_REQUEST)
        if validity_days <= 0:
            return Response({'error': 'document_validity_period must be greater than 0'}, status=status.HTTP_400_BAD_REQUEST)
    elif verification_expires_at:
        validity_days = _calculate_validity_period_days(timezone.now(), verification_expires_at, owner.document_validity_period or 365)
    else:
        return Response({'error': 'Trade license expiration date or validity period is required.'}, status=status.HTTP_400_BAD_REQUEST)

    documents_payload: Dict[str, Any] = {}

    required_uploads = {
        'trade_license': 'verification/trade_licenses',
        'trade_registration': 'verification/trade_registrations',
        'vat_registration': 'verification/vat_registrations',
        'tin_certificate': 'verification/tin_certificates',
    }

    for field_name, subdir in required_uploads.items():
        upload = request.FILES.get(field_name)
        if not upload:
            return Response({
                'error': f'{field_name.replace("_", " ").title()} file is required.'
            }, status=status.HTTP_400_BAD_REQUEST)
        saved_path = _save_uploaded_file(subdir, f'owner_{owner.id}_{field_name}', upload)
        getattr(owner, field_name).save(os.path.basename(saved_path), upload, save=False)
        documents_payload[field_name] = saved_path

    owner.save(update_fields=['trade_license', 'trade_registration', 'vat_registration', 'tin_certificate'])

    verification_request = VerificationRequest.objects.create(
        product_owner=owner,
        documents=documents_payload,
        status='pending',
        document_validity_period=validity_days,
        verification_expires_at=verification_expires_at or (timezone.now() + timedelta(days=validity_days)),
    )

    owner.verification_status = 'pending'
    owner.verified_at = None
    owner.verification_expires_at = verification_expires_at or (timezone.now() + timedelta(days=validity_days))
    owner.document_validity_period = validity_days
    owner.save(update_fields=['verification_status', 'verified_at', 'verification_expires_at', 'document_validity_period', 'updated_at'])

    return Response({
        'message': 'Verification documents submitted successfully',
        'verification': _serialize_verification_request(verification_request, owner)
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_verification_requests(request):
    """List all product owner verification requests for admins."""
    queryset = VerificationRequest.objects.select_related('product_owner__user').order_by('-created_at')
    status_filter = request.query_params.get('status')
    if status_filter in {'pending', 'approved', 'rejected'}:
        queryset = queryset.filter(status=status_filter)

    payload = [_serialize_admin_verification_request(obj, request) for obj in queryset]
    return Response(payload)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_approve_verification_request(request, verification_id):
    """Approve a product owner verification request."""
    verification_request = get_object_or_404(VerificationRequest.objects.select_related('product_owner__user'), id=verification_id)

    if verification_request.status == 'approved':
        return Response({'error': 'Verification request already approved.'}, status=status.HTTP_400_BAD_REQUEST)

    review_notes = request.data.get('review_notes', '')
    expires_at_raw = request.data.get('verification_expires_at')
    validity_raw = request.data.get('document_validity_period')

    expires_at = _parse_expiration_datetime(expires_at_raw) if expires_at_raw else verification_request.verification_expires_at

    if validity_raw:
        try:
            validity_days = int(validity_raw)
        except ValueError:
            return Response({'error': 'document_validity_period must be an integer number of days'}, status=status.HTTP_400_BAD_REQUEST)
        if validity_days <= 0:
            return Response({'error': 'document_validity_period must be greater than 0'}, status=status.HTTP_400_BAD_REQUEST)
    else:
        validity_days = verification_request.document_validity_period or verification_request.product_owner.document_validity_period or 365

    if not expires_at:
        expires_at = timezone.now() + timedelta(days=validity_days)

    now = timezone.now()
    verification_request.status = 'approved'
    verification_request.review_notes = review_notes
    verification_request.reviewed_by, _ = Admin.objects.get_or_create(user=request.user)
    verification_request.approved_at = now
    verification_request.verification_expires_at = expires_at
    verification_request.document_validity_period = validity_days
    verification_request.save(update_fields=['status', 'review_notes', 'reviewed_by', 'approved_at', 'verification_expires_at', 'document_validity_period', 'updated_at'])

    owner = verification_request.product_owner
    owner.verification_status = 'verified'
    owner.verified_at = now
    owner.verification_expires_at = expires_at
    owner.document_validity_period = validity_days
    owner.save(update_fields=['verification_status', 'verified_at', 'verification_expires_at', 'document_validity_period', 'updated_at'])

    _ensure_owner_verification_state(owner, latest_request=verification_request)

    return Response(_serialize_admin_verification_request(verification_request, request))


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_reject_verification_request(request, verification_id):
    """Reject a product owner verification request."""
    verification_request = get_object_or_404(VerificationRequest.objects.select_related('product_owner__user'), id=verification_id)

    if verification_request.status == 'rejected':
        return Response({'error': 'Verification request already rejected.'}, status=status.HTTP_400_BAD_REQUEST)

    rejection_reason = request.data.get('rejection_reason') or request.data.get('review_notes')
    if not rejection_reason:
        return Response({'error': 'rejection_reason is required'}, status=status.HTTP_400_BAD_REQUEST)

    verification_request.status = 'rejected'
    verification_request.review_notes = rejection_reason
    verification_request.reviewed_by, _ = Admin.objects.get_or_create(user=request.user)
    verification_request.approved_at = None
    verification_request.save(update_fields=['status', 'review_notes', 'reviewed_by', 'approved_at', 'updated_at'])

    owner = verification_request.product_owner
    owner.verification_status = 'rejected'
    owner.save(update_fields=['verification_status', 'updated_at'])

    _ensure_owner_verification_state(owner, latest_request=verification_request)

    return Response(_serialize_admin_verification_request(verification_request, request))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def review_product_owner_verification(request, verification_id):
    """Admin reviews product owner verification request with expiry handling."""
    if request.user.role != 'admin':
        return Response({'error': 'Only admins can review requests'}, status=status.HTTP_403_FORBIDDEN)

    verification_request = get_object_or_404(VerificationRequest, id=verification_id)

    action = request.data.get('action')
    review_notes = request.data.get('review_notes', '')

    if action not in ['approve', 'reject']:
        return Response({'error': "Action must be 'approve' or 'reject'"}, status=status.HTTP_400_BAD_REQUEST)

    admin, _ = Admin.objects.get_or_create(user=request.user)

    verification_request.reviewed_by = admin
    verification_request.review_notes = review_notes

    owner = verification_request.product_owner

    if action == 'approve':
        now = timezone.now()
        expires_at = _parse_expiration_datetime(request.data.get('verification_expires_at'))
        validity_period = request.data.get('document_validity_period')

        if validity_period:
            try:
                validity_days = int(validity_period)
            except ValueError:
                return Response({'error': 'document_validity_period must be an integer number of days'}, status=status.HTTP_400_BAD_REQUEST)
            if validity_days <= 0:
                return Response({'error': 'document_validity_period must be greater than 0'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            validity_days = verification_request.document_validity_period or owner.document_validity_period or 365

        if not expires_at:
            base_days = verification_request.document_validity_period or owner.document_validity_period or 365
            expires_at = now + timedelta(days=base_days)
            validity_days = base_days
        else:
            validity_days = _calculate_validity_period_days(now, expires_at, validity_days)

        verification_request.status = 'approved'
        verification_request.approved_at = now
        verification_request.verification_expires_at = expires_at
        verification_request.document_validity_period = validity_days

        owner.verification_status = 'verified'
        owner.verified_at = now
        owner.verification_expires_at = expires_at
        owner.document_validity_period = validity_days
        owner.save(update_fields=['verification_status', 'verified_at', 'verification_expires_at', 'document_validity_period', 'updated_at'])
    else:
        verification_request.status = 'rejected'
        owner.verification_status = 'rejected'
        owner.save(update_fields=['verification_status', 'updated_at'])

    verification_request.save(update_fields=['status', 'review_notes', 'reviewed_by', 'approved_at', 'verification_expires_at', 'document_validity_period', 'updated_at'])

    return Response(VerificationRequestSerializer(verification_request).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsProductOwner])
def owner_favorite_insights(request):
    """Return aggregate data about how many users have favorited the owner's products."""
    owner = request.user.product_owner_profile
    products_qs = owner.products.all()

    favorites_summary = (
        products_qs.annotate(favorites_count=Count('favorited_by_users'))
    )

    total_favorites = sum(product.favorites_count for product in favorites_summary)
    top_favorited = sorted(
        (
            {
                'id': str(product.id),
                'name': product.name,
                'favorites_count': product.favorites_count,
                'primary_image': product.primary_image,
            }
            for product in favorites_summary if product.favorites_count
        ),
        key=lambda item: item['favorites_count'],
        reverse=True,
    )[:10]

    return Response({
        'total_favorites': total_favorites,
        'top_favorited': top_favorited,
    })


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated, IsProductOwner])
def product_owner_profile(request):
    """Get or update the authenticated product owner's profile."""
    if not hasattr(request.user, 'product_owner_profile'):
        return Response({'error': 'Product owner profile not found'}, status=status.HTTP_404_NOT_FOUND)

    profile = request.user.product_owner_profile

    if request.method == 'GET':
        return Response(ProductOwnerSerializer(profile).data)

    serializer = ProductOwnerSerializer(profile, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
class CategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for categories with full CRUD (admin only for create/update/delete)"""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    pagination_class = None  # Disable pagination for categories
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_permissions(self):
        """Allow read for all, but write operations require admin"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdmin()]
        return [AllowAny()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        category = serializer.save()

        self._handle_category_images(category, request)
        category.refresh_from_db()

        output = self.get_serializer(category)
        headers = self.get_success_headers(output.data)
        return Response(output.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        category = serializer.save()

        self._handle_category_images(category, request)
        category.refresh_from_db()

        output = self.get_serializer(category)
        return Response(output.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self._delete_category_images(instance)
        return super().destroy(request, *args, **kwargs)

    def _parse_list_field(self, value):
        if value is None:
            return None
        if isinstance(value, list):
            return value
        if isinstance(value, (tuple, set)):
            return list(value)
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return []
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                parts = [part.strip() for part in value.split(',')]
                return [part for part in parts if part]
        return [value]

    def _handle_category_images(self, category: Category, request):
        existing_metadata = list(category.category_image_metadata or [])
        metadata_changed = False

        existing_images_param = self._parse_list_field(request.data.get('existing_images')) if hasattr(request, 'data') else None
        manual_images_param = self._parse_list_field(request.data.get('images')) if hasattr(request, 'data') else None

        file_lists = [
            request.FILES.getlist('images'),
            request.FILES.getlist('images[]'),
            request.FILES.getlist('image_files'),
            request.FILES.getlist('image_files[]'),
        ] if hasattr(request, 'FILES') else []

        has_files = any(files for files in file_lists)

        if existing_images_param is None and manual_images_param is None and not has_files:
            # Nothing to do
            return

        # Determine which existing images to keep
        if existing_images_param is not None:
            metadata_kept = []
            for item in existing_metadata:
                url = item.get('url')
                if url in existing_images_param:
                    metadata_kept.append(item)
                else:
                    path = item.get('path')
                    if path and default_storage.exists(path):
                        default_storage.delete(path)
                    metadata_changed = True
            existing_metadata = metadata_kept

        if manual_images_param is not None and not has_files:
            metadata_from_manual = []
            for url in manual_images_param:
                match = next((item for item in existing_metadata if item.get('url') == url), None)
                if match:
                    metadata_from_manual.append(match)
                else:
                    metadata_from_manual.append({'url': url})
            existing_metadata = metadata_from_manual
            metadata_changed = True

        folder = category.category_image_folder or f"categories/{category.id}"
        saved_any_file = False

        for files in file_lists:
            if not files:
                continue
            for uploaded in files:
                if not uploaded:
                    continue
                _, ext = os.path.splitext(uploaded.name)
                ext = ext or ''
                filename = f"{folder.rstrip('/')}/{uuid.uuid4().hex}{ext}"
                saved_path = default_storage.save(filename, uploaded)
                file_url = request.build_absolute_uri(default_storage.url(saved_path))
                existing_metadata.append({
                    'url': file_url,
                    'path': saved_path,
                    'name': uploaded.name,
                })
                saved_any_file = True
                metadata_changed = True

        # Deduplicate while preserving order
        seen_urls = set()
        deduped_metadata = []
        for item in existing_metadata:
            url = item.get('url')
            if url and url not in seen_urls:
                deduped_metadata.append(item)
                seen_urls.add(url)

        if metadata_changed or saved_any_file:
            category.category_image_metadata = deduped_metadata
            category.category_images = [item.get('url') for item in deduped_metadata if item.get('url')]
            category.category_image_folder = folder
            if category.current_image_index >= len(category.category_images):
                category.current_image_index = 0
            category.save(update_fields=['category_image_metadata', 'category_images', 'category_image_folder', 'current_image_index'])

    def _delete_category_images(self, category: Category):
        metadata = category.category_image_metadata or []
        for item in metadata:
            path = item.get('path')
            if path and default_storage.exists(path):
                default_storage.delete(path)
        # Attempt to clean up folder if empty and using local storage
        folder = category.category_image_folder
        if folder:
            try:
                if default_storage.exists(folder):
                    # List all files; delete folder if empty
                    remaining = list(default_storage.listdir(folder))
                    if remaining == ([], []):
                        default_storage.delete(folder)
            except Exception:
                pass


class ProductViewSet(viewsets.ModelViewSet):
    """ViewSet for products"""
    queryset = Product.objects.select_related('owner', 'category', 'subcategory').all()
    serializer_class = ProductSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'location']
    ordering_fields = ['created_at', 'name']
    pagination_class = StandardResultsSetPagination
    filterset_class = ProductFilter

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'increment_view']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = super().get_queryset()

        user = self.request.user
        action = getattr(self, 'action', None)

        if user.is_authenticated:
            user_role = getattr(user, 'role', None)
            if user_role == 'product_owner' and action in {'update', 'partial_update', 'destroy', 'retrieve'}:
                if hasattr(user, 'product_owner_profile'):
                    return queryset.filter(owner=user.product_owner_profile)
            if user_role == 'admin' and action in {'update', 'partial_update', 'destroy'}:
                return queryset

        # Filter by category or subcategory
        category_id = self.request.query_params.get('category')
        if category_id:
            queryset = queryset.filter(Q(category_id=category_id) | Q(subcategory_id=category_id))
        
        # Filter by subcategory explicitly
        subcategory_id = self.request.query_params.get('subcategory')
        if subcategory_id:
            queryset = queryset.filter(subcategory_id=subcategory_id)

        # Filter by quotation availability
        quotation_filter = self.request.query_params.get('quotation_available')
        if quotation_filter is not None:
            if quotation_filter.lower() in ['true', '1']:
                queryset = queryset.filter(quotation_available=True)
            elif quotation_filter.lower() in ['false', '0']:
                queryset = queryset.filter(quotation_available=False)

        my_products = self.request.query_params.get('my_products') == 'true'

        # Filter by owner (for product owner dashboard)
        if my_products and hasattr(self.request.user, 'product_owner_profile'):
            queryset = queryset.filter(owner=self.request.user.product_owner_profile)
            status_filter = self.request.query_params.get('status')
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            return queryset

        # Filter by status for general listing (default active)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        else:
            queryset = queryset.filter(status='active')

        show_hidden = False
        if self.request.user.is_authenticated:
            if getattr(self.request.user, 'role', None) == 'admin':
                show_hidden = True
            elif self.request.query_params.get('my_products') == 'true' and hasattr(self.request.user, 'product_owner_profile'):
                show_hidden = True

        if not show_hidden:
            queryset = queryset.filter(is_subscription_hidden=False)

        return queryset

    def perform_create(self, serializer):
        # Ensure user is a product owner
        if not hasattr(self.request.user, 'product_owner_profile'):
            raise serializers.ValidationError("Only product owners can create products")
        media = self._prepare_media(serializer)
        serializer.save(
            owner=self.request.user.product_owner_profile,
            status='under_review',
            **media,
        )

    def perform_update(self, serializer):
        media = self._prepare_media(serializer)
        serializer.save(**media)

    def _prepare_media(self, serializer):
        """Handle uploaded media and merge with existing ones."""
        existing_images = []
        existing_videos = []

        if serializer.instance and serializer.instance.images:
            existing_images = list(serializer.instance.images)
        if serializer.instance and getattr(serializer.instance, 'videos', None):
            existing_videos = list(serializer.instance.videos)

        incoming_images = serializer.validated_data.pop('images', None)
        if incoming_images is not None:
            if isinstance(incoming_images, list):
                existing_images = incoming_images
            elif isinstance(incoming_images, str):
                try:
                    parsed = json.loads(incoming_images)
                    if isinstance(parsed, list):
                        existing_images = parsed
                    else:
                        existing_images = []
                except json.JSONDecodeError:
                    existing_images = []
            else:
                existing_images = []

        incoming_videos = serializer.validated_data.pop('videos', None)
        if incoming_videos is not None:
            if isinstance(incoming_videos, list):
                existing_videos = incoming_videos
            elif isinstance(incoming_videos, str):
                try:
                    parsed_videos = json.loads(incoming_videos)
                    if isinstance(parsed_videos, list):
                        existing_videos = parsed_videos
                    else:
                        existing_videos = []
                except json.JSONDecodeError:
                    existing_videos = []
            else:
                existing_videos = []

        upload_lists = [
            self.request.FILES.getlist('images'),
            self.request.FILES.getlist('images[]'),
            self.request.FILES.getlist('image_files'),
            self.request.FILES.getlist('image_files[]'),
        ]

        for files in upload_lists:
            if not files:
                continue
            for uploaded in files:
                filename = default_storage.save(f"products/{uuid.uuid4()}_{uploaded.name}", uploaded)
                file_url = self.request.build_absolute_uri(default_storage.url(filename))
                existing_images.append(file_url)

        video_files = [
            self.request.FILES.get('video'),
            self.request.FILES.get('videos'),
            self.request.FILES.get('video_file'),
        ]

        for video in video_files:
            if not video:
                continue
            filename = default_storage.save(f"products/videos/{uuid.uuid4()}_{video.name}", video)
            file_url = self.request.build_absolute_uri(default_storage.url(filename))
            existing_videos.append(file_url)

        # Remove potential duplicates while preserving order
        seen = set()
        deduped_images = []
        for url in existing_images:
            if url and url not in seen:
                deduped_images.append(url)
                seen.add(url)

        seen_videos = set()
        deduped_videos = []
        for url in existing_videos:
            if url and url not in seen_videos:
                deduped_videos.append(url)
                seen_videos.add(url)

        primary_image = serializer.validated_data.get('primary_image')
        if not primary_image:
            primary_image = deduped_images[0] if deduped_images else None

        return {
            'primary_image': primary_image,
            'images': deduped_images,
            'videos': deduped_videos,
        }

    @action(detail=True, methods=['get'])
    def reviews(self, request, pk=None):
        """Get reviews for a product"""
        product = self.get_object()
        reviews = product.reviews.all()
        serializer = ReviewSerializer(reviews, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def increment_view(self, request, pk=None):
        """Increment product view count"""
        product = self.get_object()
        product.view_count = F('view_count') + 1
        product.save(update_fields=['view_count'])
        product.refresh_from_db()
        return Response({
            'success': True,
            'view_count': product.view_count
        })


def _serialize_admin_product(product: Product) -> Dict[str, Any]:
    owner = getattr(product, 'owner', None)
    owner_user = getattr(owner, 'user', None)
    category = getattr(product, 'category', None)
    subcategory = getattr(product, 'subcategory', None)

    status_map = {
        'under_review': 'pending',
        'draft': 'pending',
        'rejected': 'rejected',
        'inactive': 'rejected',
        'active': 'approved',
        'out_of_stock': 'approved',
    }

    normalized_status = status_map.get(product.status, product.status)

    images = []
    product_images = getattr(product, 'images', None)
    if isinstance(product_images, list):
        images = [{'image_url': image} for image in product_images if image]
    elif isinstance(product_images, str):
        try:
            parsed_images = json.loads(product_images)
            if isinstance(parsed_images, list):
                images = [{'image_url': image} for image in parsed_images if image]
        except json.JSONDecodeError:
            images = []

    return {
        'id': str(product.id),
        'name': product.name,
        'slug': getattr(product, 'slug', ''),
        'description': product.description,
        'price': float(product.price) if product.price is not None else 0,
        'stock_quantity': product.available_quantity or 0,
        'status': normalized_status,
        'rejection_reason': product.rejection_reason or '',
        'supplier': {
            'business_name': getattr(owner, 'business_name', ''),
            'user': {
                'first_name': getattr(owner_user, 'first_name', ''),
                'last_name': getattr(owner_user, 'last_name', ''),
                'email': getattr(owner_user, 'email', ''),
            } if owner_user else {},
        } if owner else {},
        'category': {
            'id': str(category.id) if category else '',
            'name': getattr(category, 'name', 'Uncategorized'),
        } if category else {'name': 'Uncategorized'},
        'subcategory': {
            'id': str(subcategory.id),
            'name': getattr(subcategory, 'name', ''),
        } if subcategory else None,
        'images': images,
        'created_at': product.created_at.isoformat() if getattr(product, 'created_at', None) else None,
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_products(request):
    """List products for moderation grouped by status."""
    status_filter = request.query_params.get('status')

    queryset = Product.objects.select_related('owner__user', 'category', 'subcategory').order_by('-created_at')

    if status_filter in {'pending', 'approved', 'rejected'}:
        status_map = {
            'pending': ['under_review', 'draft'],
            'approved': ['active', 'out_of_stock'],
            'rejected': ['rejected', 'inactive'],
        }
        queryset = queryset.filter(status__in=status_map[status_filter])

    products = [_serialize_admin_product(product) for product in queryset]
    return Response(products)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_moderate_product(request, product_id: str):
    """Approve or reject a product listing."""
    action = request.data.get('action')

    try:
        product = Product.objects.select_related('owner__user').get(id=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

    category_id = request.data.get('category_id')
    subcategory_id = request.data.get('subcategory_id')

    category_obj = None
    subcategory_obj = None

    if category_id:
        try:
            category_obj = Category.objects.get(id=category_id)
        except Category.DoesNotExist:
            return Response({'error': 'Selected category not found'}, status=status.HTTP_400_BAD_REQUEST)

    if subcategory_id:
        try:
            subcategory_obj = Category.objects.get(id=subcategory_id)
        except Category.DoesNotExist:
            return Response({'error': 'Selected subcategory not found'}, status=status.HTTP_400_BAD_REQUEST)

    if subcategory_obj and not subcategory_obj.parent_id:
        return Response({'error': 'Selected subcategory is not a valid child category'}, status=status.HTTP_400_BAD_REQUEST)

    if category_obj and subcategory_obj and str(subcategory_obj.parent_id) != str(category_obj.id):
        return Response({'error': 'Subcategory does not belong to the selected category'}, status=status.HTTP_400_BAD_REQUEST)

    if category_obj:
        product.category = category_obj
        if subcategory_obj is None and product.subcategory and product.subcategory.parent_id != category_obj.id:
            product.subcategory = None

    if subcategory_obj:
        if category_obj is None:
            parent_category = subcategory_obj.parent
            if parent_category is None:
                return Response({'error': 'Subcategory selected has no parent category'}, status=status.HTTP_400_BAD_REQUEST)
            product.category = parent_category
        product.subcategory = subcategory_obj
    elif subcategory_id == '' or subcategory_id is None:
        # Explicitly clear subcategory when empty string provided
        if category_obj and product.subcategory and product.subcategory.parent_id != category_obj.id:
            product.subcategory = None

    update_fields = ['updated_at']
    if category_obj:
        update_fields.append('category')
    if subcategory_obj or (subcategory_id == '' or subcategory_id is None and 'subcategory' not in update_fields):
        update_fields.append('subcategory')

    if action == 'approve':
        product.status = 'active'
        product.is_approved = True
        product.rejection_reason = ''
        product.admin_notes = request.data.get('admin_notes', '')
        update_fields.extend(['status', 'is_approved', 'rejection_reason', 'admin_notes'])
        product.save(update_fields=list(set(update_fields)))
        return Response({'message': 'Product approved successfully', 'product': _serialize_admin_product(product)})

    if action == 'reject':
        rejection_reason = request.data.get('rejection_reason', '').strip()
        if not rejection_reason:
            return Response({'error': 'Rejection reason is required'}, status=status.HTTP_400_BAD_REQUEST)

        product.status = 'rejected'
        product.is_approved = False
        product.rejection_reason = rejection_reason
        product.admin_notes = request.data.get('admin_notes', '')
        update_fields.extend(['status', 'is_approved', 'rejection_reason', 'admin_notes'])
        product.save(update_fields=list(set(update_fields)))
        return Response({'message': 'Product rejected', 'product': _serialize_admin_product(product)})


class QuotationViewSet(viewsets.ModelViewSet):
    """ViewSet for quotations"""
    queryset = Quotation.objects.select_related('product', 'user').all()
    serializer_class = QuotationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filterset_class = QuotationFilter

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Users see their own quotations
        if user.role == 'user':
            queryset = queryset.filter(user=user)
        
        # Product owners see quotations for their products
        elif user.role == 'product_owner' and hasattr(user, 'product_owner_profile'):
            queryset = queryset.filter(product__owner=user.product_owner_profile)
        
        return queryset

    def perform_create(self, serializer):
        user = self.request.user

        if user.tier == 'free':
            raise serializers.ValidationError({
                'error': 'upgrade_required',
                'message': 'Upgrade to Standard Verified to request quotations.',
                'upgrade_plan': 'standard_user',
            })

        if user.tier == 'standard' and user.verification_status != 'verified':
            raise serializers.ValidationError({
                'error': 'verification_required',
                'message': 'Please complete verification to request quotations with your plan.'
            })

        if user.tier == 'standard':
            quota_limit = getattr(settings, 'STANDARD_TIER_QUOTATION_LIMIT', 10)
            if user.quotations_used_this_month >= quota_limit:
                raise serializers.ValidationError({
                    'error': 'quota_exceeded',
                    'message': 'You have reached your monthly quotation limit. Upgrade to Premium for unlimited requests.',
                    'upgrade_plan': 'premium_user',
                })

        quotation = serializer.save(user=user)

        if user.tier == 'standard':
            user.quotations_used_this_month = (user.quotations_used_this_month or 0) + 1
            user.save(update_fields=['quotations_used_this_month'])

        return quotation

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser, JSONParser])
    def respond(self, request, pk=None):
        """Product owner responds to quotation"""
        quotation = self.get_object()
        
        # Check if user is the product owner
        if not hasattr(request.user, 'product_owner_profile') or \
           quotation.product.owner != request.user.product_owner_profile:
            return Response(
                {'error': 'Only the product owner can respond'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = QuotationResponseSerializer(
            instance=quotation,
            data=request.data,
            partial=True,
            context={'request': request},
        )

        serializer.is_valid(raise_exception=True)
        updated_quotation = serializer.save()
        if updated_quotation.status != 'responded':
            updated_quotation.status = 'responded'
            updated_quotation.save(update_fields=['status'])

        return Response(QuotationSerializer(
            updated_quotation,
            context=self.get_serializer_context()
        ).data)


class ReviewViewSet(viewsets.ModelViewSet):
    """ViewSet for reviews"""
    queryset = Review.objects.select_related('product', 'user').all()
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = StandardResultsSetPagination
    filterset_class = ReviewFilter

    def get_queryset(self):
        queryset = super().get_queryset()
        product_id = self.request.query_params.get('product') or self.request.query_params.get('product_id')
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class MessageViewSet(viewsets.ModelViewSet):
    """ViewSet for messages"""
    queryset = Message.objects.select_related('sender', 'receiver', 'product').all()
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return self.queryset.filter(
            Q(sender=user) | Q(receiver=user)
        ).order_by('-created_at')

    def perform_create(self, serializer):
        sender = self.request.user
        receiver_id = self.request.data.get('receiver') or self.request.data.get('receiver_id')

        if not receiver_id:
            raise serializers.ValidationError({'receiver': 'Receiver is required.'})

        receiver: Optional[User]

        try:
            receiver = User.objects.get(id=receiver_id)
        except User.DoesNotExist:
            try:
                owner = ProductOwner.objects.select_related('user').get(id=receiver_id)
                receiver = owner.user
            except ProductOwner.DoesNotExist as exc:
                raise serializers.ValidationError({'receiver': 'Invalid receiver.'}) from exc

        sender_role = sender.role
        sender_tier = getattr(sender, 'tier', None)

        if sender_role == 'user':
            if sender_tier != 'premium':
                raise serializers.ValidationError({
                    'error': 'upgrade_required',
                    'message': 'Messaging suppliers requires a Premium user plan.'
                })
        elif sender_role == 'product_owner':
            if sender_tier not in ('standard', 'premium'):
                raise serializers.ValidationError({
                    'error': 'owner_upgrade_required',
                    'message': 'Messaging customers requires a Standard or Premium owner plan.'
                })
        else:
            raise serializers.ValidationError({'error': 'unsupported_role', 'message': 'Messaging is not available for this account type.'})

        serializer.validated_data.pop('receiver_id', None)
        serializer.save(sender=sender, receiver=receiver)

    @action(detail=False, methods=['get'])
    def conversations(self, request):
        """Get list of conversations"""
        user = request.user
        messages = self.get_queryset()

        # Group by conversation partner and include full message history
        conversations: dict[str, dict[str, Any]] = {}

        for message in messages:
            partner = message.receiver if message.sender == user else message.sender
            partner_id = str(partner.id)

            if partner_id not in conversations:
                conversations[partner_id] = {
                    'partner': UserSerializer(partner).data,
                    'messages': [],
                    'last_message': None,
                    'unread_count': 0,
                }

            serialized_message = MessageSerializer(message).data

            # Insert at beginning to keep chronological order (oldest -> newest)
            conversations[partner_id]['messages'].insert(0, serialized_message)

            if conversations[partner_id]['last_message'] is None:
                conversations[partner_id]['last_message'] = serialized_message

            if message.sender_id == partner.id and not message.is_read:
                conversations[partner_id]['unread_count'] += 1

        # Add message counts and ensure last_message fallback if history exists
        for conversation in conversations.values():
            if conversation['last_message'] is None and conversation['messages']:
                conversation['last_message'] = conversation['messages'][-1]
            conversation['message_count'] = len(conversation['messages'])

        return Response(list(conversations.values()))

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark message as read"""
        message = self.get_object()
        if message.receiver == request.user:
            message.is_read = True
            message.save()
        return Response(MessageSerializer(message).data)


class SubscriptionPlanViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SubscriptionPlan.objects.filter(is_active=True)
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        return queryset


class SubscriptionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SubscriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Subscription.objects.filter(user=user)
        if user.role == 'admin':
            return Subscription.objects.all().select_related('user', 'product_owner', 'plan')
        return queryset.select_related('user', 'product_owner', 'plan')

    @action(detail=False, methods=['get'])
    def active(self, request):
        subscription = self.get_queryset().filter(is_active=True).order_by('-end_date').first()
        if not subscription:
            return Response({'detail': 'No active subscription'}, status=status.HTTP_404_NOT_FOUND)
        return Response(SubscriptionSerializer(subscription).data)


class PaymentTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PaymentTransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = PaymentTransaction.objects.filter(user=user).select_related('plan', 'subscription', 'product_owner')
        if user.role == 'admin':
            return PaymentTransaction.objects.all().select_related('plan', 'subscription', 'product_owner', 'user')
        return queryset


class VerificationRequestViewSet(viewsets.ModelViewSet):
    """ViewSet for verification requests"""
    queryset = VerificationRequest.objects.select_related(
        'product_owner', 'reviewed_by'
    ).all()
    serializer_class = VerificationRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # Product owners see their own requests
        if user.role == 'product_owner' and hasattr(user, 'product_owner_profile'):
            return self.queryset.filter(product_owner=user.product_owner_profile)
        
        # Admins see all requests
        elif user.role == 'admin':
            return self.queryset.all()
        
        return self.queryset.none()

    def perform_create(self, serializer):
        if not hasattr(self.request.user, 'product_owner_profile'):
            raise serializers.ValidationError("Only product owners can submit verification requests")
        
        # Handle file uploads: persist files to ProductOwner FileFields and record final paths
        owner = self.request.user.product_owner_profile
        documents = {}

        def save_file(field_name, upload_key, subdir):
            upload = self.request.FILES.get(upload_key)
            if not upload:
                return
            getattr(owner, field_name).save(upload.name, upload, save=True)
            documents[upload_key] = getattr(owner, field_name).name  # stored relative media path

        save_file('trade_license', 'trade_license', 'verification/trade_licenses')
        save_file('trade_registration', 'trade_registration', 'verification/trade_registrations')
        save_file('vat_registration', 'vat_registration', 'verification/vat_registrations')
        save_file('tin_certificate', 'tin_certificate', 'verification/tin_certificates')

        serializer.save(
            product_owner=owner,
            documents=documents
        )

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        """Admin reviews verification request"""
        if request.user.role != 'admin':
            return Response(
                {'error': 'Only admins can review requests'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        verification_request = self.get_object()
        # Ensure an Admin object exists for the current user
        admin, _ = Admin.objects.get_or_create(user=request.user)
        
        verification_request.status = request.data.get('status')
        verification_request.review_notes = request.data.get('review_notes')
        verification_request.reviewed_by = admin
        verification_request.save()
        
        # Update product owner verification status
        if verification_request.status == 'approved':
            verification_request.product_owner.verification_status = 'verified'
            verification_request.product_owner.save()
        
        return Response(VerificationRequestSerializer(verification_request).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_dashboard(request):
    """Get admin dashboard statistics"""
    from datetime import datetime, timedelta

    thirty_days_ago = datetime.now() - timedelta(days=30)

    user_qs = User.objects.filter(role='user')
    total_users = user_qs.count()
    verified_users = user_qs.filter(verification_status='verified').count()
    pending_users = user_qs.filter(verification_status='pending').count()
    rejected_users = user_qs.filter(verification_status='rejected').count()

    product_owner_qs = ProductOwner.objects.all()
    total_product_owners = product_owner_qs.count()
    verified_owners = product_owner_qs.filter(verification_status='verified').count()
    pending_owners = product_owner_qs.filter(verification_status='pending').count()
    rejected_owners = product_owner_qs.filter(verification_status='rejected').count()

    product_qs = Product.objects.exclude(status='inactive')
    total_products = product_qs.count()
    active_products = Product.objects.filter(status='active').count()
    under_review_products = Product.objects.filter(status='under_review').count()
    rejected_products = Product.objects.filter(status='rejected').count()
    approved_products = product_qs.filter(status__in=['active', 'out_of_stock']).count()

    stats = {
        'users': {
            'total': total_users,
            'verified': verified_users,
            'pending': pending_users,
            'rejected': rejected_users,
        },
        'product_owners': {
            'total': total_product_owners,
            'verified': verified_owners,
            'pending': pending_owners,
            'rejected': rejected_owners,
        },
        'products': {
            'total': total_products,
            'active': active_products,
            'under_review': under_review_products,
            'rejected': rejected_products,
            'approved': approved_products,
        },
        'verification_requests': {
            'users': pending_users,
            'product_owners': pending_owners,
        },
        'product_moderation': {
            'pending': under_review_products,
            'approved': approved_products,
            'rejected': rejected_products,
        },
    }

    return Response(stats)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_users(request):
    """Get all users for admin management"""
    users = User.objects.all().order_by('-created_at')

    role = request.query_params.get('role')
    if role:
        users = users.filter(role=role)

    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_toggle_user_status(request, user_id):
    """Toggle user active status"""
    try:
        user = User.objects.get(id=user_id)
        user.is_active = not user.is_active
        user.save()
        return Response(UserSerializer(user).data)
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_dashboard(request):
    """Get dashboard data for regular users"""
    user = request.user

    favorites_qs = user.favorite_products.select_related(
        'owner__user', 'category', 'subcategory'
    ).order_by('-created_at')
    favorites_count = favorites_qs.count()
    favorites = favorites_qs[:12]

    quotations_qs = user.quotations.select_related(
        'product__owner__user', 'product__category', 'product__subcategory'
    ).order_by('-created_at')
    quotations_count = quotations_qs.count()
    pending_quotations = quotations_qs.filter(status='pending').count()
    quotations = quotations_qs[:20]

    reviews_qs = user.reviews.select_related(
        'product__owner__user', 'product__category', 'product__subcategory'
    ).order_by('-created_at')
    reviews_count = reviews_qs.count()
    recent_reviews = reviews_qs[:20]

    messages_qs = Message.objects.filter(
        Q(sender=user) | Q(receiver=user)
    )
    messages_total = messages_qs.count()
    messages_unread = messages_qs.filter(receiver=user, is_read=False).count()

    try:
        favorites_data = ProductSerializer(
            favorites, many=True, context={'request': request}
        ).data
        quotations_data = QuotationSerializer(
            quotations, many=True, context={'request': request}
        ).data
        reviews_data = ReviewSerializer(
            recent_reviews, many=True, context={'request': request}
        ).data

        stats = {
            'favorites_count': favorites_count,
            'quotations_count': quotations_count,
            'pending_quotations': pending_quotations,
            'reviews_count': reviews_count,
            'messages_total': messages_total,
            'messages_unread': messages_unread,
        }

        return Response({
            'stats': stats,
            'favorites': favorites_data,
            'quotations': quotations_data,
            'recent_reviews': reviews_data,
            'verification_status': user.verification_status,
            'tier': user.tier,
        })
    except Exception as exc:
        logger.exception("Failed to build user dashboard payload for user %s", user.id)
        return Response(
            {
                'error': 'dashboard_serialization_error',
                'message': 'Unable to build dashboard data at this time.',
                'details': str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_favorite_product(request, product_id: str):
    """Add or remove a product from the user's favorites"""
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

    user = request.user
    was_favorited = user.favorite_products.filter(id=product_id).exists()

    if was_favorited:
        user.favorite_products.remove(product)
        action = 'removed'
    else:
        user.favorite_products.add(product)
        action = 'added'

    favorites_count = user.favorite_products.count()

    return Response({
        'status': action,
        'favorites_count': favorites_count,
        'is_favorited': not was_favorited,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsProductOwner])
def product_owner_dashboard(request):
    """Get product owner dashboard statistics"""
    if not hasattr(request.user, 'product_owner_profile'):
        return Response(
            {'error': 'Product owner profile not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    owner = request.user.product_owner_profile
    products = Product.objects.filter(owner=owner)
    product_stats = products.aggregate(
        total_views=Sum('view_count'),
    )

    quotations = Quotation.objects.filter(product__owner=owner)
    messages = Message.objects.filter(
        Q(receiver=owner.user) | Q(product__owner=owner)
    ).distinct()

    stats = {
        'total_products': products.count(),
        'active_products': products.filter(status='active').count(),
        'total_quotations': quotations.count(),
        'pending_quotations': quotations.filter(status='pending').count(),
        'total_reviews': Review.objects.filter(product__owner=owner).count(),
        'average_rating': Review.objects.filter(product__owner=owner).aggregate(
            Avg('rating')
        )['rating__avg'] or 0,
        'total_views': product_stats.get('total_views') or 0,
        'total_messages': messages.count(),
        'unread_messages': messages.filter(receiver=owner.user, is_read=False).count(),
        'verification_status': owner.verification_status,
    }
    
    return Response(stats)


@api_view(['POST'])
def contact_form(request):
    """Handle contact form submissions"""
    try:
        name = request.data.get('name')
        email = request.data.get('email')
        message = request.data.get('message')
        
        if not all([name, email, message]):
            return Response({'error': 'All fields are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Send email to chernetg@gmail.com
        subject = f"Contact Form Submission from {name}"
        email_message = f"""
        New contact form submission:
        
        Name: {name}
        Email: {email}
        Message: {message}
        """
        
        send_mail(
            subject,
            email_message,
            'noreply@zutaliconmart.com',
            ['chernetg@gmail.com'],
            fail_silently=False,
        )
        
        return Response({'message': 'Contact form submitted successfully'}, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def initialize_subscription_payment(request):
    plan_code = request.data.get('plan_code')
    return_url = request.data.get('return_url') or settings.CHAPA_RETURN_URL
    callback_url = settings.CHAPA_CALLBACK_URL

    if not plan_code:
        return Response({'error': 'plan_code is required'}, status=status.HTTP_400_BAD_REQUEST)

    ensure_subscription_plan(plan_code)

    try:
        plan = SubscriptionPlan.objects.get(code=plan_code, is_active=True)
    except SubscriptionPlan.DoesNotExist:
        return Response({'error': 'Invalid plan'}, status=status.HTTP_404_NOT_FOUND)

    if not settings.CHAPA_SECRET_KEY:
        return Response({'error': 'Payment gateway not configured'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    user = request.user
    tx_ref = f"zutali_{uuid.uuid4().hex}"

    with db_transaction.atomic():
        subscription, _ = Subscription.objects.select_for_update().get_or_create(
            user=user,
            plan=plan,
            defaults={
                'tier': plan.code,
                'amount': plan.amount,
                'currency': plan.currency,
                'status': 'pending',
                'is_active': False,
                'payment_status': 'pending',
                'plan_code': plan.code,
            },
        )

        subscription.tier = plan.tier
        subscription.amount = plan.amount
        subscription.currency = plan.currency
        subscription.plan_code = plan.code
        subscription.plan = plan
        subscription.status = 'pending'
        subscription.is_active = False
        subscription.payment_status = 'pending'
        subscription.save()

        product_owner_profile = None
        if plan.role == 'product_owner':
            if hasattr(user, 'product_owner_profile'):
                product_owner_profile = user.product_owner_profile
            subscription.product_owner = product_owner_profile
            subscription.save(update_fields=['product_owner', 'updated_at'])

        transaction_record = PaymentTransaction.objects.create(
            user=user,
            subscription=subscription,
            plan=plan,
            product_owner=product_owner_profile,
            tx_ref=tx_ref,
            amount=plan.amount,
            currency=plan.currency,
            status='initiated',
        )

        payload = {
            'amount': str(plan.amount),
            'currency': plan.currency,
            'email': user.email or 'payments@zutali.com',
            'first_name': user.first_name or user.username,
            'last_name': user.last_name or '',
            'phone_number': user.phone or '',
            'tx_ref': tx_ref,
            'callback_url': callback_url,
            'return_url': return_url,
            'customization': {
                'title': (plan.display_name or 'Zutali Conmart')[:16],
                'description': f'{plan.display_name} plan payment',
            },
            'meta': {
                'plan_code': plan.code,
                'user_id': str(user.id),
                'subscription_id': str(subscription.id),
            },
        }

        try:
            status_code, chapa_data = _chapa_request('POST', 'transaction/initialize', payload)
        except RuntimeError as exc:
            transaction_record.status = 'failed'
            transaction_record.response_payload = {'error': str(exc)}
            transaction_record.save(update_fields=['status', 'response_payload'])
            return Response({'error': 'Failed to initialize payment'}, status=status.HTTP_502_BAD_GATEWAY)

        if status_code >= 400:
            transaction_record.status = 'failed'
            transaction_record.response_payload = chapa_data
            transaction_record.save(update_fields=['status', 'response_payload'])
            return Response({'error': 'Payment initialization failed', 'details': chapa_data}, status=status.HTTP_502_BAD_GATEWAY)

        checkout_url = chapa_data.get('data', {}).get('checkout_url')

        if not checkout_url:
            transaction_record.status = 'failed'
            transaction_record.response_payload = chapa_data
            transaction_record.save(update_fields=['status', 'response_payload'])
            return Response({'error': 'Payment initialization failed'}, status=status.HTTP_502_BAD_GATEWAY)

        transaction_record.checkout_url = checkout_url
        transaction_record.status = 'processing'
        transaction_record.response_payload = chapa_data
        transaction_record.save(update_fields=['checkout_url', 'status', 'response_payload'])

    return Response({
        'checkout_url': checkout_url,
        'tx_ref': tx_ref,
        'subscription_id': subscription.id,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
@parser_classes([JSONParser, FormParser])
def chapa_payment_callback(request):
    data = request.data or getattr(request, 'POST', {})
    tx_ref = data.get('tx_ref') or data.get('transaction_ref')

    if not tx_ref:
        return Response({'error': 'tx_ref missing'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        transaction_record = PaymentTransaction.objects.select_related('subscription', 'plan', 'user', 'product_owner').get(tx_ref=tx_ref)
    except PaymentTransaction.DoesNotExist:
        return Response({'error': 'Transaction not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        status_code, verification_data = _chapa_request('GET', f'transaction/verify/{tx_ref}')
    except RuntimeError as exc:
        transaction_record.status = 'failed'
        transaction_record.response_payload = {'error': str(exc)}
        transaction_record.save(update_fields=['status', 'response_payload'])
        return Response({'error': 'Verification failed'}, status=status.HTTP_502_BAD_GATEWAY)

    if status_code >= 400:
        transaction_record.status = 'failed'
        transaction_record.response_payload = verification_data
        transaction_record.save(update_fields=['status', 'response_payload'])
        return Response({'error': 'Verification unsuccessful', 'details': verification_data}, status=status.HTTP_400_BAD_REQUEST)

    transaction_record.response_payload = verification_data

    if verification_data.get('status') != 'success':
        transaction_record.status = 'failed'
        transaction_record.save(update_fields=['status', 'response_payload'])
        return Response({'error': 'Verification unsuccessful'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        raw_amount = verification_data.get('data', {}).get('amount', '0')
        chapa_amount = Decimal(str(raw_amount or '0'))
    except (InvalidOperation, TypeError):
        chapa_amount = Decimal('0')
    chapa_currency = verification_data.get('data', {}).get('currency')

    subscription = transaction_record.subscription
    plan = transaction_record.plan
    if not plan and subscription.plan_code:
        plan = SubscriptionPlan.objects.filter(code=subscription.plan_code).first()

    with db_transaction.atomic():
        transaction_record.status = 'successful'
        transaction_record.completed_at = timezone.now()
        transaction_record.save(update_fields=['status', 'completed_at', 'response_payload'])

        if plan:
            if chapa_currency and plan.currency and chapa_currency.upper() != plan.currency.upper():
                transaction_record.status = 'failed'
                transaction_record.save(update_fields=['status', 'response_payload'])
                return Response({'error': 'Currency mismatch'}, status=status.HTTP_400_BAD_REQUEST)
            if chapa_amount and plan.amount and chapa_amount < plan.amount:
                transaction_record.status = 'failed'
                transaction_record.save(update_fields=['status', 'response_payload'])
                return Response({'error': 'Paid amount is less than plan cost'}, status=status.HTTP_400_BAD_REQUEST)
            subscription.plan = plan
            subscription.plan_code = plan.code
            subscription.tier = plan.tier
            subscription.amount = plan.amount
            subscription.currency = plan.currency
        subscription.payment_status = 'completed'
        subscription.is_active = True
        subscription.status = 'active'
        duration = plan.duration_days if plan else 30
        subscription.activate(duration, payment_reference=tx_ref, plan_code=plan.code if plan else subscription.plan_code)

        user = subscription.user
        user.subscription_active = True
        user.subscription_start_date = subscription.start_date
        user.subscription_end_date = subscription.end_date

        notification_message = 'Subscription payment completed successfully.'

        if plan and plan.role == 'product_owner':
            owner = subscription.product_owner
            if not owner and hasattr(user, 'product_owner_profile'):
                owner = user.product_owner_profile
                subscription.product_owner = owner
                subscription.save(update_fields=['product_owner', 'updated_at'])
            if owner:
                owner.tier = plan.tier
                owner.subscription_active = True
                owner.subscription_start_date = subscription.start_date
                owner.subscription_end_date = subscription.end_date
                owner.products_limit = plan.product_limit
                owner.save(update_fields=['tier', 'subscription_active', 'subscription_start_date', 'subscription_end_date', 'products_limit', 'updated_at'])
                owner.enforce_subscription_product_limit()
            user.tier = 'premium' if plan.tier == 'premium' else user.tier
        else:
            if plan:
                user.tier = plan.tier

        user.save(update_fields=['tier', 'subscription_active', 'subscription_start_date', 'subscription_end_date', 'updated_at'])

        Notification.objects.create(
            recipient=user,
            title='Subscription Updated',
            message=notification_message,
            notification_type='system',
        )

    return Response({
        'message': 'Payment verified',
        'subscription': SubscriptionSerializer(subscription).data,
    })


@api_view(['GET'])
def search(request):
    """Handle search requests for products and categories"""
    try:
        query = request.GET.get('q', '')
        
        if not query or len(query) < 2:
            return Response({'products': [], 'categories': []}, status=status.HTTP_200_OK)
        
        # Search products
        products = Product.objects.filter(
            Q(name__icontains=query) | 
            Q(description__icontains=query) |
            Q(name_amharic__icontains=query) |
            Q(description_amharic__icontains=query)
        ).select_related('category')[:10]
        
        # Search categories
        categories = Category.objects.filter(
            Q(name__icontains=query) |
            Q(description__icontains=query) |
            Q(name_amharic__icontains=query) |
            Q(description_amharic__icontains=query)
        )[:5]
        
        # Serialize results
        product_results = []
        for product in products:
            product_results.append({
                'id': product.id,
                'name': product.name,
                'category': {'name': product.category.name} if product.category else None
            })
        
        category_results = []
        for category in categories:
            category_results.append({
                'id': category.id,
                'name': category.name
            })
        
        return Response({
            'products': product_results,
            'categories': category_results
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request, format=None):
    """API root view showing available endpoints"""
    return Response({
        'name': 'Zutali Conmart API',
        'version': '1.0.0',
        'description': 'REST API for Zutali Conmart - Sustainable Construction Materials Marketplace',
        'endpoints': {
            'categories': {
                'list': reverse('category-list', request=request, format=format),
                'detail': reverse('category-detail', request=request, format=format, kwargs={'pk': 1}),
                'description': 'Browse and manage construction material categories'
            },
            'products': {
                'list': reverse('product-list', request=request, format=format),
                'detail': reverse('product-detail', request=request, format=format, kwargs={'pk': 1}),
                'description': 'Browse and manage construction materials and products'
            },
            'search': {
                'search': reverse('search', request=request, format=format),
                'description': 'Search products and categories'
            },
            'authentication': {
                'register': reverse('register', request=request, format=format),
                'login': reverse('login', request=request, format=format),
                'logout': reverse('logout', request=request, format=format),
                'profile': reverse('user-profile', request=request, format=format),
                'description': 'User authentication and profile management'
            },
            'quotations': {
                'list': reverse('quotation-list', request=request, format=format),
                'description': 'Request and manage price quotations'
            },
            'reviews': {
                'list': reverse('review-list', request=request, format=format),
                'description': 'Product reviews and ratings'
            },
            'contact': {
                'contact': reverse('contact-form', request=request, format=format),
                'description': 'Contact form for customer inquiries'
            },
            'admin': {
                'dashboard': reverse('admin-dashboard', request=request, format=format),
                'users': reverse('admin-users', request=request, format=format),
                'description': 'Admin panel for user and content management'
            }
        },
        'documentation': 'Use these endpoints to interact with the Zutali Conmart platform',
        'contact': 'For support, contact the development team'
    })