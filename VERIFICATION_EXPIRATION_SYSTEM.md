# Verification Expiration & Notification System

## Overview

This system implements time-limited verifications with automatic expiration tracking and notification system for users and product owners who need to renew their verification documents.

## Key Features

- **Time-Limited Verifications**: All verifications have validity periods
- **Automatic Expiration Tracking**: System tracks days until expiration
- **Color-Coded Warnings**: Visual indicators based on time remaining
- **Notification System**: Alerts for expiring/expired verifications
- **Re-verification Workflow**: Seamless document update process

## Expiration Timeline

### Status Levels

1. **Valid** (Green)
   - More than 60 days until expiration
   - ✓ Valid for X days
   
2. **Warning** (Yellow)
   - 31-60 days until expiration
   - ⏰ Verification expires in X days
   
3. **Expiring Soon** (Orange)
   - 1-30 days until expiration
   - ⚠️ Verification expires in X days
   - User/Product Owner receives notification
   
4. **Expired** (Red)
   - Past expiration date
   - ⚠️ Verification expired X days ago
   - Immediate action required

## Database Schema

### User Model Extensions

```python
from django.db import models
from django.utils import timezone
from datetime import timedelta

class User(AbstractUser):
    # ... existing fields ...
    
    # Verification expiration fields
    verification_status = models.CharField(
        max_length=20,
        choices=[
            ('unverified', 'Unverified'),
            ('pending', 'Pending'),
            ('verified', 'Verified'),
            ('rejected', 'Rejected'),
            ('expired', 'Expired'),
        ],
        default='unverified'
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    verification_expires_at = models.DateTimeField(null=True, blank=True)
    document_validity_period = models.IntegerField(
        default=365,  # days
        help_text='Number of days the verification is valid'
    )
    
    # Notification tracking
    expiration_notification_sent = models.BooleanField(default=False)
    last_expiration_reminder = models.DateTimeField(null=True, blank=True)
    
    def save(self, *args, **kwargs):
        # Auto-calculate expiration date when verified
        if self.verification_status == 'verified' and self.verified_at:
            if not self.verification_expires_at:
                self.verification_expires_at = (
                    self.verified_at + timedelta(days=self.document_validity_period)
                )
        super().save(*args, **kwargs)
    
    @property
    def days_until_expiration(self):
        if not self.verification_expires_at:
            return None
        delta = self.verification_expires_at - timezone.now()
        return delta.days
    
    @property
    def is_verification_expired(self):
        if not self.verification_expires_at:
            return False
        return timezone.now() > self.verification_expires_at
    
    @property
    def needs_expiration_notification(self):
        """Check if user needs to be notified about expiring verification"""
        if self.verification_status != 'verified':
            return False
        
        days_remaining = self.days_until_expiration
        if days_remaining is None:
            return False
        
        # Notify if expiring within 30 days and not already notified recently
        if days_remaining <= 30:
            if not self.last_expiration_reminder:
                return True
            # Send reminder every 7 days
            days_since_reminder = (timezone.now() - self.last_expiration_reminder).days
            return days_since_reminder >= 7
        
        return False
```

### VerificationRequest Model Extensions

```python
class VerificationRequest(models.Model):
    # ... existing fields ...
    
    # Expiration fields
    approved_at = models.DateTimeField(null=True, blank=True)
    verification_expires_at = models.DateTimeField(null=True, blank=True)
    document_validity_period = models.IntegerField(
        default=365,  # days
        help_text='Number of days the verification is valid'
    )
    
    # Notification tracking
    expiration_notification_sent = models.BooleanField(default=False)
    last_expiration_reminder = models.DateTimeField(null=True, blank=True)
    
    def save(self, *args, **kwargs):
        # Auto-calculate expiration date when approved
        if self.status == 'approved' and self.approved_at:
            if not self.verification_expires_at:
                self.verification_expires_at = (
                    self.approved_at + timedelta(days=self.document_validity_period)
                )
        super().save(*args, **kwargs)
    
    @property
    def days_until_expiration(self):
        if not self.verification_expires_at or self.status != 'approved':
            return None
        delta = self.verification_expires_at - timezone.now()
        return delta.days
    
    @property
    def is_expired(self):
        if not self.verification_expires_at:
            return False
        return timezone.now() > self.verification_expires_at
```

## User-Facing Components

### User Verification Status Component

**Location**: `components/profile/user-verification-status.tsx`

**Features**:
- Shows current verification status with color-coded badges
- Displays expiration countdown for verified users
- Alerts for expiring/expired verifications
- Upload documents dialog for initial verification
- Update documents dialog for re-verification
- Shows rejection reason if rejected
- Prevents updates while pending review

