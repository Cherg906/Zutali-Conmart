# Verification History System - Backend Implementation Guide

## Overview

This document describes the verification history system that allows users and product owners to update their verification documents while maintaining a complete history of all verification requests.

## Key Concepts

### Parent-Child Verification Relationship

- **Initial Verification**: First verification request (parent_verification = null)
- **Re-verification**: Update request linked to previous verification (parent_verification = parent_id)
- **History Chain**: All verifications form a tree structure

### Verification Statuses

- `pending`: Awaiting admin review
- `approved/verified`: Approved by admin
- `rejected`: Rejected by admin with reason

## Database Schema Changes

### 1. User Model (User table)

Add these fields to your `User` model in `backend/api/models.py`:

```python
class User(AbstractUser):
    # ... existing fields ...
    
    # Verification tracking
    verification_status = models.CharField(
        max_length=20,
        choices=[
            ('unverified', 'Unverified'),
            ('pending', 'Pending'),
            ('verified', 'Verified'),
            ('rejected', 'Rejected'),
        ],
        default='unverified'
    )
    verification_documents = models.JSONField(null=True, blank=True)
    parent_verification = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='child_verifications',
        help_text='Links to previous verification if this is an update'
    )
    is_update = models.BooleanField(
        default=False,
        help_text='True if this is a re-verification/update request'
    )
    rejection_reason = models.TextField(blank=True, null=True)
    tier = models.CharField(
        max_length=20,
        choices=[
            ('basic', 'Basic'),
            ('premium', 'Premium'),
            ('enterprise', 'Enterprise'),
        ],
        default='basic'
    )
```

### 2. VerificationRequest Model (for Product Owners)

Update your `VerificationRequest` model:

```python
class VerificationRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product_owner = models.ForeignKey('ProductOwner', on_delete=models.CASCADE)
    verification_documents = models.JSONField()
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('approved', 'Approved'),
            ('rejected', 'Rejected'),
        ],
        default='pending'
    )
    rejection_reason = models.TextField(blank=True, null=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    # History tracking
    parent_verification = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='child_verifications',
        help_text='Links to previous verification if this is an update'
    )
    is_update = models.BooleanField(
        default=False,
        help_text='True if this is a re-verification/update request'
    )
    
    class Meta:
        ordering = ['-submitted_at']
```

## API Endpoints

### 1. User Verification Endpoints

#### List All Users (Admin)
```
GET /api/admin/users/
Authorization: Token {admin_token}

Response includes child_verifications array for each user
```

#### Approve/Reject User Verification
```
POST /api/admin/users/{user_id}/verify/
Authorization: Token {admin_token}

Body:
{
    "action": "approve" | "reject",
    "rejection_reason": "Optional, required if rejecting"
}
```

### 2. Product Owner Verification Endpoints

#### List Verification Requests (Admin)
```
GET /api/admin/verification-requests/
Authorization: Token {admin_token}

Response includes:
- parent_verification
- child_verifications (array)
- is_update (boolean)
```

#### Approve Verification Request
```
POST /api/admin/verification-requests/{request_id}/approve/
Authorization: Token {admin_token}

Effect:
- Updates VerificationRequest.status to 'approved'
- Updates ProductOwner.verification_status to 'verified'
```

#### Reject Verification Request
```
POST /api/admin/verification-requests/{request_id}/reject/
Authorization: Token {admin_token}

Body:
{
    "rejection_reason": "Required reason for rejection"
}

Effect:
- Updates VerificationRequest.status to 'rejected'
- Stores rejection_reason
```

### 3. Re-verification / Document Update Endpoints

#### Submit Updated Verification (User)
```
POST /api/users/{user_id}/update-verification/
Authorization: Token {user_token}

Body:
{
    "verification_documents": { ... },
    "reason_for_update": "Optional explanation"
}

Effect:
- Creates new verification request with parent_verification set
- Sets is_update = True
- Maintains link to original verification
```

#### Submit Updated Verification (Product Owner)
```
POST /api/product-owners/{owner_id}/update-verification/
Authorization: Token {owner_token}

Body:
{
    "verification_documents": { ... },
    "reason_for_update": "Optional explanation"
}

Effect:
- Creates new VerificationRequest with parent_verification set
- Sets is_update = True
- ProductOwner.verification_status remains unchanged until new request approved
```

## Backend View Implementation Example

