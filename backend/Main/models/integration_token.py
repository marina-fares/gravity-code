from django.db import models


class IntegrationToken(models.Model):
    """
    Stores OAuth access tokens for third-party integrations.

    Replaces the broken pattern of writing tokens back to the .env file,
    which caused race conditions and lost tokens on every container restart.

    Usage:
        # Save a new token
        IntegrationToken.objects.update_or_create(
            service='zoho',
            defaults={'access_token': new_token}
        )

        # Read the current token
        token = IntegrationToken.objects.get(service='zoho').access_token
    """
    service = models.CharField(
        max_length=50,
        unique=True,
        help_text="Service name, e.g. 'zoho', 'square'"
    )
    access_token = models.TextField(
        help_text="Current OAuth access token"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Last time this token was refreshed"
    )

    class Meta:
        db_table = 'integration_tokens'

    def __str__(self):
        return f"{self.service} (updated {self.updated_at:%Y-%m-%d %H:%M})"