# =============================================================================
# FICHIER: main_app/serializers.py - SERIALIZERS COMPLETS AVEC SCRAPED PROJECTS
# =============================================================================
from rest_framework import serializers
from .models import (
    CustomUser, Project, Document, DocumentType, Notification, 
    ScrapedProject, ScrapingSession
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
    
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name',
                 'phone', 'level', 'department', 'date_embauche', 'profile_picture', 'stats']
        read_only_fields = ['username', 'level', 'department', 'date_embauche']
    
    def get_stats(self, obj):
        return {
            'active_projects': Project.objects.filter(consultant=obj, status__in=['progress', 'ready']).count(),
            'completed_projects': Project.objects.filter(consultant=obj, status='approved').count(),
            'pending_projects': Project.objects.filter(consultant=obj, status='progress').count(),
            'success_rate': 95
        }

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
# SERIALIZERS POUR LES PROJETS
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