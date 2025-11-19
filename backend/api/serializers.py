"""
Django REST Framework serializers for Zutali Conmart API.
"""
from rest_framework import serializers
from django.utils.text import slugify
from django.contrib.auth import authenticate
from .models import (
    User, ProductOwner, Category, Product, Quotation,
    Review, Message, Admin, VerificationRequest,
    Subscription, SubscriptionPlan, PaymentTransaction
)


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    avatar = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'tier', 'phone', 'verification_status', 'verification_documents',
            'verification_rejection_reason', 'verified_at', 'verification_expires_at',
            'document_validity_period', 'is_active', 'avatar', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'role', 'created_at', 'updated_at']
        extra_kwargs = {
            'first_name': {'required': False},
            'last_name': {'required': False},
            'phone': {'required': False, 'allow_blank': True},
            'tier': {'required': False, 'allow_blank': True},
        }


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    username = serializers.CharField(validators=[], required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    tier = serializers.CharField(write_only=True, required=False, allow_blank=True)
    business_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    business_description = serializers.CharField(write_only=True, required=False, allow_blank=True)
    business_address = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 
                  'first_name', 'last_name', 'role', 'phone', 'tier',
                  'business_name', 'business_description', 'business_address']

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Passwords do not match")
        return data

    def create(self, validated_data):
        password_confirm = validated_data.pop('password_confirm')
        tier = validated_data.pop('tier', None)
        business_name = validated_data.pop('business_name', None)
        business_description = validated_data.pop('business_description', None)
        business_address = validated_data.pop('business_address', None)

        base_username = validated_data.get('username')
        role = validated_data.get('role', 'user')

        if base_username:
            candidate = base_username
            suffix = 1
            while User.objects.filter(username=candidate).exists():
                candidate = f"{base_username}-{role}-{suffix}" if suffix == 1 else f"{base_username}-{role}-{suffix}"
                suffix += 1
            validated_data['username'] = candidate

        user = User.objects.create_user(**validated_data)

        if tier:
            user.tier = tier
            user.save(update_fields=['tier'])

        return user


class LoginSerializer(serializers.Serializer):
    """Serializer for user login (supports username or email)"""
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    role = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        username = data.get('username')
        password = data.get('password')
        role = data.get('role') or None

        # Try standard username auth first
        user = authenticate(username=username, password=password)
        if user and role:
            role_mismatch = user.role != role
            profile_missing = role == 'product_owner' and not hasattr(user, 'product_owner_profile')
            if role_mismatch:
                if role == 'product_owner':
                    raise serializers.ValidationError({
                        "message": "You don't have a product owner account with these credentials. Please login to the correct account type."
                    })
                elif role == 'admin':
                    raise serializers.ValidationError({
                        "message": "You don't have an admin account with these credentials. Please login to the correct account type."
                    })
                else:
                    raise serializers.ValidationError({
                        "message": "You don't have a user account with these credentials. Please login to the correct account type."
                    })
            if profile_missing:
                raise serializers.ValidationError({
                    "message": "Product owner profile not found. Please complete your product owner registration."
                })

        if not user and username:
            try:
                from .models import User

                matched_user = None

                if '@' in username:
                    candidates = User.objects.filter(email__iexact=username).order_by('-date_joined')

                    if role:
                        role_candidates = candidates.filter(role=role)
                        if role == 'product_owner':
                            role_candidates = role_candidates.filter(product_owner_profile__isnull=False)
                        matched_user = role_candidates.first()

                    if not matched_user:
                        preferred = candidates.filter(product_owner_profile__isnull=False).first()
                        matched_user = preferred or candidates.first()

                    # Check if we found a user but with different role
                    if matched_user and role and matched_user.role != role:
                        if role == 'product_owner':
                            raise serializers.ValidationError({
                                "message": "You don't have a product owner account with these credentials. Please login to the correct account type."
                            })
                        elif role == 'admin':
                            raise serializers.ValidationError({
                                "message": "You don't have an admin account with these credentials. Please login to the correct account type."
                            })
                        else:
                            raise serializers.ValidationError({
                                "message": "You don't have a user account with these credentials. Please login to the correct account type."
                            })

                if not matched_user and role:
                    role_qs = User.objects.filter(role=role, username=username).order_by('-date_joined')
                    if role == 'product_owner':
                        role_qs = role_qs.filter(product_owner_profile__isnull=False)
                    matched_user = role_qs.first()

                if matched_user:
                    user = authenticate(username=matched_user.username, password=password)
            except Exception:
                user = None

        if user and user.is_active:
            return user
        raise serializers.ValidationError("Invalid credentials")


