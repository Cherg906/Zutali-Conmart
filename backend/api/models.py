"""
Django models for Zutali Conmart.
These models map to the existing Supabase PostgreSQL tables.
"""
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from datetime import timedelta
from typing import Optional
import uuid


class User(AbstractUser):
    """Custom user model extending Django's AbstractUser"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=20, choices=[
        ('user', 'User'),
        ('product_owner', 'Product Owner'),
        ('admin', 'Admin')
    ], default='user')
    tier = models.CharField(max_length=20, choices=[
        ('free', 'Free'),
        ('standard', 'Standard Verified'),
        ('premium', 'Premium Verified')
    ], default='free')
    phone = models.CharField(max_length=20, blank=True, null=True)
    phone_verified = models.BooleanField(default=False)
    email_verified = models.BooleanField(default=False)

    # Subscription management
    subscription_active = models.BooleanField(default=False)
    subscription_start_date = models.DateTimeField(blank=True, null=True)
    subscription_end_date = models.DateTimeField(blank=True, null=True)
    quotations_used_this_month = models.IntegerField(default=0)
    quotations_reset_date = models.DateTimeField(blank=True, null=True)

    # Verification documents for users
    verification_status = models.CharField(max_length=20, choices=[
        ('unverified', 'Unverified'),
        ('pending', 'Pending'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
    ], default='unverified')
    verification_documents = models.JSONField(blank=True, null=True)  # ID card or business documents
    verification_rejection_reason = models.TextField(blank=True, null=True)  # Reason for rejection
    verified_at = models.DateTimeField(blank=True, null=True)
    verification_expires_at = models.DateTimeField(blank=True, null=True)
    document_validity_period = models.IntegerField(default=365)

    # Preferences
    preferred_language = models.CharField(max_length=5, choices=[
        ('en', 'English'),
        ('am', 'Amharic')
    ], default='en')
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)

    # Favorites
    favorite_products = models.ManyToManyField('Product', blank=True, related_name='favorited_by_users')
    favorite_suppliers = models.ManyToManyField('ProductOwner', blank=True, related_name='favorited_by_users')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Override groups and user_permissions with unique related names to avoid clashes
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.',
        related_name='api_user_set',
        related_query_name='api_user',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name='api_user_set',
        related_query_name='api_user',
    )

    class Meta:
        db_table = 'users'


class ProductOwner(models.Model):
    """Product owner profile"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='product_owner_profile')
    business_name = models.CharField(max_length=255)
    business_description = models.TextField(blank=True, null=True)
    business_address = models.TextField(blank=True, null=True)
    business_city = models.CharField(max_length=100, blank=True, null=True)
    business_phone = models.CharField(max_length=20, blank=True, null=True)
    business_email = models.EmailField(blank=True, null=True)
    
    # Verification status and documents
    verification_status = models.CharField(max_length=20, choices=[
        ('unverified', 'Unverified'),
        ('pending', 'Pending'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
    ], default='unverified')
    verified_at = models.DateTimeField(blank=True, null=True)
    verification_expires_at = models.DateTimeField(blank=True, null=True)
    document_validity_period = models.IntegerField(default=365)
    
    # Required verification documents
    trade_license = models.FileField(upload_to='verification/trade_licenses/', blank=True, null=True)
    trade_registration = models.FileField(upload_to='verification/trade_registrations/', blank=True, null=True)
    vat_registration = models.FileField(upload_to='verification/vat_registrations/', blank=True, null=True)
    tin_certificate = models.FileField(upload_to='verification/tin_certificates/', blank=True, null=True)
    verification_documents = models.JSONField(blank=True, null=True)  # Additional documents
    
    # Subscription tier and management
    tier = models.CharField(max_length=20, choices=[
        ('basic', 'Free Trial/Basic'),
        ('standard', 'Standard'),
        ('premium', 'Premium')
    ], default='basic')
    subscription_active = models.BooleanField(default=False)
    subscription_start_date = models.DateTimeField(blank=True, null=True)
    subscription_end_date = models.DateTimeField(blank=True, null=True)
    products_count = models.IntegerField(default=0)
    products_limit = models.IntegerField(default=1, null=True, blank=True)  # None for unlimited
    
    # Business details
    delivery_available = models.BooleanField(default=False)
    delivery_areas = models.JSONField(blank=True, null=True)  # List of areas they deliver to
    payment_methods = models.JSONField(blank=True, null=True)  # Accepted payment methods
    
    # Ratings and reviews
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    total_reviews = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'product_owners'

    def get_product_limit_for_tier(self, tier: Optional[str] = None) -> Optional[int]:
        tier = tier or self.tier
        limits = {
            'basic': 1,
            'standard': 10,
            'premium': None,
        }
        return limits.get(tier, 1)

    def enforce_subscription_product_limit(self) -> None:
        """Ensure only allowed number of products remain visible when subscription lapses."""
        limit = self.get_product_limit_for_tier()
        products_qs = self.products.order_by('created_at')

        if limit is None:
            products_qs.filter(is_subscription_hidden=True).update(is_subscription_hidden=False)
            return

        visible_ids = list(products_qs.values_list('id', flat=True)[:limit])
        self.products.exclude(id__in=visible_ids).update(is_subscription_hidden=True)
        self.products.filter(id__in=visible_ids).update(is_subscription_hidden=False)


class Category(models.Model):
    """Product categories"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    name_amharic = models.CharField(max_length=100, blank=True, null=True)
    slug = models.SlugField(max_length=100, unique=True, default='default-slug')
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subcategories')
    description = models.TextField(blank=True, null=True)
    description_amharic = models.TextField(blank=True, null=True)
    icon = models.CharField(max_length=50, blank=True, null=True)
    
    # Rotating category images
    category_images = models.JSONField(default=list, blank=True)  # List of image URLs for rotation
    category_image_metadata = models.JSONField(default=list, blank=True)  # Optional metadata for images (filename, original name)
    category_image_folder = models.CharField(max_length=255, blank=True, null=True)
    _product_count = models.IntegerField(default=0, db_index=True)  # Cached product count
    current_image_index = models.IntegerField(default=0)
    last_image_rotation = models.DateTimeField(blank=True, null=True)
    
    # Category order and visibility
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'categories'
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name



class Product(models.Model):
    """Products listed by product owners"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(ProductOwner, on_delete=models.CASCADE, related_name='products')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='products')
    subcategory = models.ForeignKey('Category', on_delete=models.SET_NULL, null=True, blank=True, related_name='sub_products')
    
    # Product details (multilingual)
    name = models.CharField(max_length=255)
    name_amharic = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField()
    description_amharic = models.TextField(blank=True, null=True)
    
    # Media
    primary_image = models.URLField(blank=True, null=True)
    images = models.JSONField(default=list)  # List of image URLs
    videos = models.JSONField(default=list)  # List of video URLs
    
    # Product specifications
    specifications = models.JSONField(blank=True, null=True)
    brand = models.CharField(max_length=100, blank=True, null=True)
    model = models.CharField(max_length=100, blank=True, null=True)
    
    # Pricing and inventory
    price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    price_negotiable = models.BooleanField(default=True)
    has_quotation_price = models.BooleanField(default=False)  # If true, price is available via quotation only
    quotation_available = models.BooleanField(default=True)
    min_order_quantity = models.IntegerField(default=1)
    unit = models.CharField(max_length=50)
    available_quantity = models.IntegerField(blank=True, null=True)
    
    # Location and delivery
    location = models.CharField(max_length=255)
    city = models.CharField(max_length=100, blank=True, null=True)
    pickup_address = models.TextField(blank=True, null=True)
    delivery_available = models.BooleanField(default=False)
    
    # Product status and moderation
    status = models.CharField(max_length=20, choices=[
        ('draft', 'Draft'),
        ('under_review', 'Under Review'),
        ('active', 'Active'),
        ('out_of_stock', 'Out of Stock'),
        ('inactive', 'Inactive'),
        ('rejected', 'Rejected')
    ], default='under_review')
    
    # Admin moderation
    is_approved = models.BooleanField(default=True)
    rejection_reason = models.TextField(blank=True, null=True)
    admin_notes = models.TextField(blank=True, null=True)
    
    # Ratings and reviews
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    total_reviews = models.IntegerField(default=0)
    
    # Statistics
    view_count = models.IntegerField(default=0)
    quotation_requests_count = models.IntegerField(default=0)
    is_subscription_hidden = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'products'
        ordering = ['-created_at']


class Review(models.Model):
    """Product reviews from users"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])
    comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'reviews'
        ordering = ['-created_at']
        unique_together = ['product', 'user']


class Quotation(models.Model):
    """Quotation requests from users to product owners"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='quotations')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quotations')
    quantity = models.IntegerField()
    message = models.TextField(blank=True, null=True)
    delivery_location = models.CharField(max_length=255, blank=True, null=True)
    request_document = models.FileField(upload_to='quotation_requests/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('responded', 'Responded'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected')
    ], default='pending')
    response = models.TextField(blank=True, null=True)
    price_quote = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    response_document = models.FileField(upload_to='quotation_responses/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'quotations'
        ordering = ['-created_at']


class Message(models.Model):
    """Messages between users and product owners"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='messages')
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'messages'
        ordering = ['-created_at']


class Admin(models.Model):
    """Admin users"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='admin_profile')
    permissions = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'admins'


class VerificationRequest(models.Model):
    """Verification requests from product owners"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product_owner = models.ForeignKey(ProductOwner, on_delete=models.CASCADE, related_name='verification_requests')
    documents = models.JSONField(default=dict)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected')
    ], default='pending')
    reviewed_by = models.ForeignKey(Admin, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_requests')
    review_notes = models.TextField(blank=True, null=True)
    approved_at = models.DateTimeField(blank=True, null=True)
    verification_expires_at = models.DateTimeField(blank=True, null=True)
    document_validity_period = models.IntegerField(default=365)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'verification_requests'
        ordering = ['-created_at']


class Subscription(models.Model):
    """User and Product Owner subscriptions"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subscriptions')
    product_owner = models.ForeignKey(ProductOwner, on_delete=models.CASCADE, related_name='subscriptions', null=True, blank=True)
    plan_code = models.CharField(max_length=100, blank=True, null=True)
    plan = models.ForeignKey('SubscriptionPlan', on_delete=models.SET_NULL, null=True, blank=True, related_name='subscriptions')
    
    tier = models.CharField(max_length=20, choices=[
        ('standard_user', 'Standard User - 50 ETB'),
        ('premium_user', 'Premium User - 200 ETB'),
        ('standard_owner', 'Standard Product Owner - 200 ETB'),
        ('premium_owner', 'Premium Product Owner - 500 ETB'),
    ])
    
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='ETB')
    
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    next_billing_date = models.DateTimeField(null=True, blank=True)
    last_payment_date = models.DateTimeField(null=True, blank=True)
    last_notified_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('active', 'Active'),
        ('grace', 'Grace Period'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    ], default='pending')
    auto_renew = models.BooleanField(default=True)
    
    # Payment details
    payment_reference = models.CharField(max_length=100, blank=True, null=True)
    payment_method = models.CharField(max_length=50, default='chapa')
    payment_status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded')
    ], default='pending')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subscriptions'
        ordering = ['-created_at']

    def activate(self, duration_days: int, payment_reference: Optional[str] = None, plan_code: Optional[str] = None):
        now = timezone.now()
        self.start_date = now
        self.end_date = now + timedelta(days=duration_days)
        self.next_billing_date = self.end_date
        self.last_payment_date = now
        self.status = 'active'
        self.is_active = True
        self.payment_status = 'completed'
        self.payment_reference = payment_reference or self.payment_reference
        if plan_code:
            self.plan_code = plan_code
        self.save()

    def mark_expired(self):
        self.is_active = False
        self.status = 'expired'
        self.auto_renew = False
        self.save(update_fields=['is_active', 'status', 'auto_renew', 'updated_at'])

    def should_send_reminder(self, reminder_delta: int = 5) -> bool:
        if not self.next_billing_date:
            return False
        now = timezone.now()
        if self.next_billing_date - timedelta(days=reminder_delta) <= now <= self.next_billing_date:
            if not self.last_notified_at or self.last_notified_at < self.next_billing_date - timedelta(days=reminder_delta):
                return True
        return False

    def record_notification(self):
        self.last_notified_at = timezone.now()
        self.save(update_fields=['last_notified_at', 'updated_at'])


