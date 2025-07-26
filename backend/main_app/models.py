# =============================================================================
# FICHIER: main_app/models.py - TOUS LES MODÈLES
# =============================================================================
from django.contrib.auth.models import AbstractUser
from django.db import models

# =============================================================================
# MODÈLE UTILISATEUR PERSONNALISÉ
# =============================================================================
class CustomUser(AbstractUser):
    """Modèle utilisateur personnalisé pour les consultants"""
    LEVEL_CHOICES = [
        ('N1', 'Niveau 1'),
        ('N2', 'Niveau 2'),
        ('N3', 'Niveau 3'),
        ('N4', 'Niveau 4'),
    ]
    
    level = models.CharField(max_length=2, choices=LEVEL_CHOICES, default='N1', verbose_name="Niveau")
    phone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")
    department = models.CharField(max_length=100, default='Financements Publics', verbose_name="Département")
    date_embauche = models.DateField(null=True, blank=True, verbose_name="Date d'embauche")
    actif = models.BooleanField(default=True, verbose_name="Actif")
    profile_picture = models.ImageField(upload_to='profiles/', null=True, blank=True, verbose_name="Photo de profil")
    
    class Meta:
        verbose_name = "Consultant"
        verbose_name_plural = "Consultants"
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.level})" if self.first_name else self.username
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip() if self.first_name else self.username
    
    @property
    def initials(self):
        if self.first_name and self.last_name:
            return f"{self.first_name[0]}{self.last_name[0]}".upper()
        return self.username[:2].upper()

# =============================================================================
# MODÈLES POUR LES DOCUMENTS
# =============================================================================
class DocumentType(models.Model):
    """Types de documents requis"""
    name = models.CharField(max_length=100, unique=True, verbose_name="Nom du document")
    description = models.TextField(blank=True, verbose_name="Description")
    obligatoire = models.BooleanField(default=True, verbose_name="Obligatoire")
    
    class Meta:
        verbose_name = "Type de document"
        verbose_name_plural = "Types de documents"
        ordering = ['name']
    
    def __str__(self):
        return self.name

# =============================================================================
# MODÈLE POUR LES PROJETS
# =============================================================================
class Project(models.Model):
    """Modèle pour les projets de financement"""
    STATUS_CHOICES = [
        ('draft', 'Brouillon'),
        ('progress', 'En cours'),
        ('ready', 'Prêt'),
        ('submitted', 'Soumis'),
        ('approved', 'Approuvé'),
        ('rejected', 'Rejeté'),
    ]
    
    FUND_CHOICES = [
        ('GCF_SAP', 'GCF - Simplified Approval Process'),
        ('GCF_READINESS', 'GCF - Readiness Programme'),
        ('GEF_LDCF', 'GEF - Least Developed Countries Fund'),
        ('CIF', 'CIF - Climate Investment Funds'),
    ]
    
    TYPE_CHOICES = [
        ('etat', 'État'),
        ('prive', 'Privé : ONG / PME / Coopérative'),
        ('institution', 'Institution publique'),
    ]
    
    name = models.CharField(max_length=200, verbose_name="Nom du projet")
    description = models.TextField(blank=True, verbose_name="Description")
    type_project = models.CharField(max_length=20, choices=TYPE_CHOICES, verbose_name="Type")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', verbose_name="Statut")
    fund = models.CharField(max_length=30, choices=FUND_CHOICES, verbose_name="Fonds")
    score_viabilite = models.IntegerField(default=0, verbose_name="Score de viabilité")
    montant_demande = models.DecimalField(max_digits=15, decimal_places=2, default=0, verbose_name="Montant demandé")
    contact_name = models.CharField(max_length=100, verbose_name="Nom du contact")
    contact_email = models.EmailField(verbose_name="Email du contact")
    contact_phone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone du contact")
    date_creation = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    date_echeance = models.DateField(null=True, blank=True, verbose_name="Date d'échéance")
    consultant = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='projects', verbose_name="Consultant")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Projet"
        verbose_name_plural = "Projets"
    
    def __str__(self):
        return self.name
    
    @property
    def rating_stars(self):
        """Convertit le score en nombre d'étoiles (1-5)"""
        if self.score_viabilite >= 90:
            return 5
        elif self.score_viabilite >= 75:
            return 4
        elif self.score_viabilite >= 60:
            return 3
        elif self.score_viabilite >= 40:
            return 2
        else:
            return 1
    
    @property
    def progress_percentage(self):
        """Calcule le pourcentage de progression basé sur les documents soumis"""
        total_docs = DocumentType.objects.filter(obligatoire=True).count()
        submitted_docs = self.documents.filter(status='submitted').count()
        if total_docs == 0:
            return 0
        return int((submitted_docs / total_docs) * 100)
    
    @property
    def missing_documents(self):
        """Retourne la liste des documents manquants"""
        required_docs = DocumentType.objects.filter(obligatoire=True)
        submitted_doc_types = self.documents.filter(status='submitted').values_list('document_type', flat=True)
        missing = required_docs.exclude(id__in=submitted_doc_types)
        return [doc.name for doc in missing]

# =============================================================================
# MODÈLE POUR LES DOCUMENTS
# =============================================================================
class Document(models.Model):
    """Documents soumis pour les projets"""
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('submitted', 'Soumis'),
        ('approved', 'Approuvé'),
        ('rejected', 'Rejeté'),
        ('expired', 'Expiré'),
    ]
    
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='documents', verbose_name="Projet")
    document_type = models.ForeignKey(DocumentType, on_delete=models.CASCADE, verbose_name="Type de document")
    name = models.CharField(max_length=200, verbose_name="Nom du fichier")
    file = models.FileField(upload_to='documents/%Y/%m/', verbose_name="Fichier")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name="Statut")
    date_soumission = models.DateTimeField(auto_now_add=True, verbose_name="Date de soumission")
    date_expiration = models.DateField(null=True, blank=True, verbose_name="Date d'expiration")
    notes = models.TextField(blank=True, verbose_name="Notes")
    uploaded_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, verbose_name="Uploadé par")
    
    class Meta:
        ordering = ['-date_soumission']
        verbose_name = "Document"
        verbose_name_plural = "Documents"
        unique_together = ['project', 'document_type']
    
    def __str__(self):
        return f"{self.name} - {self.project.name}"

# =============================================================================
# MODÈLE POUR LES NOTIFICATIONS
# =============================================================================
class Notification(models.Model):
    """Notifications pour les consultants"""
    TYPE_CHOICES = [
        ('document', 'Document'),
        ('project', 'Projet'),
        ('deadline', 'Échéance'),
        ('assignment', 'Assignation'),
        ('approval', 'Approbation'),
        ('warning', 'Avertissement'),
        ('info', 'Information'),
        ('success', 'Succès'),
    ]
    
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, verbose_name="Type")
    title = models.CharField(max_length=200, verbose_name="Titre")
    message = models.TextField(verbose_name="Message")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, null=True, blank=True, verbose_name="Projet")
    consultant = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='notifications', verbose_name="Consultant")
    read = models.BooleanField(default=False, verbose_name="Lu")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Créé le")
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
    
    def __str__(self):
        return f"{self.title} - {self.consultant.username}"
    
    @property
    def time_ago(self):
        """Retourne le temps écoulé depuis la création"""
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        diff = now - self.created_at
        
        if diff.days > 0:
            return f"Il y a {diff.days} jour{'s' if diff.days > 1 else ''}"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"Il y a {hours} heure{'s' if hours > 1 else ''}"
        else:
            minutes = max(1, diff.seconds // 60)
            return f"Il y a {minutes} minute{'s' if minutes > 1 else ''}"