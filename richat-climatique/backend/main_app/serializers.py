# =============================================================================
# FICHIER: main_app/serializers.py - SERIALIZERS COMPLETS
# =============================================================================
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

class DocumentSerializer(serializers.ModelSerializer):
    document_type_name = serializers.CharField(source='document_type.name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)
    
    class Meta:
        model = Document
        fields = ['id', 'name', 'file', 'status', 'date_soumission', 'date_expiration', 
                 'notes', 'document_type', 'document_type_name', 'project', 'project_name',
                 'uploaded_by_name']
        read_only_fields = ['uploaded_by_name']

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