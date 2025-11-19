"""
Celery configuration for Zutali Conmart
Handles background tasks like cache warming, notifications, etc.
"""
import os
from celery import Celery
from django.conf import settings

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zutali_backend.settings')

app = Celery('zutali_conmart')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Celery Configuration Options
app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    result_backend='redis://localhost:6379/4',
    broker_url='redis://localhost:6379/5',
    task_always_eager=False,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_disable_rate_limits=False,
    task_compression='gzip',
    result_compression='gzip',
    result_expires=3600,  # 1 hour
)

# Celery Beat Schedule (for periodic tasks)
app.conf.beat_schedule = {
    'warm-popular-products-cache': {
        'task': 'api.tasks.warm_popular_products_cache',
        'schedule': 3600.0,  # Every hour
    },
    'warm-trending-products-cache': {
        'task': 'api.tasks.warm_trending_products_cache',
        'schedule': 1800.0,  # Every 30 minutes
    },
    'rotate-category-images': {
        'task': 'api.tasks.rotate_category_images',
        'schedule': 3600.0,  # Every hour
    },
    'send-subscription-reminders': {
        'task': 'api.tasks.send_subscription_reminders',
        'schedule': 86400.0,  # Daily
    },
    'cleanup-old-data': {
        'task': 'api.tasks.cleanup_old_data',
        'schedule': 604800.0,  # Weekly
    },
}

# Load task modules from all registered Django app configs.
app.autodiscover_tasks()

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')