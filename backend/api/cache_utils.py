"""
Redis caching utilities for Zutali Conmart
Handles popular products, user sessions, and performance optimization
"""
from django.core.cache import caches, cache
from django.conf import settings
import json
import logging
from typing import Any, Optional, List, Dict
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Get different cache instances
default_cache = caches['default']
products_cache = caches['products']
sessions_cache = caches['sessions']

class CacheManager:
    """Centralized cache management for Zutali Conmart"""
    
    # Cache key patterns
    POPULAR_PRODUCTS_KEY = "popular_products"
    TRENDING_PRODUCTS_KEY = "trending_products_{days}"
    PRODUCT_DETAILS_KEY = "product_details_{product_id}"
    USER_FAVORITES_KEY = "user_favorites_{user_id}"
    SUPPLIER_RATINGS_KEY = "supplier_ratings_{supplier_id}"
    CATEGORY_PRODUCTS_KEY = "category_products_{category_id}_{page}"
    SEARCH_RESULTS_KEY = "search_{query_hash}_{filters_hash}"
    USER_QUOTATIONS_KEY = "user_quotations_{user_id}"
    
    @staticmethod
    def get_popular_products(limit: int = 10) -> Optional[List[Dict]]:
        """Get popular products from cache"""
        try:
            cache_key = CacheManager.POPULAR_PRODUCTS_KEY
            popular_products = products_cache.get(cache_key)
            
            if popular_products is None:
                logger.info("Popular products not in cache, will need to compute")
                return None
            
            return popular_products[:limit]
        except Exception as e:
            logger.error(f"Error getting popular products from cache: {e}")
            return None
    
    @staticmethod
    def set_popular_products(products_data: List[Dict], timeout: int = 3600) -> bool:
        """Cache popular products"""
        try:
            cache_key = CacheManager.POPULAR_PRODUCTS_KEY
            products_cache.set(cache_key, products_data, timeout)
            logger.info(f"Cached {len(products_data)} popular products")
            return True
        except Exception as e:
            logger.error(f"Error caching popular products: {e}")
            return False
    
    @staticmethod
    def get_trending_products(days: int = 7, limit: int = 10) -> Optional[List[Dict]]:
        """Get trending products based on recent activity"""
        try:
            cache_key = CacheManager.TRENDING_PRODUCTS_KEY.format(days=days)
            trending_products = products_cache.get(cache_key)
            
            if trending_products is None:
                logger.info(f"Trending products for {days} days not in cache")
                return None
            
            return trending_products[:limit]
        except Exception as e:
            logger.error(f"Error getting trending products from cache: {e}")
            return None
    
    @staticmethod
    def set_trending_products(products_data: List[Dict], days: int = 7, timeout: int = 1800) -> bool:
        """Cache trending products"""
        try:
            cache_key = CacheManager.TRENDING_PRODUCTS_KEY.format(days=days)
            products_cache.set(cache_key, products_data, timeout)
            logger.info(f"Cached {len(products_data)} trending products for {days} days")
            return True
        except Exception as e:
            logger.error(f"Error caching trending products: {e}")
            return False
    
    @staticmethod
    def get_product_details(product_id: str) -> Optional[Dict]:
        """Get cached product details"""
        try:
            cache_key = CacheManager.PRODUCT_DETAILS_KEY.format(product_id=product_id)
            return products_cache.get(cache_key)
        except Exception as e:
            logger.error(f"Error getting product details from cache: {e}")
            return None
    
    @staticmethod
    def set_product_details(product_id: str, product_data: Dict, timeout: int = 1800) -> bool:
        """Cache product details"""
        try:
            cache_key = CacheManager.PRODUCT_DETAILS_KEY.format(product_id=product_id)
            products_cache.set(cache_key, product_data, timeout)
            return True
        except Exception as e:
            logger.error(f"Error caching product details: {e}")
            return False
    
    @staticmethod
    def invalidate_product_cache(product_id: str) -> bool:
        """Invalidate all cache entries for a product"""
        try:
            # Invalidate product details
            cache_key = CacheManager.PRODUCT_DETAILS_KEY.format(product_id=product_id)
            products_cache.delete(cache_key)
            
            # Invalidate popular and trending products
            products_cache.delete(CacheManager.POPULAR_PRODUCTS_KEY)
            
            # Invalidate trending products for different periods
            for days in [1, 7, 30]:
                trending_key = CacheManager.TRENDING_PRODUCTS_KEY.format(days=days)
                products_cache.delete(trending_key)
            
            logger.info(f"Invalidated cache for product {product_id}")
            return True
        except Exception as e:
            logger.error(f"Error invalidating product cache: {e}")
            return False
    
    @staticmethod
    def get_user_favorites(user_id: str) -> Optional[List[str]]:
        """Get user's favorite products from cache"""
        try:
            cache_key = CacheManager.USER_FAVORITES_KEY.format(user_id=user_id)
            return default_cache.get(cache_key)
        except Exception as e:
            logger.error(f"Error getting user favorites from cache: {e}")
            return None
    
    @staticmethod
    def set_user_favorites(user_id: str, favorites: List[str], timeout: int = 3600) -> bool:
        """Cache user's favorite products"""
        try:
            cache_key = CacheManager.USER_FAVORITES_KEY.format(user_id=user_id)
            default_cache.set(cache_key, favorites, timeout)
            return True
        except Exception as e:
            logger.error(f"Error caching user favorites: {e}")
            return False
    
    @staticmethod
    def get_supplier_ratings(supplier_id: str) -> Optional[Dict]:
        """Get supplier ratings and reviews summary"""
        try:
            cache_key = CacheManager.SUPPLIER_RATINGS_KEY.format(supplier_id=supplier_id)
            return default_cache.get(cache_key)
        except Exception as e:
            logger.error(f"Error getting supplier ratings from cache: {e}")
            return None
    
    @staticmethod
    def set_supplier_ratings(supplier_id: str, ratings_data: Dict, timeout: int = 1800) -> bool:
        """Cache supplier ratings summary"""
        try:
            cache_key = CacheManager.SUPPLIER_RATINGS_KEY.format(supplier_id=supplier_id)
            default_cache.set(cache_key, ratings_data, timeout)
            return True
        except Exception as e:
            logger.error(f"Error caching supplier ratings: {e}")
            return False
    
    @staticmethod
    def get_search_results(query_hash: str, filters_hash: str) -> Optional[Dict]:
        """Get cached search results"""
        try:
            cache_key = CacheManager.SEARCH_RESULTS_KEY.format(
                query_hash=query_hash, 
                filters_hash=filters_hash
            )
            return products_cache.get(cache_key)
        except Exception as e:
            logger.error(f"Error getting search results from cache: {e}")
            return None
    
    @staticmethod
    def set_search_results(query_hash: str, filters_hash: str, results: Dict, timeout: int = 600) -> bool:
        """Cache search results"""
        try:
            cache_key = CacheManager.SEARCH_RESULTS_KEY.format(
                query_hash=query_hash, 
                filters_hash=filters_hash
            )
            products_cache.set(cache_key, results, timeout)
            return True
        except Exception as e:
            logger.error(f"Error caching search results: {e}")
            return False
    
    @staticmethod
    def clear_all_cache() -> bool:
        """Clear all cache (use carefully!)"""
        try:
            default_cache.clear()
            products_cache.clear()
            sessions_cache.clear()
            logger.warning("All cache cleared")
            return True
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")
            return False
    
    @staticmethod
    def get_cache_stats() -> Dict[str, Any]:
        """Get cache statistics and health info"""
        try:
            stats = {
                'timestamp': datetime.now().isoformat(),
                'caches': {
                    'default': {
                        'backend': str(default_cache),
                        'location': getattr(default_cache, '_server', 'N/A')
                    },
                    'products': {
                        'backend': str(products_cache),
                        'location': getattr(products_cache, '_server', 'N/A')
                    },
                    'sessions': {
                        'backend': str(sessions_cache),
                        'location': getattr(sessions_cache, '_server', 'N/A')
                    }
                },
                'sample_keys': {
                    'popular_products_exists': default_cache.get(CacheManager.POPULAR_PRODUCTS_KEY) is not None,
                    'trending_products_exists': products_cache.get(
                        CacheManager.TRENDING_PRODUCTS_KEY.format(days=7)
                    ) is not None,
                }
            }
            return stats
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {'error': str(e)}

