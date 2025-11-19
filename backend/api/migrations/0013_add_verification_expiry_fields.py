from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0012_add_delivery_available_to_product"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="document_validity_period",
            field=models.IntegerField(default=365),
        ),
        migrations.AddField(
            model_name="user",
            name="verification_expires_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="verified_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="productowner",
            name="document_validity_period",
            field=models.IntegerField(default=365),
        ),
        migrations.AddField(
            model_name="productowner",
            name="verification_expires_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="productowner",
            name="verified_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="verificationrequest",
            name="approved_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="verificationrequest",
            name="document_validity_period",
            field=models.IntegerField(default=365),
        ),
        migrations.AddField(
            model_name="verificationrequest",
            name="verification_expires_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
