from django.db import migrations, models


def set_unverified_for_product_owners(apps, schema_editor):
    ProductOwner = apps.get_model('api', 'ProductOwner')
    VerificationRequest = apps.get_model('api', 'VerificationRequest')

    pending_owners = ProductOwner.objects.filter(verification_status='pending')
    owner_ids_with_requests = (
        VerificationRequest.objects.filter(product_owner__in=pending_owners)
        .values_list('product_owner_id', flat=True)
        .distinct()
    )
    ProductOwner.objects.filter(
        verification_status='pending'
    ).exclude(id__in=owner_ids_with_requests).update(verification_status='unverified')


def reverse_noop(apps, schema_editor):
    # No-op: there is no safe automatic reverse for data correction
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0013_add_verification_expiry_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='productowner',
            name='verification_status',
            field=models.CharField(
                choices=[
                    ('unverified', 'Unverified'),
                    ('pending', 'Pending'),
                    ('verified', 'Verified'),
                    ('rejected', 'Rejected'),
                    ('expired', 'Expired'),
                ],
                default='unverified',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='user',
            name='verification_status',
            field=models.CharField(
                choices=[
                    ('unverified', 'Unverified'),
                    ('pending', 'Pending'),
                    ('verified', 'Verified'),
                    ('rejected', 'Rejected'),
                    ('expired', 'Expired'),
                ],
                default='unverified',
                max_length=20,
            ),
        ),
        migrations.RunPython(set_unverified_for_product_owners, reverse_noop),
    ]
