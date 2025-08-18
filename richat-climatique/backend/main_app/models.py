# =============================================================================
# FICHIER: main_app/models.py - MODÈLES CORRIGÉS
# =============================================================================

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from decimal import Decimal
import hashlib

# =============================================================================
# MODÈLE UTILISATEUR PERSONNALISÉ
# =============================================================================
class CustomUser(AbstractUser):
    """Modèle utilisateur personnalisé avec rôles"""
    
    ROLE_CHOICES = [
        ('admin', 'Administrateur'),
        ('client', 'Client/Entreprise'),
    ]
    
    LEVEL_CHOICES = [
        ('N1', 'Niveau 1'),
        ('N2', 'Niveau 2'),
        ('N3', 'Niveau 3'),
        ('N4', 'Niveau 4'),
    ]
    
    # Informations de base
    role = models.CharField(
        max_length=10, 
        choices=ROLE_CHOICES, 
        default='client',
        verbose_name="Rôle"
    )
    level = models.CharField(
        max_length=2, 
        choices=LEVEL_CHOICES, 
        default='N1', 
        verbose_name="Niveau"
    )
    
    # Informations personnelles
    phone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")
    company_name = models.CharField(max_length=200, blank=True, verbose_name="Nom de l'entreprise")
    department = models.CharField(max_length=100, default='Financements Publics', verbose_name="Département")
    
    # Dates
    date_embauche = models.DateField(null=True, blank=True, verbose_name="Date d'embauche")
    date_joined = models.DateTimeField(default=timezone.now, verbose_name="Date d'inscription")
    
    # Statut
    actif = models.BooleanField(default=True, verbose_name="Actif")
    email_verified = models.BooleanField(default=False, verbose_name="Email vérifié")
    profile_picture = models.ImageField(upload_to='profiles/', null=True, blank=True, verbose_name="Photo de profil")
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    
    class Meta:
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"
        ordering = ['-date_joined']
    
    @property
    def full_name(self):
        """Retourne le nom complet"""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.username
    
    @property
    def initials(self):
        """Retourne les initiales"""
        if self.first_name and self.last_name:
            return f"{self.first_name[0]}{self.last_name[0]}".upper()
        return self.username[:2].upper()
    
    @property
    def is_admin(self):
        """Vérifie si l'utilisateur est administrateur"""
        return self.role == 'admin'
    
    @property
    def is_client(self):
        """Vérifie si l'utilisateur est client"""
        return self.role == 'client'
    
    def __str__(self):
        return f"{self.full_name} ({self.get_role_display()})"