**Usage**:
```tsx
import { UserVerificationStatus } from "@/components/profile/user-verification-status"

// In user profile/dashboard page
<UserVerificationStatus />
```

### Product Owner Verification Status Component

**Location**: `components/profile/product-owner-verification-status.tsx`

**Features**:
- Shows business verification status with badges
- Displays tier information
- Shows expiration countdown for verified product owners
- Alerts for expiring/expired verifications
- Upload business documents dialog
- Update documents dialog for re-verification
- Shows pending update requests
- Benefits of verification list for unverified
- Shows rejection reason if rejected

**Usage**:
```tsx
import { ProductOwnerVerificationStatus } from "@/components/profile/product-owner-verification-status"

// In product owner dashboard page
<ProductOwnerVerificationStatus />
```

## API Endpoints

### User-Facing Endpoints

#### Get User Verification Status
```
GET /api/users/{user_id}/verification-status/
Authorization: Token {user_token}

Response:
{
    "status": "verified" | "pending" | "rejected" | "expired" | "unverified",
    "verified_at": "2025-01-01T00:00:00Z",
    "verification_expires_at": "2026-01-01T00:00:00Z",
    "document_validity_period": 365,
    "rejection_reason": "Optional reason if rejected",
    "can_update": true
}
```

#### Submit/Update User Verification
```
POST /api/users/{user_id}/update-verification/
Authorization: Token {user_token}
Content-Type: multipart/form-data

Body (FormData):
- documents: File[] (multiple files)
- reason_for_update: string (optional)

Response:
{
    "success": true,
    "verification_id": "uuid",
    "message": "Verification documents submitted successfully"
}
```

#### Get Product Owner Verification Status
```
GET /api/product-owners/my-verification-status/
Authorization: Token {user_token}

Response:
{
    "product_owner_id": "uuid",
    "business_name": "ABC Company",
    "verification_status": "verified",
    "tier": "premium",
    "current_verification": {
        "id": "uuid",
        "status": "approved",
        "approved_at": "2025-01-01T00:00:00Z",
        "verification_expires_at": "2026-01-01T00:00:00Z",
        "document_validity_period": 365
    },
    "pending_update": null,
    "can_update": true
}
```

#### Submit/Update Product Owner Verification
```
POST /api/product-owners/{owner_id}/update-verification/
Authorization: Token {user_token}
Content-Type: multipart/form-data

Body (FormData):
- documents: File[] (multiple files)
- reason_for_update: string (optional)

Response:
{
    "success": true,
    "verification_id": "uuid",
    "message": "Verification documents submitted successfully"
}
```

### Get Expiring Verifications (Admin)

```python
GET /api/admin/expiring-verifications/

Response:
{
    "users": [
        {
            "id": "uuid",
            "name": "John Doe",
            "email": "john@example.com",
            "days_until_expiration": 15,
            "verification_expires_at": "2025-12-01",
            "status": "expiring-soon"
        }
    ],
    "product_owners": [
        {
            "id": "uuid",
            "business_name": "ABC Company",
            "days_until_expiration": 5,
            "verification_expires_at": "2025-11-15",
            "status": "expired"
        }
    ],
    "counts": {
        "expiring_soon": 10,
        "expired": 3
    }
}
```

### Send Expiration Notification

```python
POST /api/admin/send-expiration-notifications/

Body:
{
    "user_ids": ["uuid1", "uuid2"],
    "product_owner_ids": ["uuid3", "uuid4"]
}

Response:
{
    "notifications_sent": 4,
    "success": true
}
```

## Backend Views Implementation

### Expiration Tracking View

