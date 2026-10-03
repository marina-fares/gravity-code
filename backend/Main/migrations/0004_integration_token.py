from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Main', '0003_add_zoho_line_items_to_booking'),
    ]

    operations = [
        migrations.CreateModel(
            name='IntegrationToken',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('service', models.CharField(help_text="Service name, e.g. 'zoho', 'square'", max_length=50, unique=True)),
                ('access_token', models.TextField(help_text='Current OAuth access token')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Last time this token was refreshed')),
            ],
            options={
                'db_table': 'integration_tokens',
            },
        ),
    ]