class ProductOwnerSerializer(serializers.ModelSerializer):
    """Serializer for ProductOwner model"""
    user = UserSerializer(read_only=True)

    class Meta:
        model = ProductOwner
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for Category model"""
    product_count = serializers.SerializerMethodField()
    parent = serializers.SerializerMethodField()
    images = serializers.ListField(
        child=serializers.URLField(),
        source='category_images',
        read_only=True
    )
    existing_images = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        default=""
    )

    class Meta:
        model = Category
        fields = [
            'id', 'name', 'name_amharic', 'slug', 'description', 'description_amharic',
            'icon', 'images', 'existing_images', 'created_at', 'product_count', 'parent', 'parent_id'
        ]
        read_only_fields = ['id', 'created_at']

    def _generate_unique_slug(self, base_candidate: str, instance: Category | None = None) -> str:
        base_slug = slugify(base_candidate) or 'category'
        slug = base_slug
        queryset = Category.objects.all()
        if instance is not None:
            queryset = queryset.exclude(pk=instance.pk)
        counter = 1
        while queryset.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        return slug

    def create(self, validated_data):
        # Remove helper fields not stored on the model
        validated_data.pop('existing_images', None)
        if not validated_data.get('slug') and validated_data.get('name'):
            validated_data['slug'] = self._generate_unique_slug(validated_data['name'])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('existing_images', None)
        if not validated_data.get('slug') and validated_data.get('name'):
            validated_data['slug'] = self._generate_unique_slug(validated_data['name'], instance=instance)
        return super().update(instance, validated_data)

    def get_product_count(self, obj):
        """Count products for both main categories and subcategories"""
        if obj.parent:
            # This is a subcategory - count products where subcategory field matches
            return obj.sub_products.filter(status='active').count()
        else:
            # This is a main category - sum all products in all its subcategories
            total = 0
            # Get all subcategories of this main category
            subcategories = Category.objects.filter(parent=obj)
            for subcategory in subcategories:
                total += subcategory.sub_products.filter(status='active').count()
            return total

    def get_parent(self, obj):
        if obj.parent:
            return {
                'id': obj.parent.id,
                'name': obj.parent.name,
                'name_amharic': obj.parent.name_amharic,
            }
        return None


class ProductSerializer(serializers.ModelSerializer):
    """Serializer for Product model"""
    owner = ProductOwnerSerializer(read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    subcategory_name = serializers.CharField(source='subcategory.name', read_only=True)
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    delivery_available = serializers.BooleanField(required=False)

    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_average_rating(self, obj):
        reviews = obj.reviews.all()
        if reviews:
            return sum(r.rating for r in reviews) / len(reviews)
        return 0

    def get_review_count(self, obj):
        return obj.reviews.count()

    def update(self, instance, validated_data):
        request = self.context.get('request')
        user = getattr(request, 'user', None)

        if user and getattr(user, 'role', None) == 'product_owner':
            validated_data.setdefault('status', 'under_review')
            validated_data.setdefault('is_approved', False)
            validated_data.setdefault('rejection_reason', '')

        return super().update(instance, validated_data)


class DashboardCategorySerializer(serializers.ModelSerializer):
    """Lightweight category info for dashboard displays"""

    class Meta:
        model = Category
        fields = ('id', 'name', 'name_amharic')


class DashboardProductOwnerSerializer(serializers.ModelSerializer):
    """Minimal product owner details for dashboard payloads"""

    location = serializers.CharField(source='business_address', allow_blank=True, required=False)
    city = serializers.CharField(source='business_city', allow_blank=True, required=False)

    class Meta:
        model = ProductOwner
        fields = (
            'id', 'business_name', 'average_rating', 'total_reviews',
            'verification_status', 'delivery_available', 'location', 'city'
        )


class DashboardProductSerializer(serializers.ModelSerializer):
    """Compact product representation for user dashboard"""

    owner = DashboardProductOwnerSerializer(read_only=True)
    category = DashboardCategorySerializer(read_only=True)
    subcategory = DashboardCategorySerializer(read_only=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    average_rating = serializers.DecimalField(max_digits=3, decimal_places=2, required=False, allow_null=True)

    class Meta:
        model = Product
        fields = (
            'id', 'name', 'description', 'description_amharic',
            'images', 'primary_image', 'price', 'price_negotiable',
            'has_quotation_price', 'brand', 'unit', 'available_quantity',
            'status', 'average_rating', 'total_reviews', 'view_count',
            'quotation_requests_count', 'delivery_available', 'created_at',
            'category', 'subcategory'
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Coerce decimal fields to float for frontend convenience
        for key in ('price', 'average_rating'):
            value = data.get(key)
            if value is not None:
                try:
                    data[key] = float(value)
                except (TypeError, ValueError):
                    data[key] = None
        return data


class DashboardQuotationSerializer(serializers.ModelSerializer):
    """Quotation with nested product for dashboard"""

    product = DashboardProductSerializer(read_only=True)

    class Meta:
        model = Quotation
        fields = (
            'id', 'status', 'quantity', 'created_at', 'updated_at',
            'message', 'delivery_location', 'product'
        )


class DashboardReviewSerializer(serializers.ModelSerializer):
    """Review with nested product for dashboard"""

    product = DashboardProductSerializer(read_only=True)

    class Meta:
        model = Review
        fields = (
            'id', 'rating', 'comment', 'created_at', 'product'
        )


class QuotationSerializer(serializers.ModelSerializer):
    """Serializer for Quotation model"""
    product = ProductSerializer(read_only=True)
    user = UserSerializer(read_only=True)
    product_id = serializers.UUIDField(write_only=True)
    request_document = serializers.FileField(required=False, allow_null=True)
    response_document = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = Quotation
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'user']

    def create(self, validated_data):
        product_id = validated_data.pop('product_id', None)
        if not product_id:
            raise serializers.ValidationError({'product_id': 'This field is required.'})

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist as exc:
            raise serializers.ValidationError({'product_id': 'Invalid product.'}) from exc

        return Quotation.objects.create(product=product, **validated_data)


class QuotationResponseSerializer(serializers.ModelSerializer):
    """Serializer used when a product owner responds to a quotation."""

    class Meta:
        model = Quotation
        fields = ['response', 'price_quote', 'response_document']

    def validate_price_quote(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError('Price quote must be greater than zero.')
        return value

    def validate(self, attrs):
        response = attrs.get('response')
        price_quote = attrs.get('price_quote')
        response_document = attrs.get('response_document')

        if response in ['', None]:
            response = None
        if price_quote is None and response_document is None and response is None:
            raise serializers.ValidationError('Provide a message, price quote, or document to respond.')

        return attrs


class ReviewSerializer(serializers.ModelSerializer):
    """Serializer for Review model"""
    user = UserSerializer(read_only=True)
    product_id = serializers.UUIDField(write_only=True)
    product = ProductSerializer(read_only=True)

    class Meta:
        model = Review
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'user', 'product']

    def create(self, validated_data):
        product_id = validated_data.pop('product_id', None)
        if not product_id:
            raise serializers.ValidationError({'product_id': 'This field is required.'})

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist as exc:
            raise serializers.ValidationError({'product_id': 'Invalid product.'}) from exc

        return Review.objects.create(product=product, **validated_data)


class MessageSerializer(serializers.ModelSerializer):
    """Serializer for Message model"""
    sender = UserSerializer(read_only=True)
    receiver = UserSerializer(read_only=True)
    receiver_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = Message
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'sender']


class AdminSerializer(serializers.ModelSerializer):
    """Serializer for Admin model"""
    user = UserSerializer(read_only=True)

    class Meta:
        model = Admin
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class VerificationRequestSerializer(serializers.ModelSerializer):
    """Serializer for VerificationRequest model"""
    product_owner = ProductOwnerSerializer(read_only=True)
    reviewed_by = AdminSerializer(read_only=True)
    documents = serializers.JSONField(required=False)

    class Meta:
        model = VerificationRequest
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'reviewed_by']


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    """Serializer for SubscriptionPlan model"""

    class Meta:
        model = SubscriptionPlan
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class SubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for Subscription model"""
    user = UserSerializer(read_only=True)
    product_owner = ProductOwnerSerializer(read_only=True)
    plan = SubscriptionPlanSerializer(read_only=True)

    class Meta:
        model = Subscription
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'user', 'product_owner']


class PaymentTransactionSerializer(serializers.ModelSerializer):
    """Serializer for PaymentTransaction model"""
    user = UserSerializer(read_only=True)
    subscription = SubscriptionSerializer(read_only=True)
    plan = SubscriptionPlanSerializer(read_only=True)

    class Meta:
        model = PaymentTransaction
        fields = '__all__'
        read_only_fields = ['id', 'initiated_at', 'completed_at', 'user', 'subscription', 'plan']
