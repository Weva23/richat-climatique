# =============================================================================
# FICHIER: main_app/serializers.py - SERIALIZERS COMPLETS
# =============================================================================
from django.forms import ValidationError
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.db import models
from .models import (
    CustomUser, Project, Document, DocumentType, Notification, ProjectAlert, 
    ScrapedProject, ScrapingSession, ProjectRequest
)

# =============================================================================
# SERIALIZERS POUR LES UTILISATEURS
# =============================================================================
class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    initials = serializers.ReadOnlyField()
    active_projects_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 
                 'initials', 'level', 'department', 'phone', 'date_embauche', 'actif', 
                 'active_projects_count']

class UserProfileSerializer(serializers.ModelSerializer):
    stats = serializers.SerializerMethodField()
    full_name = serializers.ReadOnlyField()
    is_admin = serializers.ReadOnlyField()
    is_client = serializers.ReadOnlyField()
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'initials', 'phone', 'company_name', 'role', 'role_display',
            'level', 'department', 'date_embauche', 'profile_picture',
            'is_admin', 'is_client', 'email_verified', 'date_joined', 'stats'
        ]
        read_only_fields = ['username', 'date_joined']
    
    def get_stats(self, obj):
        return {
            'active_projects': Project.objects.filter(consultant=obj, status__in=['progress', 'ready']).count(),
            'completed_projects': Project.objects.filter(consultant=obj, status='approved').count(),
            'pending_projects': Project.objects.filter(consultant=obj, status='progress').count(),
            'success_rate': 95
        }

class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer pour l'inscription - CLIENTS UNIQUEMENT"""
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = CustomUser
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'phone', 'company_name'
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Les mots de passe ne correspondent pas")
        
        if CustomUser.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError("Cet email est déjà utilisé")
            
        if CustomUser.objects.filter(username=attrs['username']).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà pris")
        
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        user = CustomUser.objects.create_user(
            password=password,
            role='client',
            level='N1',
            **validated_data
        )
        return user

class UserLoginSerializer(serializers.Serializer):
    """Serializer pour la connexion"""
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username and password:
            if '@' in username:
                try:
                    user_obj = CustomUser.objects.get(email=username)
                    username = user_obj.username
                except CustomUser.DoesNotExist:
                    pass
            
            user = authenticate(username=username, password=password)
            
            if not user:
                raise serializers.ValidationError("Identifiants incorrects")
            
            if not user.is_active:
                raise serializers.ValidationError("Compte désactivé")
            
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError("Username et password requis")


# Dans serializers.py :
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
class ChangePasswordSerializer(serializers.Serializer):
    """Serializer pour le changement de mot de passe"""
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Le mot de passe actuel est incorrect")
        return value
    
    def validate_new_password(self, value):
        # Validation Django standard + personnalisée
        user = self.context['request'].user
        validate_password(value, user)
        return value
    
    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user

class ProfilePictureSerializer(serializers.ModelSerializer):
    """Serializer pour l'upload de photo de profil"""
    profile_picture = serializers.ImageField(required=True)
    
    class Meta:
        model = CustomUser
        fields = ['profile_picture']
    
    def validate_profile_picture(self, value):
        # Validation de la taille (max 5MB)
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("L'image ne doit pas dépasser 5MB")
        
        # Validation du type de fichier
        if not value.content_type.startswith('image/'):
            raise serializers.ValidationError("Le fichier doit être une image")
        
        return value
