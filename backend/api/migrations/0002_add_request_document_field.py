from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0014_update_verification_status_defaults"),
    ]

    operations = [
        migrations.AddField(
            model_name="quotation",
            name="request_document",
            field=models.FileField(
                upload_to="quotation_requests/", blank=True, null=True
            ),
        ),
    ]
