# main_app/serializers.py 
# =============================================================================
# FICHIER: main_app/serializers.py - TOUS LES SERIALIZERS
# =============================================================================
from rest_framework import serializers
from .models import CustomUser, Project, Document, DocumentType, Notification

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