class ProjectAlertSerializer(serializers.ModelSerializer):
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    priority_level_display = serializers.CharField(source='get_priority_level_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    time_since_alert = serializers.ReadOnlyField()
    alert_icon = serializers.ReadOnlyField()
    priority_color = serializers.ReadOnlyField()
    scraped_project_id = serializers.IntegerField(source='scraped_project.id', read_only=True)
    
    class Meta:
        model = ProjectAlert
        fields = [
            'id', 'scraped_project', 'scraped_project_id', 'title', 'source', 'source_display',
            'source_url', 'description', 'organization', 'project_type',
            'total_funding', 'funding_amount', 'country', 'data_completeness_score',
            'alert_created_at', 'is_new_this_week', 'is_featured',
            'priority_level', 'priority_level_display', 'priority_color',
            'status', 'status_display', 'email_sent', 'email_sent_at',
            'time_since_alert', 'alert_icon'
        ]
        read_only_fields = ['alert_created_at', 'time_since_alert', 'alert_icon', 'priority_color']
# =============================================================================
# SERIALIZERS POUR LES PROJETS SCRAPÉS
# =============================================================================
class ScrapedProjectSerializer(serializers.ModelSerializer):
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    linked_project_name = serializers.CharField(source='linked_project.name', read_only=True)
    can_create_project = serializers.ReadOnlyField()
    
    class Meta:
        model = ScrapedProject
        fields = [
            'id', 'title', 'source', 'source_display', 'source_url', 'source_id',
            'description', 'organization', 'project_type', 'status',
            'total_funding', 'funding_amount', 'currency', 'country', 'region',
            'focal_areas', 'gef_project_id', 'gcf_document_type', 'cover_date',
            'document_url', 'additional_links', 'scraped_at', 'last_updated',
            'scraping_source', 'linked_project', 'linked_project_name',
            'data_completeness_score', 'is_relevant_for_mauritania', 'needs_review',
            'can_create_project'
        ]
        read_only_fields = ['scraped_at', 'last_updated', 'unique_hash']

from rest_framework import serializers
from .models import Document, ScrapedProject, CustomUser
from django.db.models import Count, Q
from django.utils import timezone
from django.db import transaction
import logging

logger = logging.getLogger(__name__)

class DocumentSerializer(serializers.ModelSerializer):
    file_name = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()
    project_title = serializers.SerializerMethodField()
    scraped_project_title = serializers.SerializerMethodField()
    uploaded_by_name = serializers.SerializerMethodField()
    uploaded_by_email = serializers.SerializerMethodField()
    uploaded_by_company = serializers.SerializerMethodField()
    uploaded_by = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    status_color = serializers.ReadOnlyField()
    time_since_upload = serializers.SerializerMethodField()
    document_type_name = serializers.SerializerMethodField()
    project = serializers.SerializerMethodField()
    scraped_project = serializers.SerializerMethodField()
    traite_par_name = serializers.SerializerMethodField()
   
    class Meta:
        model = Document
        fields = [
            'id', 'project', 'project_title', 'scraped_project', 'scraped_project_title',
            'file', 'file_name', 'file_size', 'description', 'status', 'status_display', 'status_color',
            'uploaded_at', 'uploaded_by', 'uploaded_by_name', 'uploaded_by_email', 'uploaded_by_company',
            'notes', 'notes_admin', 'motif_rejet', 'message_accompagnement',  # NOUVEAUX CHAMPS
            'document_type', 'document_type_name', 'date_soumission', 
            'date_expiration', 'reviewed_at', 'rejection_reason', 'name', 'time_since_upload',
            'traite_par', 'traite_par_name'  # NOUVEAU CHAMP
        ]
        read_only_fields = ['uploaded_by', 'uploaded_at', 'reviewed_at', 'traite_par']
    
    def get_file_name(self, obj):
        return obj.file.name.split('/')[-1] if obj.file else obj.name
    
    def get_file_size(self, obj):
        return obj.file.size if obj.file else 0
    
    def get_traite_par_name(self, obj):
        """Nom de l'administrateur qui a traité le document"""
        return obj.traite_par.full_name if obj.traite_par else None
    
    def get_project(self, obj):
        if obj.project:
            return {
                'id': obj.project.id,
                'title': obj.project.name,
                'name': obj.project.name,
                'description': getattr(obj.project, 'description', ''),
                'status': getattr(obj.project, 'status', ''),
                'project_type': getattr(obj.project, 'type_project', ''),
                'funding_amount': float(obj.project.montant_demande) if hasattr(obj.project, 'montant_demande') and obj.project.montant_demande else None,
                'currency': 'USD',
                'country': getattr(obj.project, 'country', 'Mauritania'),
                'organization': getattr(obj.project, 'contact_name', '') or getattr(obj.project, 'organization', ''),
                'source_url': None,
                'additional_links': None,
            }
        return None
    
    def get_project_title(self, obj):
        return obj.project.name if obj.project else None
    
    def get_scraped_project(self, obj):
        if obj.scraped_project:
            return {
                'id': obj.scraped_project.id,
                'title': obj.scraped_project.title,
                'name': obj.scraped_project.title,
                'description': obj.scraped_project.description or '',
                'status': obj.scraped_project.status or '',
                'project_type': obj.scraped_project.project_type or '',
                'total_funding': obj.scraped_project.total_funding or '',
                'funding_amount': float(obj.scraped_project.funding_amount) if obj.scraped_project.funding_amount else None,
                'currency': obj.scraped_project.currency or 'USD',
                'country': obj.scraped_project.country or 'Mauritania',
                'organization': obj.scraped_project.organization or '',
                'source': obj.scraped_project.source or '',
                'source_url': obj.scraped_project.source_url or '',
                'additional_links': obj.scraped_project.additional_links or '',
                'focal_areas': obj.scraped_project.focal_areas or '',
                'gef_project_id': getattr(obj.scraped_project, 'gef_project_id', ''),
                'gcf_document_type': getattr(obj.scraped_project, 'gcf_document_type', ''),
                'cover_date': getattr(obj.scraped_project, 'cover_date', ''),
                'data_completeness_score': getattr(obj.scraped_project, 'data_completeness_score', 0),
            }
        return None
    
    def get_scraped_project_title(self, obj):
        return obj.scraped_project.title if obj.scraped_project else None
    
    def get_uploaded_by(self, obj):
        if obj.uploaded_by:
            return {
                'id': obj.uploaded_by.id,
                'full_name': obj.uploaded_by.full_name,
                'email': obj.uploaded_by.email,
                'company_name': getattr(obj.uploaded_by, 'company_name', '')
            }
        return None
    
    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.full_name if obj.uploaded_by else None
    
    def get_uploaded_by_email(self, obj):
        return obj.uploaded_by.email if obj.uploaded_by else None
    
    def get_uploaded_by_company(self, obj):
        return getattr(obj.uploaded_by, 'company_name', '') if obj.uploaded_by else None
    
    def get_document_type_name(self, obj):
        return obj.document_type.name if obj.document_type else None
    
    def get_time_since_upload(self, obj):
        if not obj.uploaded_at:
            return ""
        
        from django.utils import timezone
        diff = timezone.now() - obj.uploaded_at
        
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


# Serializer spécialisé pour la soumission de documents
class DocumentSubmissionSerializer(serializers.ModelSerializer):
    """Serializer pour la soumission de documents par les clients"""
    
    class Meta:
        model = Document
        fields = [
            'scraped_project', 'file', 'name', 'description', 
            'message_accompagnement'  # NOUVEAU: Message du client
        ]
    
    def validate_file(self, value):
        """Validation du fichier"""
        if not value:
            raise serializers.ValidationError("Un fichier est requis")
        
        # Vérifier la taille (10MB max)
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("Le fichier ne peut pas dépasser 10MB")
        
        # Vérifier l'extension
        allowed_extensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif']
        file_extension = value.name.split('.')[-1].lower() if '.' in value.name else ''
        if file_extension not in allowed_extensions:
            raise serializers.ValidationError(f"Type de fichier non autorisé: {value.name}")
        
        return value
    
    def validate_message_accompagnement(self, value):
        """Validation du message d'accompagnement"""
        if not value or not value.strip():
            raise serializers.ValidationError("Le message d'accompagnement est requis")
        
        if len(value.strip()) < 10:
            raise serializers.ValidationError("Le message doit contenir au moins 10 caractères")
        
        return value.strip()


# Serializer pour l'action d'approbation/rejet par l'admin
class DocumentActionSerializer(serializers.Serializer):
    """Serializer pour les actions admin sur les documents"""
    action = serializers.ChoiceField(choices=['approve', 'reject'], required=True)
    notes_admin = serializers.CharField(
        required=False, 
        allow_blank=True,
        help_text="Notes administrateur (optionnel)"
    )
    motif_rejet = serializers.CharField(
        required=False, 
        allow_blank=True,
        help_text="Motif de rejet (requis pour rejeter)"
    )
    
    def validate(self, data):
        """Validation selon l'action"""
        action = data.get('action')
        motif_rejet = data.get('motif_rejet', '').strip()
        
        if action == 'reject' and not motif_rejet:
            raise serializers.ValidationError({
                'motif_rejet': 'Le motif de rejet est requis pour rejeter un document'
            })
        
        return data
class ScrapedProjectCreateProjectSerializer(serializers.Serializer):
    """Serializer pour créer un projet Django depuis un projet scrapé"""
    consultant_id = serializers.IntegerField()
    
    def validate_consultant_id(self, value):
        try:
            consultant = CustomUser.objects.get(id=value, actif=True)
            return value
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError("Consultant non trouvé ou inactif")

class ScrapingSessionSerializer(serializers.ModelSerializer):
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    duration = serializers.ReadOnlyField()
    
    class Meta:
        model = ScrapingSession
        fields = [
            'id', 'source', 'source_display', 'started_at', 'completed_at',
            'projects_found', 'projects_saved', 'projects_updated',
            'success', 'error_message', 'max_pages', 'headless_mode', 'duration'
        ]

# =============================================================================
# SERIALIZERS POUR LES DOCUMENTS
# =============================================================================
class DocumentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentType
        fields = '__all__'


# =============================================================================
# SERIALIZERS POUR LES PROJETS DJANGO
# =============================================================================
class ProjectSerializer(serializers.ModelSerializer):
    consultant_details = UserSerializer(source='consultant', read_only=True)
    documents = DocumentSerializer(many=True, read_only=True)
    missing_documents = serializers.ReadOnlyField()
    submitted_documents = serializers.SerializerMethodField()
    rating_stars = serializers.ReadOnlyField()
    progress_percentage = serializers.ReadOnlyField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    type_display = serializers.CharField(source='get_type_project_display', read_only=True)
    fund_display = serializers.CharField(source='get_fund_display', read_only=True)
    has_scraped_source = serializers.ReadOnlyField()
    
    class Meta:
        model = Project
        fields = '__all__'
    
    def get_submitted_documents(self, obj):
        """Retourne les documents soumis avec leurs détails"""
        submitted_docs = obj.documents.filter(status='submitted')
        return DocumentSerializer(submitted_docs, many=True).data

class ProjectCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour créer/modifier un projet"""
    class Meta:
        model = Project
        exclude = ['created_at', 'updated_at']

# =============================================================================
# SERIALIZERS POUR LES NOTIFICATIONS
# =============================================================================
class NotificationSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.name', read_only=True)
    time_ago = serializers.ReadOnlyField()
    
    class Meta:
        model = Notification
        fields = ['id', 'type', 'title', 'message', 'project_name', 'read', 'created_at', 'time_ago']

# =============================================================================
# SERIALIZERS POUR LES DEMANDES DE PROJETS
# =============================================================================
class ProjectRequestSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.full_name', read_only=True)
    client_company = serializers.CharField(source='client.company_name', read_only=True)
    projects_count = serializers.ReadOnlyField()
    total_funding_requested = serializers.ReadOnlyField()
    time_since_request = serializers.ReadOnlyField()
    projects_details = ScrapedProjectSerializer(source='projects', many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    processed_by_name = serializers.CharField(source='processed_by.full_name', read_only=True)
    
    class Meta:
        model = ProjectRequest
        fields = [
            'id', 'client', 'client_name', 'client_company', 'message', 
            'status', 'status_display', 'client_info', 'admin_response',
            'processed_by', 'processed_by_name', 'processed_at', 'created_at', 
            'updated_at', 'priority_score', 'projects_count', 
            'total_funding_requested', 'time_since_request', 'projects_details'
        ]
        read_only_fields = ['processed_by', 'processed_at', 'priority_score']

# =============================================================================
# CORRECTION DU SERIALIZER ProjectRequestCreateSerializer
# =============================================================================

class ProjectRequestCreateSerializer(serializers.ModelSerializer):
    project_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True
    )
    client_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = ProjectRequest
        fields = ['client_id', 'project_ids', 'message', 'client_info']
    
    def create(self, validated_data):
        project_ids = validated_data.pop('project_ids')
        client_id = validated_data.pop('client_id')
        
        # Vérifier que le client existe
        try:
            client = CustomUser.objects.get(id=client_id, role='client')
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError("Client non trouvé")
        
        # Créer la demande
        request = ProjectRequest.objects.create(
            client=client,
            **validated_data
        )
        
        # Ajouter les projets
        projects = ScrapedProject.objects.filter(
            id__in=project_ids,
            linked_project__isnull=True  # Seulement les projets non liés
        )
        request.projects.set(projects)
        
        # Calculer et sauvegarder le score de priorité
        request.priority_score = request.calculate_priority_score()
        request.save()
        
        # NOUVEAU : Créer des notifications pour les admins
        self.create_admin_notifications(request)
        
        return request
    
    def create_admin_notifications(self, project_request):
        """Créer des notifications pour tous les administrateurs"""
        from .models import Notification, CustomUser
        
        # Récupérer tous les administrateurs actifs
        admins = CustomUser.objects.filter(role='admin', actif=True)
        
        # Créer une notification pour chaque admin
        for admin in admins:
            Notification.objects.create(
                type='request',
                title='🔔 Nouvelle demande client',
                message=f'Le client {project_request.client.full_name} ({project_request.client.company_name}) a soumis une demande pour {project_request.projects_count} projet(s). Priorité: {project_request.priority_score}/100',
                consultant=admin,
                project_request=project_request,
                read=False
            )

# =============================================================================
# SERIALIZERS POUR LES STATISTIQUES
# =============================================================================
class DashboardStatsSerializer(serializers.Serializer):
    """Serializer pour les statistiques du tableau de bord"""
    total_projects = serializers.IntegerField()
    ready_projects = serializers.IntegerField()
    pending_projects = serializers.IntegerField()
    avg_score = serializers.FloatField()
    total_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    
    # Statistiques des projets scrapés
    total_scraped = serializers.IntegerField()
    scraped_by_source = serializers.DictField()
    ready_for_conversion = serializers.IntegerField()
    
    # Sessions de scraping récentes
    recent_scraping_sessions = ScrapingSessionSerializer(many=True)

class ScrapedProjectStatsSerializer(serializers.Serializer):
    """Statistiques spécifiques aux projets scrapés"""
    total_scraped = serializers.IntegerField()
    by_source = serializers.DictField()
    by_completeness_score = serializers.DictField()
    ready_projects = serializers.IntegerField()
    linked_projects = serializers.IntegerField()
    needs_review = serializers.IntegerField()
    avg_completeness_score = serializers.FloatField()
    recent_sessions = ScrapingSessionSerializer(many=True)
    



class ProjectDocumentSubmissionSerializer(serializers.Serializer):
    project_id = serializers.PrimaryKeyRelatedField(queryset=ScrapedProject.objects.all())
    message = serializers.CharField(max_length=1000)
    documents = serializers.ListField(
        child=serializers.FileField(max_length=100, allow_empty_file=False),
        min_length=1,
        max_length=10
    )
    descriptions = serializers.ListField(
        child=serializers.CharField(max_length=255, allow_blank=True),
        min_length=1,
        max_length=10
    )

    def validate(self, data):
        if len(data['documents']) != len(data['descriptions']):
            raise ValidationError("Number of documents and descriptions must match")
        return data