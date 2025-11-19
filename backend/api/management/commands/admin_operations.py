"""
Django management commands for admin operations
Usage: python manage.py admin_operations [operation]
"""
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.db.models import Count, Q, Avg
from api.models import (
    User, ProductOwner, Product, VerificationRequest, 
    Notification, Subscription, Review, ChatSession
)
from api.cache_utils import CacheManager, ProductCacheWarmer
from datetime import datetime, timedelta
import json

class Command(BaseCommand):
    help = 'Perform admin operations for Zutali Conmart'

    def add_arguments(self, parser):
        parser.add_argument(
            'operation',
            type=str,
            help='Operation to perform',
            choices=[
                'stats', 'verify_docs', 'moderate_products', 'warm_cache',
                'clear_cache', 'send_notifications', 'cleanup_data'
            ]
        )
        parser.add_argument(
            '--product-owner-id',
            type=str,
            help='Specific product owner ID for verification operations'
        )
        parser.add_argument(
            '--approve',
            action='store_true',
            help='Approve verification or product'
        )
        parser.add_argument(
            '--reject',
            action='store_true',
            help='Reject verification or product'
        )
        parser.add_argument(
            '--reason',
            type=str,
            help='Reason for rejection'
        )

    def handle(self, *args, **options):
        operation = options['operation']
        
        self.stdout.write(f"Executing {operation} operation...")
        
        try:
            if operation == 'stats':
                self.show_admin_stats()
            elif operation == 'verify_docs':
                self.handle_verification_requests(options)
            elif operation == 'moderate_products':
                self.moderate_products(options)
            elif operation == 'warm_cache':
                self.warm_cache()
            elif operation == 'clear_cache':
                self.clear_cache()
            elif operation == 'send_notifications':
                self.send_notifications()
            elif operation == 'cleanup_data':
                self.cleanup_data()
                
            self.stdout.write(
                self.style.SUCCESS(f'Successfully completed {operation} operation')
            )
        except Exception as e:
            raise CommandError(f'Operation {operation} failed: {str(e)}')

    def show_admin_stats(self):
        """Show comprehensive admin statistics"""
        self.stdout.write("=== ZUTALI CONMART ADMIN STATISTICS ===\n")
        
        # User Statistics
        total_users = User.objects.count()
        verified_users = User.objects.filter(verification_status='verified').count()
        premium_users = User.objects.filter(tier='premium').count()
        standard_users = User.objects.filter(tier='standard').count()
        
        self.stdout.write("USER STATISTICS:")
        self.stdout.write(f"  Total Users: {total_users}")
        self.stdout.write(f"  Verified Users: {verified_users}")
        self.stdout.write(f"  Premium Users: {premium_users}")
        self.stdout.write(f"  Standard Users: {standard_users}")
        self.stdout.write("")
        
        # Product Owner Statistics
        total_owners = ProductOwner.objects.count()
        verified_owners = ProductOwner.objects.filter(verification_status='verified').count()
        pending_owners = ProductOwner.objects.filter(verification_status='pending').count()
        
        self.stdout.write("PRODUCT OWNER STATISTICS:")
        self.stdout.write(f"  Total Product Owners: {total_owners}")
        self.stdout.write(f"  Verified Owners: {verified_owners}")
        self.stdout.write(f"  Pending Verification: {pending_owners}")
        self.stdout.write("")
        
        # Product Statistics
        total_products = Product.objects.count()
        active_products = Product.objects.filter(status='active').count()
        under_review = Product.objects.filter(status='under_review').count()
        rejected_products = Product.objects.filter(status='rejected').count()
        
        self.stdout.write("PRODUCT STATISTICS:")
        self.stdout.write(f"  Total Products: {total_products}")
        self.stdout.write(f"  Active Products: {active_products}")
        self.stdout.write(f"  Under Review: {under_review}")
        self.stdout.write(f"  Rejected Products: {rejected_products}")
        self.stdout.write("")
        
        # Verification Requests
        pending_verifications = VerificationRequest.objects.filter(status='pending').count()
        approved_this_month = VerificationRequest.objects.filter(
            status='approved',
            updated_at__month=timezone.now().month
        ).count()
        
        self.stdout.write("VERIFICATION REQUESTS:")
        self.stdout.write(f"  Pending Verifications: {pending_verifications}")
        self.stdout.write(f"  Approved This Month: {approved_this_month}")
        self.stdout.write("")
        
        # Recent Activity
        recent_products = Product.objects.filter(
            created_at__gte=timezone.now() - timedelta(days=7)
        ).count()
        recent_registrations = User.objects.filter(
            date_joined__gte=timezone.now() - timedelta(days=7)
        ).count()
        
        self.stdout.write("RECENT ACTIVITY (Last 7 Days):")
        self.stdout.write(f"  New Products: {recent_products}")
        self.stdout.write(f"  New Registrations: {recent_registrations}")
        self.stdout.write("")
        
        # Cache Statistics
        cache_stats = CacheManager.get_cache_stats()
        self.stdout.write("CACHE STATISTICS:")
        self.stdout.write(f"  Cache Status: {'Healthy' if 'error' not in cache_stats else 'Error'}")
        if 'sample_keys' in cache_stats:
            self.stdout.write(f"  Popular Products Cached: {cache_stats['sample_keys']['popular_products_exists']}")
            self.stdout.write(f"  Trending Products Cached: {cache_stats['sample_keys']['trending_products_exists']}")
        
    def handle_verification_requests(self, options):
        """Handle document verification requests"""
        if options.get('product_owner_id'):
            # Handle specific product owner
            try:
                owner = ProductOwner.objects.get(id=options['product_owner_id'])
                if options.get('approve'):
                    self.approve_verification(owner)
                elif options.get('reject'):
                    self.reject_verification(owner, options.get('reason', 'Documents not acceptable'))
                else:
                    self.show_verification_details(owner)
            except ProductOwner.DoesNotExist:
                raise CommandError(f"Product owner {options['product_owner_id']} not found")
        else:
            # Show pending verification requests
            pending_requests = VerificationRequest.objects.filter(status='pending').select_related('product_owner__user')
            
            if not pending_requests:
                self.stdout.write("No pending verification requests")
                return
                
            self.stdout.write(f"Found {pending_requests.count()} pending verification requests:")
            self.stdout.write("")
            
            for request in pending_requests:
                owner = request.product_owner
                self.stdout.write(f"ID: {owner.id}")
                self.stdout.write(f"Business Name: {owner.business_name}")
                self.stdout.write(f"Email: {owner.user.email}")
                self.stdout.write(f"Submitted: {request.created_at}")
                self.stdout.write("Documents:")
                if owner.trade_license:
                    self.stdout.write(f"  - Trade License: {owner.trade_license}")
                if owner.trade_registration:
                    self.stdout.write(f"  - Trade Registration: {owner.trade_registration}")
                if owner.vat_registration:
                    self.stdout.write(f"  - VAT Registration: {owner.vat_registration}")
                if owner.tin_certificate:
                    self.stdout.write(f"  - TIN Certificate: {owner.tin_certificate}")
                self.stdout.write("-" * 50)

    def approve_verification(self, owner):
        """Approve a product owner's verification"""
        owner.verification_status = 'verified'
        owner.save()
        
        # Update verification request
        verification_request = VerificationRequest.objects.filter(
            product_owner=owner, 
            status='pending'
        ).first()
        if verification_request:
            verification_request.status = 'approved'
            verification_request.review_notes = 'Documents approved by admin'
            verification_request.save()
        
        # Send notification
        Notification.objects.create(
            recipient=owner.user,
            title='Verification Approved',
            message='Your business verification has been approved. You can now access all features.',
            notification_type='verification_approved'
        )
        
        self.stdout.write(f"Approved verification for {owner.business_name}")

    def reject_verification(self, owner, reason):
        """Reject a product owner's verification"""
        owner.verification_status = 'rejected'
        owner.save()
        
        # Update verification request
        verification_request = VerificationRequest.objects.filter(
            product_owner=owner, 
            status='pending'
        ).first()
        if verification_request:
            verification_request.status = 'rejected'
            verification_request.review_notes = reason
            verification_request.save()
        
        # Send notification
        Notification.objects.create(
            recipient=owner.user,
            title='Verification Rejected',
            message=f'Your verification was rejected: {reason}. Please resubmit with correct documents.',
            notification_type='verification_rejected'
        )
        
        self.stdout.write(f"Rejected verification for {owner.business_name}: {reason}")

    def moderate_products(self, options):
        """Moderate products that are under review"""
        under_review_products = Product.objects.filter(
            status='under_review'
        ).select_related('owner')
        
        if not under_review_products:
            self.stdout.write("No products under review")
            return
            
        self.stdout.write(f"Found {under_review_products.count()} products under review:")
        self.stdout.write("")
        
        for product in under_review_products[:10]:  # Show first 10
            self.stdout.write(f"ID: {product.id}")
            self.stdout.write(f"Name: {product.name}")
            self.stdout.write(f"Owner: {product.owner.business_name}")
            self.stdout.write(f"Category: {product.category.name if product.category else 'N/A'}")
            self.stdout.write(f"Created: {product.created_at}")
            self.stdout.write(f"Price: {product.price if product.price else 'Not specified'}")
            self.stdout.write("-" * 50)

    def warm_cache(self):
        """Warm up cache with popular and trending products"""
        self.stdout.write("Warming up cache...")
        
        # Warm popular products
        if ProductCacheWarmer.warm_popular_products():
            self.stdout.write("✓ Popular products cache warmed")
        else:
            self.stdout.write("✗ Failed to warm popular products cache")
        
        # Warm trending products
        if ProductCacheWarmer.warm_trending_products():
            self.stdout.write("✓ Trending products cache warmed")
        else:
            self.stdout.write("✗ Failed to warm trending products cache")
        
        # Warm trending for different periods
        for days in [1, 30]:
            if ProductCacheWarmer.warm_trending_products(days):
                self.stdout.write(f"✓ Trending products cache warmed for {days} days")

    def clear_cache(self):
        """Clear all cache"""
        if CacheManager.clear_all_cache():
            self.stdout.write("✓ All cache cleared successfully")
        else:
            self.stdout.write("✗ Failed to clear cache")

    def send_notifications(self):
        """Send notifications for various events"""
        # Notify users with expiring subscriptions
        expiring_soon = timezone.now() + timedelta(days=3)
        expiring_subscriptions = Subscription.objects.filter(
            end_date__lte=expiring_soon,
            end_date__gt=timezone.now(),
            is_active=True
        ).select_related('user')
        
        for subscription in expiring_subscriptions:
            Notification.objects.create(
                recipient=subscription.user,
                title='Subscription Expiring Soon',
                message=f'Your {subscription.tier} subscription expires on {subscription.end_date.date()}. Please renew to continue accessing premium features.',
                notification_type='subscription_expiring'
            )
        
        self.stdout.write(f"Sent {expiring_subscriptions.count()} expiration notifications")

    def cleanup_data(self):
        """Clean up old data and optimize database"""
        # Remove old notifications (older than 30 days)
        old_notifications = Notification.objects.filter(
            created_at__lt=timezone.now() - timedelta(days=30)
        )
        deleted_notifications = old_notifications.count()
        old_notifications.delete()
        
        # Remove inactive chat sessions (older than 7 days)
        old_chat_sessions = ChatSession.objects.filter(
            updated_at__lt=timezone.now() - timedelta(days=7),
            is_active=False
        )
        deleted_sessions = old_chat_sessions.count()
        old_chat_sessions.delete()
        
        self.stdout.write(f"Cleaned up {deleted_notifications} old notifications")
        self.stdout.write(f"Cleaned up {deleted_sessions} old chat sessions")