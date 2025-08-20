from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'projects', views.ProjectViewSet, basename='project')
router.register(r'document-types', views.DocumentTypeViewSet, basename='documenttype')
router.register(r'notifications', views.NotificationViewSet, basename='notification')
router.register(r'consultants', views.ConsultantViewSet, basename='consultant')
router.register(r'scraped-projects', views.ScrapedProjectViewSet, basename='scrapedproject')
router.register(r'scraping-sessions', views.ScrapingSessionViewSet, basename='scrapingsession')
router.register(r'project-requests', views.ProjectRequestViewSet, basename='projectrequest')
router.register(r'project-alerts', views.ProjectAlertViewSet, basename='projectalert')
router.register(r'documents', views.DocumentViewSet, basename='document')

urlpatterns = [
    path('', include(router.urls)),
    
    # Routes d'authentification
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/check-role/', views.check_user_role, name='check_role'),
    path('auth/change-password/', views.ChangePasswordView.as_view(), name='change_password'),
    path('auth/upload-profile-picture/', views.UploadProfilePictureView.as_view(), name='upload_profile_picture'),
    
    path('auth/profile/', views.ProfileView.as_view(), name='profile'),  
    path('auth/user/', views.ProfileView.as_view(), name='user'),
    path('project-alerts/stats/', views.ProjectAlertStatsView.as_view(), name='project-alerts-stats'),  
    # Routes de debug
    path('auth/test/', views.auth_test, name='auth_test'),
    path('auth/debug/', views.auth_debug, name='auth_debug'),
    
    # Routes DRF par défaut
    path('auth/', include('rest_framework.urls')),
]