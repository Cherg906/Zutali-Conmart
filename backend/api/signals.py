"""
Signals for the API app.
"""
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from .models import Category, Product


def update_category_product_count(category):
    """Update the product count for a category and its parent."""
    if not category:
        return

    from django.db.models import Count, Q

    # Reload category from database to ensure parent relationship is loaded
    try:
        category = Category.objects.select_related('parent').get(pk=category.pk)
    except Category.DoesNotExist:
        return

    # Check if this category has a parent (making it a subcategory)
    if category.parent:
        # This is a subcategory - count products where subcategory field matches
        product_count = Product.objects.filter(subcategory=category, status='active').count()
    else:
        # This is a main category - count products where category field matches
        product_count = Product.objects.filter(category=category, status='active').count()

    # Update the category's product count using direct database update
    Category.objects.filter(pk=category.pk).update(_product_count=product_count)

    # If this is a subcategory, update its parent's count too
    if category.parent:
        parent_count = Product.objects.filter(category=category.parent, status='active').count()
        Category.objects.filter(pk=category.parent.pk).update(_product_count=parent_count)


@receiver(post_save, sender=Product)
def update_product_counts_on_save(sender, instance, created, **kwargs):
    """Update product counts when a product is saved."""
    # If the product has a category, update its count
    if instance.category:
        update_category_product_count(instance.category)

    # If the product has a subcategory, update its count
    if instance.subcategory:
        update_category_product_count(instance.subcategory)

    # If the product's category or subcategory was changed, update the old ones too
    if hasattr(instance, '_old_category'):
        if instance._old_category and instance._old_category != instance.category:
            update_category_product_count(instance._old_category)

    if hasattr(instance, '_old_subcategory'):
        if instance._old_subcategory and instance._old_subcategory != instance.subcategory:
            update_category_product_count(instance._old_subcategory)


@receiver(post_delete, sender=Product)
def update_product_counts_on_delete(sender, instance, **kwargs):
    """Update product counts when a product is deleted."""
    if instance.category:
        update_category_product_count(instance.category)
    if instance.subcategory:
        update_category_product_count(instance.subcategory)


@receiver(pre_save, sender=Product)
def store_old_category(sender, instance, **kwargs):
    """Store the old category and subcategory before saving."""
    if not instance.pk:
        return  # New instance, no old values to store

    try:
        old_instance = sender.objects.get(pk=instance.pk)
        instance._old_category = old_instance.category
        instance._old_subcategory = old_instance.subcategory
    except sender.DoesNotExist:
        pass  # New instance