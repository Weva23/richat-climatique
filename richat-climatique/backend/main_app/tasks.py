from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import ProjectAlert

@shared_task
def cleanup_old_alerts():
    """Nettoyer les anciennes alertes automatiquement"""
    # Marquer les alertes de plus de 2 semaines comme non nouvelles
    cutoff_date = timezone.now() - timedelta(weeks=2)
    ProjectAlert.objects.filter(
        alert_created_at__lt=cutoff_date,
        is_new_this_week=True
    ).update(is_new_this_week=False)
    
    # Archiver automatiquement les alertes lues de plus d'un mois
    old_cutoff = timezone.now() - timedelta(days=30)
    ProjectAlert.objects.filter(
        alert_created_at__lt=old_cutoff,
        status='read'
    ).update(status='archived')
    
    return "Nettoyage des alertes terminé"