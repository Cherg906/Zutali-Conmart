# Zutali Conmart Django Backend

Django REST API backend for the Zutali Conmart B2B marketplace platform.

## Setup Instructions

### 1. Install Dependencies

\`\`\`bash
cd backend
pip install -r requirements.txt
\`\`\`

### 2. Environment Variables

The backend uses the following environment variables (already configured in your Vercel project):

- `POSTGRES_DATABASE`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_HOST`
- `DJANGO_SECRET_KEY` (you'll need to add this)

### 3. Run Migrations

Since the database tables already exist in Supabase, you need to create migrations from the existing database:

\`\`\`bash
python manage.py makemigrations
python manage.py migrate --fake-initial
\`\`\`

### 4. Create Superuser (Optional)

\`\`\`bash
python manage.py createsuperuser
\`\`\`

### 5. Run Development Server

\`\`\`bash
python manage.py runserver 8000
\`\`\`

The API will be available at `http://localhost:8000/api/`

## API Endpoints

### Authentication
- `POST /api/auth/register/` - Register new user
- `POST /api/auth/login/` - Login user
- `POST /api/auth/logout/` - Logout user

### Categories
- `GET /api/categories/` - List all categories
- `GET /api/categories/{id}/` - Get category details

### Products
- `GET /api/products/` - List products (with filters)
- `POST /api/products/` - Create product (product owners only)
- `GET /api/products/{id}/` - Get product details
- `PUT /api/products/{id}/` - Update product
- `DELETE /api/products/{id}/` - Delete product
- `GET /api/products/{id}/reviews/` - Get product reviews

### Quotations
- `GET /api/quotations/` - List quotations
- `POST /api/quotations/` - Create quotation request
- `GET /api/quotations/{id}/` - Get quotation details
- `POST /api/quotations/{id}/respond/` - Respond to quotation (product owners)

### Reviews
- `GET /api/reviews/` - List reviews
- `POST /api/reviews/` - Create review
- `GET /api/reviews/{id}/` - Get review details

### Messages
- `GET /api/messages/` - List messages
- `POST /api/messages/` - Send message
- `GET /api/messages/conversations/` - Get conversations list
- `POST /api/messages/{id}/mark_read/` - Mark message as read

### Verification Requests
- `GET /api/verifications/` - List verification requests
- `POST /api/verifications/` - Submit verification request
- `POST /api/verifications/{id}/review/` - Review request (admins only)

## Authentication

The API uses Token Authentication. Include the token in the Authorization header:

\`\`\`
Authorization: Token <your-token-here>
\`\`\`

## Next Steps

1. Update the Next.js frontend to call Django API endpoints instead of Next.js API routes
2. Configure CORS settings for production
3. Set up proper production deployment (Gunicorn, Nginx, etc.)
