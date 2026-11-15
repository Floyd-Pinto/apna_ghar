from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def ensure_developer_profile(sender, instance, raw=False, **kwargs):
    """
    Every builder needs a Developer profile to own projects. Create one the moment an
    account is (or becomes) a builder, named after the person; they can rename it later.
    """
    if raw or getattr(instance, 'role', None) != 'builder':
        return
    from .models import Developer
    if Developer.objects.filter(user=instance).exists():
        return
    name = f"{instance.first_name} {instance.last_name}".strip() or instance.username
    Developer.objects.create(user=instance, company_name=f"{name} Developers")