# =============================================================================
# MODÈLE POUR LES PROJETS SCRAPÉS
# =============================================================================
class ScrapedProject(models.Model):
    """Modèle pour les projets scrapés depuis GEF et GCF"""
    SOURCE_CHOICES = [
        ('GEF', 'Global Environment Facility'),
        ('GCF', 'Green Climate Fund'),
        ('OTHER', 'Autre source'),
        ('CLIMATE_FUND', 'Climate Funds Update'),
    ]
    
    # Informations de base
    title = models.CharField(max_length=500, verbose_name="Titre")
    # source = models.CharField(max_length=10, choices=SOURCE_CHOICES, verbose_name="Source")
    source = models.CharField(max_length=15, choices=SOURCE_CHOICES, verbose_name="Source")
    
    source_url = models.URLField(max_length=1000, blank=True, verbose_name="URL source")
    source_id = models.CharField(max_length=100, blank=True, verbose_name="ID source")
    
    # Informations du projet
    description = models.TextField(blank=True, verbose_name="Description")
    organization = models.CharField(max_length=200, blank=True, verbose_name="Organisation")
    project_type = models.CharField(max_length=200, blank=True, verbose_name="Type de projet")
    status = models.CharField(max_length=100, blank=True, verbose_name="Statut")
    
    # Informations financières
    total_funding = models.CharField(max_length=100, blank=True, verbose_name="Financement total")
    funding_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, verbose_name="Montant numérique")
    currency = models.CharField(max_length=10, default='USD', verbose_name="Devise")
    
    # Informations géographiques
    country = models.CharField(max_length=100, default='Mauritania', verbose_name="Pays")
    region = models.CharField(max_length=100, blank=True, verbose_name="Région")
    
    # Informations spécifiques GEF
    focal_areas = models.TextField(blank=True, verbose_name="Domaines focaux GEF")
    gef_project_id = models.CharField(max_length=50, blank=True, verbose_name="ID Projet GEF")
    
    # Informations spécifiques GCF
    gcf_document_type = models.CharField(max_length=100, blank=True, verbose_name="Type document GCF")
    cover_date = models.CharField(max_length=50, blank=True, verbose_name="Date de couverture")
    
    # Documents et liens
    document_url = models.URLField(max_length=1000, blank=True, verbose_name="URL document")
    additional_links = models.TextField(blank=True, verbose_name="Liens additionnels")
    
    # Métadonnées de scraping
    scraped_at = models.DateTimeField(auto_now_add=True, verbose_name="Scrapé le")
    last_updated = models.DateTimeField(auto_now=True, verbose_name="Mis à jour le")
    scraping_source = models.CharField(max_length=100, blank=True, verbose_name="Source du scraping")
    
    # Relation avec le projet Django (optionnel)
    linked_project = models.OneToOneField(
        'Project', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='scraped_source',
        verbose_name="Projet lié"
    )
    
    # Indicateurs de qualité
    data_completeness_score = models.IntegerField(default=0, verbose_name="Score de complétude")
    is_relevant_for_mauritania = models.BooleanField(default=True, verbose_name="Pertinent pour la Mauritanie")
    needs_review = models.BooleanField(default=False, verbose_name="Nécessite une révision")
    
    # Hash unique généré automatiquement
    unique_hash = models.CharField(max_length=64, unique=True, blank=True, verbose_name="Hash unique")
    
    class Meta:
        ordering = ['-scraped_at']
        verbose_name = "Projet scrapé"
        verbose_name_plural = "Projets scrapés"
    
    def save(self, *args, **kwargs):
        # Générer un hash unique basé sur titre + source + URL pour éviter les doublons
        if not self.unique_hash:
            content = f"{self.title}|{self.source}|{self.source_url}|{self.organization}"
            self.unique_hash = hashlib.sha256(content.encode()).hexdigest()[:32]
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"[{self.source}] {self.title[:50]}..."
    
    def can_create_project(self):
        """Vérifie si ce projet scrapé peut être converti en projet Django"""
        return (
            self.title and 
            len(self.title) > 10 and
            self.organization and
            self.data_completeness_score >= 50 and
            not self.linked_project
        )
    
    def create_linked_project(self, consultant):
        """Crée un projet Django lié à partir de ce projet scrapé"""
        if not self.can_create_project():
            raise ValueError("Ce projet scrapé ne peut pas être converti")
        
        # Déterminer le type et le fonds
        if self.source == 'GEF':
            project_type = 'etat'
            fund_type = 'GEF_LDCF'
        elif self.source == 'GCF':
            project_type = 'institution'
            fund_type = 'GCF_SAP'
        else:
            project_type = 'etat'
            fund_type = 'CIF'
        
        # Créer le projet Django
        project = Project.objects.create(
            name=self.title[:200],
            description=f"{self.description}\n\nSource: {self.source}\nOrganisation: {self.organization}",
            type_project=project_type,
            status='draft',
            fund=fund_type,
            score_viabilite=self.data_completeness_score,
            montant_demande=self.funding_amount or Decimal('0'),
            contact_name=self.organization[:100] or 'Contact',
            contact_email=self._generate_contact_email(),
            contact_phone='+222 XX XX XX XX',
            consultant=consultant,
            is_from_scraping=True,
            original_source=self.source,
            source_reference=self.source_id
        )
        
        # Lier les deux projets
        self.linked_project = project
        self.save()
        
        return project
    
    def _generate_contact_email(self):
        """Génère un email de contact basé sur l'organisation"""
        if not self.organization:
            return 'contact@example.org'
        
        import re
        clean_org = re.sub(r'[^a-zA-Z0-9]', '', self.organization.lower())[:20]
        return f"contact@{clean_org}.org" if clean_org else 'contact@example.org'

