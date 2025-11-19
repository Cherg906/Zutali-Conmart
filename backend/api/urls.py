"""
URL configuration for Zutali Conmart API.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'categories', views.CategoryViewSet)
router.register(r'products', views.ProductViewSet)
router.register(r'quotations', views.QuotationViewSet)
router.register(r'reviews', views.ReviewViewSet)
router.register(r'messages', views.MessageViewSet)
router.register(r'verifications', views.VerificationRequestViewSet)
router.register(r'subscription-plans', views.SubscriptionPlanViewSet, basename='subscription-plan')
router.register(r'subscriptions', views.SubscriptionViewSet, basename='subscription')
router.register(r'payment-transactions', views.PaymentTransactionViewSet, basename='payment-transaction')

urlpatterns = [
    # API Root view
    path('', views.api_root, name='api-root'),
    
    # Authentication
    path('auth/register/', views.register, name='register'),
    path('auth/login/', views.login, name='login'),
    path('auth/logout/', views.logout, name='logout'),
    
    # Profile endpoints
    path('profile/', views.user_profile, name='user-profile'),
    path('profile/avatar/', views.upload_avatar, name='upload-avatar'),
    path('profile/change-password/', views.change_password, name='change-password'),
    path('profile/verification-document/', views.upload_verification_document, name='upload-verification-document'),
    path('profile/product-owner/', views.product_owner_profile, name='product-owner-profile'),
    path('users/verification-status/', views.get_user_verification_status, name='user-verification-status'),
    path('users/verification/submit/', views.submit_user_verification, name='submit-user-verification'),
    path('product-owners/verification-status/', views.product_owner_verification_status, name='product-owner-verification-status'),
    path('product-owners/my-verification-status/', views.product_owner_verification_status, name='product-owner-verification-status-alias'),
    path('product-owners/verification/submit/', views.submit_product_owner_verification, name='submit-product-owner-verification'),
    path('product-owners/<uuid:owner_id>/update-verification/', views.submit_product_owner_verification, name='product-owner-update-verification'),
    path('admin/product-owners/verifications/<uuid:verification_id>/review/', views.review_product_owner_verification, name='review-product-owner-verification'),
    path('admin/verification-requests/', views.admin_verification_requests, name='admin-verification-requests'),
    path('admin/verification-requests/<uuid:verification_id>/approve/', views.admin_approve_verification_request, name='admin-approve-verification-request'),
    path('admin/verification-requests/<uuid:verification_id>/reject/', views.admin_reject_verification_request, name='admin-reject-verification-request'),
    
    # User verification review (admin only)
    path('admin/users/<uuid:user_id>/review-verification/', views.review_user_verification, name='review-user-verification'),
    
    # Admin endpoints
    path('admin/dashboard/', views.admin_dashboard, name='admin-dashboard'),
    path('admin/users/', views.admin_users, name='admin-users'),
    path('admin/users/<int:user_id>/toggle-status/', views.admin_toggle_user_status, name='admin-toggle-user-status'),
    path('admin/products/', views.admin_products, name='admin-products'),
    path('admin/products/<uuid:product_id>/moderate/', views.admin_moderate_product, name='admin-moderate-product'),
    
    # User dashboard
    path('user/dashboard/', views.user_dashboard, name='user-dashboard'),
    path('user/favorites/<uuid:product_id>/toggle/', views.toggle_favorite_product, name='toggle-favorite-product'),

    # Product owner dashboard
    path('product-owner/dashboard/', views.product_owner_dashboard, name='product-owner-dashboard'),
    path('product-owner/favorites/', views.owner_favorite_insights, name='product-owner-favorites'),

    # Subscription and payments
    path('payments/initialize/', views.initialize_subscription_payment, name='initialize-subscription-payment'),
    path('payments/callback/', views.chapa_payment_callback, name='chapa-payment-callback'),
    
    # Contact form
    path('contact/', views.contact_form, name='contact-form'),
    
    # Search endpoint
    path('search/', views.search, name='search'),
    
    # Router URLs (these will be at /api/categories/, /api/products/, etc.)
    path('', include(router.urls)),
]