```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from datetime import timedelta
from django.utils import timezone

@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_expiring_verifications(request):
    """Get all verifications that are expiring soon or expired"""
    now = timezone.now()
    thirty_days_from_now = now + timedelta(days=30)
    
    # Get users with expiring verifications
    expiring_users = User.objects.filter(
        verification_status='verified',
        verification_expires_at__lte=thirty_days_from_now
    ).select_related()
    
    # Get product owners with expiring verifications
    expiring_requests = VerificationRequest.objects.filter(
        status='approved',
        verification_expires_at__lte=thirty_days_from_now
    ).select_related('product_owner', 'product_owner__user')
    
    # Categorize by urgency
    users_data = []
    for user in expiring_users:
        days_remaining = user.days_until_expiration
        status = 'expired' if days_remaining < 0 else 'expiring-soon'
        
        users_data.append({
            'id': str(user.id),
            'name': f"{user.first_name} {user.last_name}",
            'email': user.email,
            'days_until_expiration': abs(days_remaining),
            'verification_expires_at': user.verification_expires_at,
            'status': status,
            'tier': user.tier
        })
    
    product_owners_data = []
    for request in expiring_requests:
        days_remaining = request.days_until_expiration
        status = 'expired' if days_remaining < 0 else 'expiring-soon'
        
        product_owners_data.append({
            'id': str(request.product_owner.id),
            'business_name': request.product_owner.business_name,
            'email': request.product_owner.user.email,
            'days_until_expiration': abs(days_remaining),
            'verification_expires_at': request.verification_expires_at,
            'status': status,
            'tier': request.product_owner.tier
        })
    
    expired_count = len([u for u in users_data if u['status'] == 'expired']) + \
                    len([p for p in product_owners_data if p['status'] == 'expired'])
    expiring_soon_count = len(users_data) + len(product_owners_data) - expired_count
    
    return Response({
        'users': users_data,
        'product_owners': product_owners_data,
        'counts': {
            'expiring_soon': expiring_soon_count,
            'expired': expired_count
        }
    })

@api_view(['POST'])
@permission_classes([IsAdminUser])
def send_expiration_notifications(request):
    """Send notifications to users/product owners about expiring verifications"""
    user_ids = request.data.get('user_ids', [])
    product_owner_ids = request.data.get('product_owner_ids', [])
    
    notifications_sent = 0
    
    # Send notifications to users
    for user_id in user_ids:
        try:
            user = User.objects.get(id=user_id)
            # Send email/notification
            send_expiration_email(user)
            user.last_expiration_reminder = timezone.now()
            user.expiration_notification_sent = True
            user.save()
            notifications_sent += 1
        except User.DoesNotExist:
            pass
    
    # Send notifications to product owners
    for owner_id in product_owner_ids:
        try:
            owner = ProductOwner.objects.get(id=owner_id)
            # Send email/notification
            send_expiration_email(owner.user)
            # Update verification request
            request = owner.verificationrequest_set.filter(
                status='approved'
            ).order_by('-approved_at').first()
            if request:
                request.last_expiration_reminder = timezone.now()
                request.expiration_notification_sent = True
                request.save()
            notifications_sent += 1
        except ProductOwner.DoesNotExist:
            pass
    
    return Response({
        'notifications_sent': notifications_sent,
        'success': True
    })

def send_expiration_email(user):
    """Send expiration notification email"""
    from django.core.mail import send_mail
    from django.conf import settings
    
    subject = 'Verification Expiring Soon - Action Required'
    message = f"""
    Dear {user.first_name},
    
    Your verification documents are expiring soon. Please log in to your account
    and update your verification documents to maintain your verified status.
    
    Days until expiration: {user.days_until_expiration}
    
    Best regards,
    Zutali Conmart Team
    """
    
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )
```

## Automated Background Task

### Celery Task for Periodic Checks

```python
from celery import shared_task
from django.utils import timezone
from datetime import timedelta

@shared_task
def check_verification_expirations():
    """
    Periodic task to check and update verification statuses
    Run this daily via Celery Beat
    """
    now = timezone.now()
    
    # Update expired user verifications
    expired_users = User.objects.filter(
        verification_status='verified',
        verification_expires_at__lt=now
    )
    expired_users.update(verification_status='expired')
    
    # Update expired product owner verifications
    expired_requests = VerificationRequest.objects.filter(
        status='approved',
        verification_expires_at__lt=now
    )
    for request in expired_requests:
        request.status = 'expired'
        request.product_owner.verification_status = 'expired'
        request.product_owner.save()
        request.save()
    
    return {
        'users_expired': expired_users.count(),
        'product_owners_expired': expired_requests.count()
    }

@shared_task
def send_expiration_reminders():
    """
    Send reminders to users/product owners with expiring verifications
    Run this daily via Celery Beat
    """
    now = timezone.now()
    thirty_days_from_now = now + timedelta(days=30)
    
    # Find users needing reminders
    users = User.objects.filter(
        verification_status='verified',
        verification_expires_at__lte=thirty_days_from_now,
        verification_expires_at__gt=now
    )
    
    reminders_sent = 0
    for user in users:
        if user.needs_expiration_notification:
            send_expiration_email(user)
            user.last_expiration_reminder = now
            user.save()
            reminders_sent += 1
    
    return {'reminders_sent': reminders_sent}
```

### Celery Beat Configuration

```python
# In settings.py or celery.py
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    'check-verification-expirations': {
        'task': 'api.tasks.check_verification_expirations',
        'schedule': crontab(hour=2, minute=0),  # Run at 2 AM daily
    },
    'send-expiration-reminders': {
        'task': 'api.tasks.send_expiration_reminders',
        'schedule': crontab(hour=9, minute=0),  # Run at 9 AM daily
    },
}
```

