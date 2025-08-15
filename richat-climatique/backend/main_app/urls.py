# =============================================================================
# URLS CORRIGÉES SANS DOUBLONS
# =============================================================================
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Configuration du routeur API
router = DefaultRouter()
router.register(r'projects', views.ProjectViewSet)
router.register(r'documents', views.DocumentViewSet)
router.register(r'document-types', views.DocumentTypeViewSet)
router.register(r'notifications', views.NotificationViewSet, basename='notification')
router.register(r'consultants', views.ConsultantViewSet, basename='consultant')
router.register(r'scraped-projects', views.ScrapedProjectViewSet)
router.register(r'scraping-sessions', views.ScrapingSessionViewSet)
router.register(r'project-requests', views.ProjectRequestViewSet)


urlpatterns = [
    # API Routes avec le routeur
    path('', include(router.urls)),
    
    # Routes d'authentification (SANS DOUBLONS)
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/profile/', views.ProfileView.as_view(), name='profile'),
    path('auth/check-role/', views.check_user_role, name='check_role'),
    
    # Routes de debug pour tester l'authentification
    path('auth/test/', views.auth_test, name='auth_test'),
    path('auth/debug/', views.auth_debug, name='auth_debug'),
    
    # Routes DRF par défaut
    path('auth/', include('rest_framework.urls')),
]