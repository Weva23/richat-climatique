from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from .models import CustomUser, Project, Document, DocumentType, Notification

# =============================================================================
# ADMIN POUR LES UTILISATEURS
# =============================================================================
@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'level', 'department', 'actif']
    list_filter = ['level', 'department', 'actif', 'date_joined']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    
    fieldsets = UserAdmin.fieldsets + (
        ('Informations supplémentaires', {
            'fields': ('level', 'phone', 'department', 'date_embauche', 'actif', 'profile_picture')
        }),
    )

# =============================================================================
# ADMIN POUR LES PROJETS
# =============================================================================
@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'type_project', 'status', 'fund', 'score_viabilite', 'rating_stars_display', 'consultant', 'created_at']
    list_filter = ['status', 'type_project', 'fund', 'consultant']
    search_fields = ['name', 'contact_name', 'description']
    readonly_fields = ['created_at', 'updated_at', 'rating_stars', 'progress_percentage']
    
    fieldsets = (
        ('Informations générales', {
            'fields': ('name', 'description', 'type_project', 'status', 'fund')
        }),
        ('Évaluation', {
            'fields': ('score_viabilite', 'rating_stars', 'montant_demande')
        }),
        ('Contact', {
            'fields': ('contact_name', 'contact_email', 'contact_phone')
        }),
        ('Assignation', {
            'fields': ('consultant', 'date_echeance')
        }),
        ('Métadonnées', {
            'fields': ('progress_percentage', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def rating_stars_display(self, obj):
        stars = '★' * obj.rating_stars + '☆' * (5 - obj.rating_stars)
        return format_html(f'<span style="color: gold;">{stars}</span>')
    rating_stars_display.short_description = 'Étoiles'

# =============================================================================
# ADMIN POUR LES DOCUMENTS
# =============================================================================
@admin.register(DocumentType)
class DocumentTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'obligatoire', 'description']
    list_filter = ['obligatoire']
    search_fields = ['name']

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['name', 'project', 'document_type', 'status', 'date_soumission']
    list_filter = ['status', 'document_type', 'date_soumission']
    search_fields = ['name', 'project__name']
    readonly_fields = ['date_soumission']

# =============================================================================
# ADMIN POUR LES NOTIFICATIONS
# =============================================================================
@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['title', 'type', 'consultant', 'project', 'read', 'created_at']
    list_filter = ['type', 'read', 'created_at']
    search_fields = ['title', 'message', 'consultant__username']
    readonly_fields = ['created_at']