class SubscriptionPlan(models.Model):
    """Reusable plan configuration for subscriptions"""
    ROLE_CHOICES = (
        ('user', 'User'),
        ('product_owner', 'Product Owner'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=100, unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    tier = models.CharField(max_length=20)
    display_name = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='ETB')
    duration_days = models.PositiveIntegerField(default=30)
    product_limit = models.IntegerField(null=True, blank=True)
    features = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subscription_plans'
        ordering = ['role', 'amount']


class PaymentTransaction(models.Model):
    """Chapa payment transaction log"""
    STATUS_CHOICES = (
        ('initiated', 'Initiated'),
        ('processing', 'Processing'),
        ('successful', 'Successful'),
        ('failed', 'Failed'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payment_transactions')
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='transactions', null=True, blank=True)
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    product_owner = models.ForeignKey(ProductOwner, on_delete=models.CASCADE, null=True, blank=True, related_name='payment_transactions')
    tx_ref = models.CharField(max_length=150, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='ETB')
    checkout_url = models.URLField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='initiated')
    response_payload = models.JSONField(blank=True, null=True)
    initiated_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'payment_transactions'
        ordering = ['-initiated_at']



class Notification(models.Model):
    """System notifications for users and product owners"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=30, choices=[
        ('verification_approved', 'Verification Approved'),
        ('verification_rejected', 'Verification Rejected'),
        ('product_approved', 'Product Approved'),
        ('product_rejected', 'Product Rejected'),
        ('quotation_received', 'Quotation Request Received'),
        ('quotation_responded', 'Quotation Response Received'),
        ('subscription_expiring', 'Subscription Expiring'),
        ('subscription_expired', 'Subscription Expired'),
        ('message_received', 'New Message Received'),
        ('system', 'System Notification')
    ])
    
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']


class ChatSession(models.Model):
    """Chat sessions for AI bot and user-to-owner messaging"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_sessions')
    product_owner = models.ForeignKey(ProductOwner, on_delete=models.CASCADE, related_name='chat_sessions', null=True, blank=True)
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='chat_sessions')
    
    session_type = models.CharField(max_length=20, choices=[
        ('ai_bot', 'AI Bot Chat'),
        ('user_owner', 'User to Product Owner Chat')
    ])
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'chat_sessions'
        ordering = ['-updated_at']


class ChatMessage(models.Model):
    """Individual chat messages"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_chat_messages', null=True, blank=True)
    
    message = models.TextField()
    is_from_ai = models.BooleanField(default=False)
    is_read = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'chat_messages'
        ordering = ['created_at']
