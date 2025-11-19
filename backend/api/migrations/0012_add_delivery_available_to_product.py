from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0011_add_category_images_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="delivery_available",
            field=models.BooleanField(default=False),
        ),
    ]
