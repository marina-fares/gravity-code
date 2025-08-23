# models.py
from django.db import models
from django.contrib.auth.models import User

class APILog(models.Model):
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    method = models.CharField(max_length=10)
    path = models.CharField(max_length=255)
    status_code = models.IntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)
    duration = models.FloatField()

    def __str__(self):
        return f"{self.method} {self.path} [{self.status_code}]"