class ProductCacheWarmer:
    """Utility to warm up product-related caches"""
    
    @staticmethod
    def warm_popular_products():
        """Pre-populate popular products cache"""
        from .models import Product
        try:
            # Get popular products based on view count and ratings
            popular_products = Product.objects.filter(
                status='active',
                is_approved=True
            ).select_related('owner', 'category').order_by(
                '-view_count', '-average_rating'
            )[:20]
            
            products_data = []
            for product in popular_products:
                products_data.append({
                    'id': str(product.id),
                    'name': product.name,
                    'name_amharic': product.name_amharic,
                    'images': product.images,
                    'price': float(product.price) if product.price else None,
                    'average_rating': float(product.average_rating),
                    'view_count': product.view_count,
                    'owner_name': product.owner.business_name,
                    'category': product.category.name if product.category else None,
                    'cached_at': datetime.now().isoformat()
                })
            
            return CacheManager.set_popular_products(products_data)
        
        except Exception as e:
            logger.error(f"Error warming popular products cache: {e}")
            return False
    
    @staticmethod
    def warm_trending_products(days: int = 7):
        """Pre-populate trending products cache"""
        from .models import Product
        from django.utils import timezone
        
        try:
            since_date = timezone.now() - timedelta(days=days)
            
            # Get products with recent activity
            trending_products = Product.objects.filter(
                status='active',
                is_approved=True,
                updated_at__gte=since_date
            ).select_related('owner', 'category').order_by(
                '-quotation_requests_count', '-view_count', '-updated_at'
            )[:20]
            
            products_data = []
            for product in trending_products:
                products_data.append({
                    'id': str(product.id),
                    'name': product.name,
                    'name_amharic': product.name_amharic,
                    'images': product.images,
                    'price': float(product.price) if product.price else None,
                    'quotation_requests_count': product.quotation_requests_count,
                    'view_count': product.view_count,
                    'owner_name': product.owner.business_name,
                    'category': product.category.name if product.category else None,
                    'cached_at': datetime.now().isoformat()
                })
            
            return CacheManager.set_trending_products(products_data, days)
        
        except Exception as e:
            logger.error(f"Error warming trending products cache: {e}")
            return False