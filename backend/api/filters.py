"""
Custom filters for Zutali Conmart API.
"""
from django_filters import rest_framework as filters
from .models import Product, Quotation, Review


class ProductFilter(filters.FilterSet):
    """Filter for products"""
    min_price = filters.NumberFilter(field_name="price", lookup_expr='gte')
    max_price = filters.NumberFilter(field_name="price", lookup_expr='lte')
    category = filters.UUIDFilter(field_name="category__id")
    subcategory = filters.UUIDFilter(field_name="subcategory__id")
    location = filters.CharFilter(field_name="location", lookup_expr='icontains')
    status = filters.ChoiceFilter(choices=[
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('pending', 'Pending')
    ])
    quotation_available = filters.BooleanFilter(field_name="quotation_available")
    brand = filters.CharFilter(field_name="brand", lookup_expr='iexact')
    in_stock = filters.BooleanFilter(method='filter_in_stock')
    delivery_available = filters.BooleanFilter(field_name="owner__delivery_available")
    verified_owner = filters.BooleanFilter(method='filter_verified_owner')

    class Meta:
        model = Product
        fields = [
            'category',
            'subcategory',
            'status',
            'location',
            'quotation_available',
            'brand',
            'in_stock',
            'delivery_available',
            'verified_owner',
        ]

    def filter_in_stock(self, queryset, name, value):
        if value:
            return queryset.exclude(available_quantity__isnull=True).exclude(available_quantity__lte=0)
        return queryset

    def filter_verified_owner(self, queryset, name, value):
        if value:
            return queryset.filter(owner__verification_status='verified')
        return queryset


class QuotationFilter(filters.FilterSet):
    """Filter for quotations"""
    status = filters.ChoiceFilter(choices=[
        ('pending', 'Pending'),
        ('responded', 'Responded'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected')
    ])
    product = filters.NumberFilter(field_name="product__id")

    class Meta:
        model = Quotation
        fields = ['status', 'product']


class ReviewFilter(filters.FilterSet):
    """Filter for reviews"""
    min_rating = filters.NumberFilter(field_name="rating", lookup_expr='gte')
    max_rating = filters.NumberFilter(field_name="rating", lookup_expr='lte')
    product = filters.NumberFilter(field_name="product__id")

    class Meta:
        model = Review
        fields = ['rating', 'product']
