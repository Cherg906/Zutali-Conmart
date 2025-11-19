"""
Django admin configuration for Zutali Conmart.
"""
from django.contrib import admin
from django.db.models import Avg
from .models import (
    User, ProductOwner, Category, Product, Quotation,
    Review, Message, Admin, VerificationRequest
)


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'email', 'role', 'is_active', 'verification_status', 'created_at']
    list_filter = ['role', 'is_active', 'verification_status', 'created_at', 'email_verified']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('username', 'email', 'first_name', 'last_name', 'phone')
        }),
        ('Role & Status', {
            'fields': ('role', 'tier', 'is_active', 'verification_status')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ProductOwner)
class ProductOwnerAdmin(admin.ModelAdmin):
    list_display = ['business_name', 'user', 'verification_status', 'tier', 'subscription_active', 'created_at']
    list_filter = ['verification_status', 'tier', 'subscription_active', 'created_at']
    search_fields = ['business_name', 'user__username', 'user__email']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Business Information', {
            'fields': ('user', 'business_name', 'business_description', 'business_address')
        }),
        ('Contact Details', {
            'fields': ('business_phone', 'business_email'),
            'classes': ('collapse',)
        }),
        ('Verification', {
            'fields': ('verification_status', 'trade_license', 'trade_registration')
        }),
        ('Subscription', {
            'fields': ('tier', 'subscription_active', 'subscription_start_date', 'subscription_end_date'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'parent', 'is_active', 'order', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'name_amharic']
    readonly_fields = ['created_at']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'owner', 'category', 'status', 'is_approved', 'price', 'created_at']
    list_filter = ['status', 'is_approved', 'category', 'created_at']
    search_fields = ['name', 'description', 'owner__business_name', 'owner__user__username']
    readonly_fields = ['created_at', 'updated_at', 'view_count', 'quotation_requests_count']
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'name_amharic', 'description', 'description_amharic')
        }),
        ('Ownership & Category', {
            'fields': ('owner', 'category', 'subcategory')
        }),
        ('Media', {
            'fields': ('primary_image', 'images', 'videos'),
            'classes': ('collapse',)
        }),
        ('Pricing & Inventory', {
            'fields': ('price', 'price_negotiable', 'unit', 'available_quantity', 'min_order_quantity')
        }),
        ('Location', {
            'fields': ('location', 'city', 'pickup_address'),
            'classes': ('collapse',)
        }),
        ('Status & Moderation', {
            'fields': ('status', 'is_approved', 'rejection_reason', 'admin_notes')
        }),
        ('Statistics', {
            'fields': ('view_count', 'quotation_requests_count', 'average_rating', 'total_reviews'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Quotation)
class QuotationAdmin(admin.ModelAdmin):
    list_display = ['product', 'user', 'quantity', 'status', 'price_quote', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['product__name', 'user__username', 'user__email']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['product', 'user', 'rating', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['product__name', 'user__username']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['sender', 'receiver', 'product', 'is_read', 'created_at']
    list_filter = ['is_read', 'created_at']
    search_fields = ['sender__username', 'receiver__username', 'content']
    readonly_fields = ['created_at']


@admin.register(Admin)
class AdminProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'created_at']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['created_at']


@admin.register(VerificationRequest)
class VerificationRequestAdmin(admin.ModelAdmin):
    list_display = ['product_owner', 'status', 'reviewed_by', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['product_owner__business_name', 'product_owner__user__username']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Request Information', {
            'fields': ('product_owner', 'status')
        }),
        ('Review', {
            'fields': ('reviewed_by', 'review_notes')
        }),
        ('Documents', {
            'fields': ('documents',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if obj.status in ['approved', 'rejected'] and not obj.reviewed_by:
            # Create admin profile if it doesn't exist
            admin_profile, created = Admin.objects.get_or_create(user=request.user)
            obj.reviewed_by = admin_profile
        super().save_model(request, obj, form, change)

        # Update product owner verification status if approved
        if obj.status == 'approved' and obj.product_owner:
            obj.product_owner.verification_status = 'verified'
            obj.product_owner.save()
