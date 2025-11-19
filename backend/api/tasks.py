"""
Celery tasks for Zutali Conmart background operations
"""
from celery import shared_task
from django.utils import timezone
from django.db.models import Count, Avg, Q
from datetime import datetime, timedelta
import logging
from .models import (
    User, ProductOwner, Product, Category,
    Notification, Subscription, ChatSession, VerificationRequest
)
from .cache_utils import CacheManager, ProductCacheWarmer

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3)
def warm_popular_products_cache(self):
    """
    Warm the popular products cache
    """
    try:
        logger.info("Starting popular products cache warming task")
        success = ProductCacheWarmer.warm_popular_products()
        
        if success:
            logger.info("Popular products cache warmed successfully")
            return {"status": "success", "message": "Popular products cache warmed"}
        else:
            logger.warning("Failed to warm popular products cache")
            return {"status": "error", "message": "Failed to warm cache"}
            
    except Exception as e:
        logger.error(f"Error warming popular products cache: {str(e)}")
        # Retry the task
        raise self.retry(exc=e, countdown=60, max_retries=3)

@shared_task(bind=True, max_retries=3)
def warm_trending_products_cache(self):
    """
    Warm the trending products cache for different time periods
    """
    try:
        logger.info("Starting trending products cache warming task")
        
        success_count = 0
        for days in [1, 7, 30]:
            if ProductCacheWarmer.warm_trending_products(days):
                success_count += 1
                logger.info(f"Trending products cache warmed for {days} days")
        
        if success_count > 0:
            logger.info(f"Trending products cache warmed for {success_count} time periods")
            return {"status": "success", "periods_warmed": success_count}
        else:
            logger.warning("Failed to warm any trending products cache")
            return {"status": "error", "message": "Failed to warm trending cache"}
            
    except Exception as e:
        logger.error(f"Error warming trending products cache: {str(e)}")
        raise self.retry(exc=e, countdown=60, max_retries=3)

@shared_task(bind=True)
def rotate_category_images(self):
    """
    Rotate category images hourly as specified in requirements
    """
    try:
        logger.info("Starting category image rotation task")
        
        categories = Category.objects.filter(is_active=True)
        rotated_count = 0
        
        for category in categories:
            if category.category_images and len(category.category_images) > 1:
                # Rotate to next image
                current_index = category.current_image_index or 0
                next_index = (current_index + 1) % len(category.category_images)
                
                category.current_image_index = next_index
                category.last_image_rotation = timezone.now()
                category.save(update_fields=['current_image_index', 'last_image_rotation'])
                
                rotated_count += 1
                logger.debug(f"Rotated image for category {category.name} to index {next_index}")
        
        logger.info(f"Category image rotation completed. Rotated {rotated_count} categories")
        return {"status": "success", "rotated_categories": rotated_count}
        
    except Exception as e:
        logger.error(f"Error rotating category images: {str(e)}")
        return {"status": "error", "message": str(e)}

