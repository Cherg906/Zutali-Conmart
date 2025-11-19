from django.db import migrations, models


def forward_fill_existing_categories(apps, schema_editor):
    Category = apps.get_model('api', 'Category')
    for category in Category.objects.all():
        if category.category_images is None:
            category.category_images = []
        if category.category_image_metadata is None:
            category.category_image_metadata = []
        if not category.category_image_folder:
            category.category_image_folder = f"categories/{category.id}"
        category.save(update_fields=['category_images', 'category_image_metadata', 'category_image_folder'])


def reverse_clear_category_images(apps, schema_editor):
    # No-op on reverse to avoid deleting existing images; leave data as-is
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_user_verification_rejection_reason'),
    ]

    operations = [
        migrations.AddField(
            model_name='category',
            name='category_image_folder',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='category',
            name='category_image_metadata',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AlterField(
            model_name='category',
            name='category_images',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(forward_fill_existing_categories, reverse_clear_category_images),
    ]
