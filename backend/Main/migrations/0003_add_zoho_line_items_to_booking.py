from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Main', '0002_add_refunded_by_to_booking'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='zoho_line_items',
            field=models.JSONField(blank=True, default=None, null=True),
        ),
    ]