```python
# In backend/api/views.py

from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status

class UserViewSet(viewsets.ModelViewSet):
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def verify(self, request, pk=None):
        """Approve or reject user verification"""
        user = self.get_object()
        action_type = request.data.get('action')
        
        if action_type == 'approve':
            user.verification_status = 'verified'
            user.save()
            return Response({'status': 'User verified successfully'})
        
        elif action_type == 'reject':
            rejection_reason = request.data.get('rejection_reason')
            if not rejection_reason:
                return Response(
                    {'error': 'Rejection reason is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            user.verification_status = 'rejected'
            user.rejection_reason = rejection_reason
            user.save()
            return Response({'status': 'User verification rejected'})
        
        return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def update_verification(self, request, pk=None):
        """Submit updated verification documents"""
        user = self.get_object()
        
        # Only allow if user is verified or rejected
        if user.verification_status not in ['verified', 'rejected']:
            return Response(
                {'error': 'Cannot update verification at this time'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create new verification record as child
        # Implementation depends on your data structure
        # This is a conceptual example
        
        verification_documents = request.data.get('verification_documents')
        reason = request.data.get('reason_for_update', '')
        
        # Logic to create child verification
        # Set parent_verification to current user
        # Set is_update to True
        # Set verification_status to 'pending'
        
        return Response({
            'status': 'Update request submitted',
            'message': 'Your updated documents are under review'
        })

class VerificationRequestViewSet(viewsets.ModelViewSet):
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def approve(self, request, pk=None):
        """Approve product owner verification request"""
        verification_request = self.get_object()
        
        if verification_request.status != 'pending':
            return Response(
                {'error': 'Request already processed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update verification request
        verification_request.status = 'approved'
        verification_request.reviewed_at = timezone.now()
        verification_request.reviewed_by = request.user
        verification_request.save()
        
        # Update product owner status
        product_owner = verification_request.product_owner
        product_owner.verification_status = 'verified'
        product_owner.save()
        
        return Response({'status': 'Verification approved successfully'})
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def reject(self, request, pk=None):
        """Reject product owner verification request"""
        verification_request = self.get_object()
        rejection_reason = request.data.get('rejection_reason')
        
        if not rejection_reason:
            return Response(
                {'error': 'Rejection reason is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        verification_request.status = 'rejected'
        verification_request.rejection_reason = rejection_reason
        verification_request.reviewed_at = timezone.now()
        verification_request.reviewed_by = request.user
        verification_request.save()
        
        return Response({'status': 'Verification rejected'})

class ProductOwnerViewSet(viewsets.ModelViewSet):
    
    @action(detail=True, methods=['post'])
    def update_verification(self, request, pk=None):
        """Submit updated verification documents for product owner"""
        product_owner = self.get_object()
        
        # Get the most recent approved verification
        parent_verification = VerificationRequest.objects.filter(
            product_owner=product_owner,
            status='approved'
        ).order_by('-submitted_at').first()
        
        if not parent_verification:
            return Response(
                {'error': 'No approved verification found to update'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create new verification request as child
        new_verification = VerificationRequest.objects.create(
            product_owner=product_owner,
            verification_documents=request.data.get('verification_documents'),
            parent_verification=parent_verification,
            is_update=True,
            status='pending'
        )
        
        return Response({
            'status': 'Update request submitted',
            'verification_id': str(new_verification.id),
            'message': 'Your updated documents are under review'
        })
```

## Serializer Updates

```python
# In backend/api/serializers.py

class UserSerializer(serializers.ModelSerializer):
    child_verifications = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'verification_status', 'tier', 'parent_verification',
            'child_verifications', 'is_update', 'verification_documents',
            'rejection_reason', 'created_at'
        ]
    
    def get_child_verifications(self, obj):
        # Return child verifications with limited fields
        children = obj.child_verifications.all()
        return [{
            'id': str(child.id),
            'verification_status': child.verification_status,
            'created_at': child.created_at,
            'is_update': child.is_update
        } for child in children]

class VerificationRequestSerializer(serializers.ModelSerializer):
    child_verifications = serializers.SerializerMethodField()
    product_owner = ProductOwnerSerializer(read_only=True)
    
    class Meta:
        model = VerificationRequest
        fields = [
            'id', 'product_owner', 'verification_documents',
            'status', 'rejection_reason', 'submitted_at',
            'parent_verification', 'child_verifications', 'is_update'
        ]
    
    def get_child_verifications(self, obj):
        children = obj.child_verifications.all()
        return [{
            'id': str(child.id),
            'status': child.status,
            'submitted_at': child.submitted_at,
            'is_update': child.is_update
        } for child in children]
```

## Frontend-Backend Data Flow

### When User/Product Owner Submits Update:

1. **User Action**: Click "Update Documents" button
2. **Frontend**: Shows form with current status indicator
3. **Frontend**: Displays message: "You are currently verified. Submitting updates will create a new verification request."
4. **API Call**: POST to update-verification endpoint
5. **Backend**: Creates new record with parent_verification set
6. **Response**: Confirmation that update is pending

### When Admin Reviews Update:

1. **Admin View**: Sees indicator that request is an "Update"
2. **Admin View**: Can view:
   - Current documents
   - Previous verification details
   - Full verification history
3. **Admin Action**: Approve or Reject
4. **Backend**: Updates status, maintains history chain
5. **Frontend**: Updates UI based on decision

## Migration Script

```python
# Create a Django migration

from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies = [
        ('api', 'previous_migration'),
    ]
    
    operations = [
        migrations.AddField(
            model_name='user',
            name='parent_verification',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='child_verifications',
                to='api.user'
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='is_update',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='verificationrequest',
            name='parent_verification',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='child_verifications',
                to='api.verificationrequest'
            ),
        ),
        migrations.AddField(
            model_name='verificationrequest',
            name='is_update',
            field=models.BooleanField(default=False),
        ),
    ]
```

## Testing Checklist

- [ ] User can submit initial verification
- [ ] Admin can approve/reject user verification
- [ ] Verified user can submit document update
- [ ] Update request shows in admin with "Update" badge
- [ ] Admin can view verification history
- [ ] Admin can view previous documents
- [ ] Approving update maintains history chain
- [ ] Product owner verification follows same flow
- [ ] Parent-child relationship maintained correctly
- [ ] API returns child_verifications array
- [ ] Frontend displays verification history

## Benefits of This System

1. **Complete Audit Trail**: Every verification attempt is preserved
2. **Document History**: Previous documents remain accessible
3. **Status Clarity**: Clear distinction between initial and update requests
4. **Admin Efficiency**: Admins can see context of update requests
5. **User Transparency**: Users know their verification history
6. **Compliance**: Meets regulatory requirements for document retention

---

**Implementation Status**: Frontend complete, backend implementation required
**Last Updated**: November 1, 2025
**Components Updated**:
- `components/admin/user-verifications.tsx`
- `components/admin/product-owner-verifications.tsx`