@shared_task(bind=True)
def send_subscription_reminders(self):
    """
    Send subscription expiration reminders
    """
    try:
        logger.info("Starting subscription reminder task")

        now = timezone.now()
        reminder_count = 0
        expired_count = 0

        active_subscriptions = Subscription.objects.select_related('user', 'product_owner', 'plan').filter(
            is_active=True,
            next_billing_date__isnull=False
        )

        for subscription in active_subscriptions:
            try:
                if subscription.should_send_reminder():
                    billing_date = subscription.next_billing_date
                    Notification.objects.create(
                        recipient=subscription.user,
                        title='Subscription Payment Due',
                        message=(
                            f"Your {subscription.plan.display_name if subscription.plan else subscription.tier} subscription payment is due on "
                            f"{billing_date.strftime('%Y-%m-%d') if billing_date else 'soon'}."
                        ),
                        notification_type='subscription_expiring'
                    )
                    subscription.record_notification()
                    reminder_count += 1
            except Exception as exc:
                logger.warning(f"Failed to process reminder for subscription {subscription.id}: {exc}")

        overdue_subscriptions = active_subscriptions.filter(next_billing_date__lt=now)

        for subscription in overdue_subscriptions:
            try:
                subscription.mark_expired()

                user = subscription.user
                user.subscription_active = False
                user.subscription_end_date = subscription.end_date
                user.tier = 'free'
                user.save(update_fields=['tier', 'subscription_active', 'subscription_end_date', 'updated_at'])

                Notification.objects.create(
                    recipient=user,
                    title='Subscription Expired',
                    message='Your subscription has expired. Renew to restore premium features.',
                    notification_type='subscription_expired'
                )

                if subscription.product_owner:
                    owner = subscription.product_owner
                    owner.subscription_active = False
                    owner.subscription_end_date = subscription.end_date
                    owner.tier = 'basic'
                    owner.products_limit = owner.get_product_limit_for_tier('basic')
                    owner.save(update_fields=['tier', 'subscription_active', 'subscription_end_date', 'products_limit', 'updated_at'])
                    owner.enforce_subscription_product_limit()

                    Notification.objects.create(
                        recipient=user,
                        title='Supplier Subscription Downgraded',
                        message='Your supplier plan has been downgraded to Basic due to non-payment.',
                        notification_type='subscription_expired'
                    )

                expired_count += 1
            except Exception as exc:
                logger.error(f"Failed to expire subscription {subscription.id}: {exc}")

        logger.info(
            "Subscription reminders completed. Sent %s reminders, expired %s subscriptions",
            reminder_count,
            expired_count,
        )
        return {
            'status': 'success',
            'reminders_sent': reminder_count,
            'subscriptions_expired': expired_count,
        }

    except Exception as e:
        logger.error(f"Error sending subscription reminders: {str(e)}")
        return {'status': 'error', 'message': str(e)}

@shared_task(bind=True)
def cleanup_old_data(self):
    """
    Clean up old data to optimize database performance
    """
    try:
        logger.info("Starting data cleanup task")
        
        cleanup_stats = {}
        
        # Remove old notifications (older than 30 days)
        cutoff_date = timezone.now() - timedelta(days=30)
        old_notifications = Notification.objects.filter(created_at__lt=cutoff_date)
        notifications_count = old_notifications.count()
        old_notifications.delete()
        cleanup_stats['old_notifications'] = notifications_count
        
        # Remove inactive chat sessions (older than 7 days)
        chat_cutoff = timezone.now() - timedelta(days=7)
        old_chat_sessions = ChatSession.objects.filter(
            updated_at__lt=chat_cutoff,
            is_active=False
        )
        chat_sessions_count = old_chat_sessions.count()
        old_chat_sessions.delete()
        cleanup_stats['old_chat_sessions'] = chat_sessions_count
        
        # Reset monthly quotation counters (if it's the start of the month)
        if timezone.now().day == 1:
            users_to_reset = User.objects.filter(
                quotations_used_this_month__gt=0
            )
            reset_count = users_to_reset.count()
            users_to_reset.update(
                quotations_used_this_month=0,
                quotations_reset_date=timezone.now()
            )
            cleanup_stats['quotation_counters_reset'] = reset_count
        
        logger.info(f"Data cleanup completed: {cleanup_stats}")
        return {"status": "success", "cleanup_stats": cleanup_stats}
        
    except Exception as e:
        logger.error(f"Error during data cleanup: {str(e)}")
        return {"status": "error", "message": str(e)}

@shared_task(bind=True)
def process_verification_reminders(self):
    """
    Send reminders to product owners for pending verifications
    """
    try:
        logger.info("Starting verification reminder task")
        
        # Get verification requests pending for more than 7 days
        week_ago = timezone.now() - timedelta(days=7)
        pending_requests = VerificationRequest.objects.filter(
            status='pending',
            created_at__lt=week_ago
        ).select_related('product_owner__user')
        
        reminder_count = 0
        for request in pending_requests:
            # Check if reminder already sent recently
            recent_reminder = Notification.objects.filter(
                recipient=request.product_owner.user,
                notification_type='verification_pending',
                created_at__gte=timezone.now() - timedelta(days=3)
            ).exists()
            
            if not recent_reminder:
                Notification.objects.create(
                    recipient=request.product_owner.user,
                    title='Verification Pending',
                    message='Your business verification is still being reviewed. Our admin team will process it soon.',
                    notification_type='system'
                )
                reminder_count += 1
        
        logger.info(f"Verification reminders completed. Sent {reminder_count} reminders")
        return {"status": "success", "reminders_sent": reminder_count}
        
    except Exception as e:
        logger.error(f"Error sending verification reminders: {str(e)}")
        return {"status": "error", "message": str(e)}