# =============================================================================
# MODÈLE PROJECT ÉTENDU
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
    
    # Champs pour le lien avec les données scrapées
    is_from_scraping = models.BooleanField(default=False, verbose_name="Créé par scraping")
    # original_source = models.CharField(max_length=10, blank=True, choices=ScrapedProject.SOURCE_CHOICES, verbose_name="Source originale")
    original_source = models.CharField(
        max_length=15,  # Au lieu de 10
        blank=True, 
        choices=ScrapedProject.SOURCE_CHOICES, 
        verbose_name="Source originale"
    )
    source_reference = models.CharField(max_length=100, blank=True, verbose_name="Référence source")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Projet"
        verbose_name_plural = "Projets"
    
    def __str__(self):
        return self.name
    
    @property
    def has_scraped_source(self):
        """Vérifie si ce projet a une source scrapée liée"""
        return hasattr(self, 'scraped_source') and self.scraped_source is not None
    
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
        """Calcule le pourcentage de progression basé sur les documents"""
        total_docs = DocumentType.objects.filter(obligatoire=True).count()
        if total_docs == 0:
            return 0
        
        submitted_docs = self.documents.filter(
            document_type__obligatoire=True,
            status__in=['submitted', 'approved']
        ).count()
        
        return int((submitted_docs / total_docs) * 100)
    
    @property
    def missing_documents(self):
        """Retourne la liste des documents manquants"""
        required_types = DocumentType.objects.filter(obligatoire=True)
        submitted_types = self.documents.filter(
            status__in=['submitted', 'approved']
        ).values_list('document_type_id', flat=True)
        
        missing = required_types.exclude(id__in=submitted_types)
        return [{"id": doc.id, "name": doc.name} for doc in missing]

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
        ('scraping', 'Données scrapées'),
        ('request', 'Demande client'),  # NOUVEAU
        ('request_approved', 'Demande approuvée'),  # NOUVEAU
        ('request_rejected', 'Demande rejetée'),  # NOUVEAU
    ]
    
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, verbose_name="Type")
    title = models.CharField(max_length=200, verbose_name="Titre")
    message = models.TextField(verbose_name="Message")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, null=True, blank=True, verbose_name="Projet")
    consultant = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='notifications', verbose_name="Consultant")
    read = models.BooleanField(default=False, verbose_name="Lu")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Créé le")
    project_request = models.ForeignKey(
        'ProjectRequest',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
        verbose_name="Demande liée"
    )
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
            return f"il y a {diff.days} jour{'s' if diff.days > 1 else ''}"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"il y a {hours} heure{'s' if hours > 1 else ''}"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"il y a {minutes} minute{'s' if minutes > 1 else ''}"
        else:
            return "à l'instant"

# =============================================================================
# MODÈLE POUR LES STATISTIQUES DE SCRAPING
# =============================================================================
class ScrapingSession(models.Model):
    """Modèle pour tracker les sessions de scraping"""
    # source = models.CharField(max_length=10, choices=ScrapedProject.SOURCE_CHOICES, verbose_name="Source")
    source = models.CharField(
        max_length=15,  # Au lieu de 10
        choices=ScrapedProject.SOURCE_CHOICES, 
        verbose_name="Source"
    )
    started_at = models.DateTimeField(auto_now_add=True, verbose_name="Démarrée le")
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="Terminée le")
    
    projects_found = models.IntegerField(default=0, verbose_name="Projets trouvés")
    projects_saved = models.IntegerField(default=0, verbose_name="Projets sauvegardés")
    projects_updated = models.IntegerField(default=0, verbose_name="Projets mis à jour")
    
    success = models.BooleanField(default=False, verbose_name="Succès")
    error_message = models.TextField(blank=True, verbose_name="Message d'erreur")
    
    # Paramètres de la session
    max_pages = models.IntegerField(null=True, blank=True, verbose_name="Pages max")
    headless_mode = models.BooleanField(default=False, verbose_name="Mode headless")
    
    class Meta:
        ordering = ['-started_at']
        verbose_name = "Session de scraping"
        verbose_name_plural = "Sessions de scraping"
    
    def __str__(self):
        status = "✅" if self.success else "❌"
        return f"{status} {self.source} - {self.started_at.strftime('%d/%m/%Y %H:%M')}"
    
    @property
    def duration(self):
        """Durée de la session"""
        if self.completed_at:
            return self.completed_at - self.started_at
        return None