## Email Notification Templates

### Expiration Warning Email

```html
Subject: ⚠️ Your Verification Documents Expire in {days} Days

Dear {user_name},

Your verification on Zutali Conmart will expire soon.

Verification Details:
- Verified On: {verified_date}
- Expires On: {expiration_date}
- Days Remaining: {days_remaining}

Please update your verification documents to maintain your verified status.

[Update Documents Button]

If you don't update your documents, your verification status will change to "Expired"
and you may lose access to certain features.

Need help? Contact our support team.

Best regards,
Zutali Conmart Team
```

### Expired Notification Email

```html
Subject: 🔴 Your Verification Has Expired - Immediate Action Required

Dear {user_name},

Your verification on Zutali Conmart has expired.

Your verification expired on: {expiration_date}

Please update your verification documents immediately to restore your verified status.

[Update Documents Now Button]

Until you renew your verification, you may have limited access to certain features.

Best regards,
Zutali Conmart Team
```

## Frontend Integration

### Notification Banner Component

The frontend automatically displays:
- Expiration countdown in verified users list
- Color-coded badges (Green/Yellow/Orange/Red)
- Detailed expiration info in details dialog
- Warning messages for admin to notify users

### Admin Dashboard Widget

Create a dashboard widget showing:
- Count of expiring verifications (next 30 days)
- Count of expired verifications
- Quick action to send notifications
- List of most urgent cases

## Migration Script

```python
# Create a Django migration

from django.db import migrations, models
from django.utils import timezone
from datetime import timedelta

def set_expiration_dates(apps, schema_editor):
    """Set initial expiration dates for existing verified users"""
    User = apps.get_model('api', 'User')
    VerificationRequest = apps.get_model('api', 'VerificationRequest')
    
    # Set expiration for verified users
    verified_users = User.objects.filter(verification_status='verified')
    for user in verified_users:
        if not user.verified_at:
            user.verified_at = timezone.now()
        user.verification_expires_at = user.verified_at + timedelta(days=365)
        user.save()
    
    # Set expiration for approved verification requests
    approved_requests = VerificationRequest.objects.filter(status='approved')
    for request in approved_requests:
        if not request.approved_at:
            request.approved_at = timezone.now()
        request.verification_expires_at = request.approved_at + timedelta(days=365)
        request.save()

class Migration(migrations.Migration):
    dependencies = [
        ('api', 'previous_migration'),
    ]
    
    operations = [
        # Add new fields
        migrations.AddField(
            model_name='user',
            name='verified_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='user',
            name='verification_expires_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='user',
            name='document_validity_period',
            field=models.IntegerField(default=365),
        ),
        migrations.AddField(
            model_name='user',
            name='expiration_notification_sent',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='user',
            name='last_expiration_reminder',
            field=models.DateTimeField(null=True, blank=True),
        ),
        
        # Add same fields for VerificationRequest
        migrations.AddField(
            model_name='verificationrequest',
            name='approved_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='verificationrequest',
            name='verification_expires_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='verificationrequest',
            name='document_validity_period',
            field=models.IntegerField(default=365),
        ),
        migrations.AddField(
            model_name='verificationrequest',
            name='expiration_notification_sent',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='verificationrequest',
            name='last_expiration_reminder',
            field=models.DateTimeField(null=True, blank=True),
        ),
        
        # Run data migration
        migrations.RunPython(set_expiration_dates),
    ]
```

## Testing Checklist

- [ ] Verification automatically gets expiration date when approved
- [ ] Expiration status calculates correctly
- [ ] Color-coded badges display properly
- [ ] Admin can see days until expiration
- [ ] Expired verifications show correct message
- [ ] Notification emails sent successfully
- [ ] Celery tasks run on schedule
- [ ] Users can update documents before expiration
- [ ] Re-verification extends validity period
- [ ] API endpoints return correct data

## Configuration

### Validity Period Settings

You can configure different validity periods for different document types or tiers:

```python
# In settings.py

VERIFICATION_VALIDITY_PERIODS = {
    'basic': 365,      # 1 year for basic tier
    'premium': 730,    # 2 years for premium tier
    'enterprise': 1095,  # 3 years for enterprise tier
}

EXPIRATION_REMINDER_DAYS = [60, 30, 15, 7, 1]  # Send reminders at these intervals
```

---

**Implementation Status**: Frontend complete, backend implementation required
**Last Updated**: November 1, 2025
**Components Updated**:
- `components/admin/user-verifications.tsx`
- `components/admin/product-owner-verifications.tsx`
