from django.urls import path
from . import views

urlpatterns = [
    path('', views.login_view, name='login'),
    path('dashboard/', views.dashboard_view, name='dashboard'),
    path('logout/', views.logout_view, name='logout'),
    
    # API Endpoints
    path('api/cotisations/', views.api_get_cotisations, name='api_cotisations'),
    path('api/toggle-payment/', views.api_toggle_payment, name='api_toggle_payment'),
    path('api/stats/', views.api_get_stats, name='api_stats'),
    path('api/year-completion/', views.api_check_year_completion, name='api_year_completion'),
    path('api/export/', views.api_export_excel, name='api_export'),
]