class ProjectRequest(models.Model):
    """Modèle pour les demandes de projets des clients"""
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('approved', 'Approuvée'),
        ('rejected', 'Rejetée'),
        ('in_progress', 'En cours de traitement'),
    ]

    # Informations de base
    client = models.ForeignKey(
        CustomUser, 
        on_delete=models.CASCADE, 
        related_name='project_requests',
        verbose_name="Client"
    )
    projects = models.ManyToManyField(
        ScrapedProject,
        related_name='requests',
        verbose_name="Projets demandés"
    )
    
    # Contenu de la demande
    message = models.TextField(verbose_name="Message du client")
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='pending',
        verbose_name="Statut"
    )
    
    # Informations client (snapshot au moment de la demande)
    client_info = models.JSONField(default=dict, verbose_name="Info client")
    
    # Traitement admin
    admin_response = models.TextField(blank=True, verbose_name="Réponse admin")
    processed_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='processed_requests',
        verbose_name="Traité par"
    )
    processed_at = models.DateTimeField(null=True, blank=True, verbose_name="Traité le")
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Créé le")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Mis à jour le")
    
    # Priorité (calculée automatiquement)
    priority_score = models.IntegerField(default=0, verbose_name="Score de priorité")
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Demande de projet"
        verbose_name_plural = "Demandes de projets"
    
    def __str__(self):
        return f"Demande #{self.id} - {self.client.full_name} ({self.get_status_display()})"
    
    @property
    def projects_count(self):
        """Nombre de projets demandés"""
        return self.projects.count()
    
    @property
    def total_funding_requested(self):
        """Montant total des financements demandés"""
        from django.db.models import Sum
        total = self.projects.aggregate(
            total=Sum('funding_amount')
        )['total'] or 0
        return total
    
    @property
    def time_since_request(self):
        """Temps écoulé depuis la demande"""
        from django.utils import timezone
        diff = timezone.now() - self.created_at
        
        if diff.days > 0:
            return f"{diff.days} jour{'s' if diff.days > 1 else ''}"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours} heure{'s' if hours > 1 else ''}"
        else:
            minutes = diff.seconds // 60
            return f"{minutes} minute{'s' if minutes > 1 else ''}"
    
    def calculate_priority_score(self):
        """Calcule un score de priorité basé sur plusieurs critères"""
        score = 0
        
        # Nombre de projets (plus = plus prioritaire)
        score += min(self.projects_count * 10, 50)
        
        # Montant total (plus élevé = plus prioritaire)
        total_funding = self.total_funding_requested
        if total_funding > 1000000:
            score += 30
        elif total_funding > 500000:
            score += 20
        elif total_funding > 100000:
            score += 10
        
        # Qualité des données des projets
        avg_completeness = self.projects.aggregate(
            avg_score=models.Avg('data_completeness_score')
        )['avg_score'] or 0
        score += int(avg_completeness / 10)
        
        # Ancienneté de la demande (plus ancien = plus prioritaire)
        days_old = (timezone.now() - self.created_at).days
        score += min(days_old * 2, 20)
        
        return min(score, 100)  # Max 100
    
    def save(self, *args, **kwargs):
        """Override save pour calculer le score et créer les notifications"""
        # Vérifier si c'est une nouvelle demande
        is_new = self.pk is None
        
        # Calculer le score de priorité avant sauvegarde (seulement si l'objet existe déjà)
        if self.pk:
            self.priority_score = self.calculate_priority_score()
        
        # Sauvegarder l'objet
        super().save(*args, **kwargs)
        
        # Créer des notifications pour les admins si c'est une nouvelle demande
        if is_new:
            self.create_admin_notification()
    
    def create_admin_notification(self):
        """Créer une notification pour tous les administrateurs"""
        # Récupérer tous les administrateurs actifs
        admins = CustomUser.objects.filter(role='admin', actif=True)
        
        # Créer une notification pour chaque admin
        for admin in admins:
            Notification.objects.create(
                type='request',
                title='🔔 Nouvelle demande client',
                message=f'Le client {self.client.full_name} ({self.client.company_name or "Entreprise non spécifiée"}) a soumis une demande pour {self.projects_count} projet(s). Priorité: {self.priority_score}/100',
                consultant=admin,
                project_request=self,
                read=False
            )
    
    def approve(self, admin_user, response_message=""):
        """Approuver la demande"""
        self.status = 'approved'
        self.processed_by = admin_user
        self.processed_at = timezone.now()
        self.admin_response = response_message
        self.save()
        
        # Créer une notification pour le client
        Notification.objects.create(
            type='request_approved',
            title='✅ Demande approuvée',
            message=f'Excellente nouvelle ! Votre demande de {self.projects_count} projet(s) a été approuvée. Notre équipe va vous contacter sous 48h pour débuter l\'accompagnement.',
            consultant=self.client,
            project_request=self,
            read=False
        )
    
    def reject(self, admin_user, response_message):
        """Rejeter la demande"""
        self.status = 'rejected'
        self.processed_by = admin_user
        self.processed_at = timezone.now()
        self.admin_response = response_message
        self.save()
        
        # Créer une notification pour le client
        Notification.objects.create(
            type='request_rejected',
            title='❌ Demande rejetée',
            message=f'Votre demande a été examinée par notre équipe. Motif: {response_message[:100]}{"..." if len(response_message) > 100 else ""}',
            consultant=self.client,
            project_request=self,
            read=False
        )
    
    def set_in_progress(self, admin_user):
        """Marquer la demande comme en cours de traitement"""
        self.status = 'in_progress'
        self.processed_by = admin_user
        self.processed_at = timezone.now()
        self.save()
        
        # Créer une notification pour le client
        Notification.objects.create(
            type='info',
            title='🔄 Demande en cours de traitement',
            message=f'Votre demande de {self.projects_count} projet(s) est maintenant en cours d\'examen par notre équipe. Nous vous tiendrons informé de l\'avancement.',
            consultant=self.client,
            project_request=self,
            read=False
        )
    
    def get_priority_level(self):
        """Retourne le niveau de priorité en texte"""
        if self.priority_score >= 80:
            return "Très haute"
        elif self.priority_score >= 60:
            return "Haute"
        elif self.priority_score >= 40:
            return "Moyenne"
        else:
            return "Basse"
    
    def get_priority_color(self):
        """Retourne la couleur CSS pour la priorité"""
        if self.priority_score >= 80:
            return "text-red-600 bg-red-50"
        elif self.priority_score >= 60:
            return "text-orange-600 bg-orange-50"
        elif self.priority_score >= 40:
            return "text-yellow-600 bg-yellow-50"
        else:
            return "text-green-600 bg-green-50"
    
    def can_be_processed(self):
        """Vérifie si la demande peut être traitée"""
        return self.status == 'pending' and self.projects_count > 0
    
    def get_estimated_processing_time(self):
        """Estime le temps de traitement basé sur la priorité"""
        if self.priority_score >= 80:
            return "24-48h"
        elif self.priority_score >= 60:
            return "2-3 jours"
        elif self.priority_score >= 40:
            return "3-5 jours"
        else:
            return "5-7 jours"