@shared_task(bind=True)
def update_product_ratings(self):
    """
    Update product and supplier average ratings based on reviews
    """
    try:
        logger.info("Starting product ratings update task")
        
        # Update product ratings
        products_updated = 0
        products_with_reviews = Product.objects.filter(reviews__isnull=False).distinct()
        
        for product in products_with_reviews:
            avg_rating = product.reviews.aggregate(avg_rating=Avg('rating'))['avg_rating']
            review_count = product.reviews.count()
            
            if avg_rating and (product.average_rating != avg_rating or product.total_reviews != review_count):
                product.average_rating = round(avg_rating, 2)
                product.total_reviews = review_count
                product.save(update_fields=['average_rating', 'total_reviews'])
                products_updated += 1
        
        # Update supplier ratings
        suppliers_updated = 0
        suppliers_with_reviews = ProductOwner.objects.filter(products__reviews__isnull=False).distinct()
        
        for supplier in suppliers_with_reviews:
            # Get all reviews for this supplier's products
            avg_rating = supplier.products.filter(reviews__isnull=False).aggregate(
                avg_rating=Avg('reviews__rating')
            )['avg_rating']
            total_reviews = sum(product.total_reviews for product in supplier.products.all())
            
            if avg_rating and (supplier.average_rating != avg_rating or supplier.total_reviews != total_reviews):
                supplier.average_rating = round(avg_rating, 2)
                supplier.total_reviews = total_reviews
                supplier.save(update_fields=['average_rating', 'total_reviews'])
                suppliers_updated += 1
        
        logger.info(f"Ratings update completed. Updated {products_updated} products, {suppliers_updated} suppliers")
        return {
            "status": "success",
            "products_updated": products_updated,
            "suppliers_updated": suppliers_updated
        }
        
    except Exception as e:
        logger.error(f"Error updating ratings: {str(e)}")
        return {"status": "error", "message": str(e)}

@shared_task(bind=True)
def generate_admin_report(self):
    """
    Generate daily admin report with key metrics
    """
    try:
        logger.info("Starting admin report generation task")
        
        # Get statistics for the report
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        
        stats = {
            'date': today.isoformat(),
            'users': {
                'total': User.objects.count(),
                'new_this_week': User.objects.filter(date_joined__date__gte=week_ago).count(),
                'verified': User.objects.filter(verification_status='verified').count(),
                'premium': User.objects.filter(tier='premium').count(),
            },
            'product_owners': {
                'total': ProductOwner.objects.count(),
                'verified': ProductOwner.objects.filter(verification_status='verified').count(),
                'pending': ProductOwner.objects.filter(verification_status='pending').count(),
            },
            'products': {
                'total': Product.objects.count(),
                'active': Product.objects.filter(status='active').count(),
                'under_review': Product.objects.filter(status='under_review').count(),
                'new_this_week': Product.objects.filter(created_at__date__gte=week_ago).count(),
            },
            'cache_status': CacheManager.get_cache_stats()
        }
        
        # Store report in cache for admin dashboard
        cache_key = f"admin_report_{today.isoformat()}"
        CacheManager.default_cache.set(cache_key, stats, timeout=86400)  # 24 hours
        
        logger.info(f"Admin report generated successfully for {today}")
        return {"status": "success", "report_date": today.isoformat(), "stats": stats}
        
    except Exception as e:
        logger.error(f"Error generating admin report: {str(e)}")
        return {"status": "error", "message": str(e)}