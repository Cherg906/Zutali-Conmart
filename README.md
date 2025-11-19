# Zutali Conmart - Ethiopia's Premier Construction Materials Marketplace

## 🏗️ Overview

Zutali Conmart is a comprehensive e-commerce platform connecting buyers with verified suppliers of quality construction materials across Ethiopia. The platform features bilingual support (Amharic/English), real-time inventory management, secure payment processing, and intelligent AI-powered assistance.

## 🚀 Key Features

### For Buyers
- **Product Catalog**: Browse extensive construction materials with detailed specifications
- **Advanced Search**: Filter by category, location, price, supplier ratings
- **Quotation System**: Request bulk pricing from multiple suppliers
- **Real-time Tracking**: Monitor order status and delivery progress
- **Verified Suppliers**: Shop with confidence through verified product owners
- **Multi-language Support**: Amharic and English interface
- **Mobile Responsive**: Works seamlessly on all devices

### For Suppliers
- **Product Management**: Easy product listing with bulk upload capabilities
- **Inventory Tracking**: Real-time stock management and alerts
- **Quotation Management**: Respond to bulk order requests
- **Analytics Dashboard**: Sales insights and performance metrics
- **Verification System**: Build trust through verified supplier status
- **Direct Messaging**: Communicate directly with buyers

### Platform Features
- **Admin Dashboard**: Comprehensive management system
- **AI Assistant**: Intelligent help for users and suppliers
- **Secure Payments**: Telebirr, Chapa, bank transfer, COD
- **Review System**: Customer feedback and ratings
- **Notification System**: Real-time updates via email/SMS
- **Tier System**: Basic, Premium, and Enterprise subscriptions

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, shadcn/ui
- **State Management**: React Context API
- **Authentication**: Custom auth system with JWT
- **Database Client**: Supabase

### Backend
- **Framework**: Django REST Framework
- **Database**: PostgreSQL
- **Authentication**: Django JWT
- **File Storage**: Supabase Storage
- **Real-time**: Supabase Realtime
- **Task Queue**: Celery with Redis
- **API Documentation**: Django REST Swagger

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx (production)
- **Database**: PostgreSQL
- **Cache**: Redis
- **File Storage**: Supabase Storage

## 📁 Project Structure

```
zutali_conmart-V0/
├── app/                    # Next.js frontend application
│   ├── admin/             # Admin dashboard pages
│   ├── api/               # API routes (Next.js)
│   ├── dashboard/         # User dashboards
│   ├── products/          # Product pages
│   └── (auth)/            # Authentication pages
├── backend/               # Django REST API
│   ├── api/               # API endpoints
│   ├── migrations/        # Database migrations
│   ├── scripts/           # Utility scripts
│   └── zutali_backend/    # Django project settings
├── components/            # React components
│   ├── admin/             # Admin components
│   ├── chat/              # AI assistant components
│   ├── product/           # Product-related components
│   └── ui/                # UI components
├── lib/                   # Shared libraries
│   ├── supabase/          # Supabase client
│   └── language-context.tsx # Language context
├── public/                # Static assets
├── scripts/               # Build and deployment scripts
├── .env.local             # Environment variables
├── docker-compose.yml     # Docker configuration
└── package.json           # Node.js dependencies
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Python 3.9+
- PostgreSQL
- Redis
- Docker (optional)

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd zutali_conmart-V0
   ```

2. **Frontend Setup**
   ```bash
   npm install
   cp .env.example .env.local
   # Edit .env.local with your environment variables
   npm run dev
   ```

3. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py runserver
   ```

4. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb zutali_conmart
   
   # Run migrations
   python manage.py migrate
   
   # Create superuser
   python manage.py createsuperuser
   
   # Load initial data (optional)
   python manage.py loaddata fixtures/initial_data.json
   ```

### Docker Setup

1. **Using Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **Access Services**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Admin Panel: http://localhost:8000/admin

## ⚙️ Configuration

### Environment Variables

**Frontend (.env.local)**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Backend (backend/.env)**
```env
SECRET_KEY=your_secret_key
DEBUG=False
DATABASE_URL=postgresql://user:password@localhost:5432/zutali_conmart
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

## 🔧 Development

### Frontend Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Backend Development
```bash
python manage.py runserver          # Start development server
python manage.py makemigrations     # Create migrations
python manage.py migrate            # Apply migrations
python manage.py test              # Run tests
python manage.py collectstatic     # Collect static files
```

### Database Management
```bash
python manage.py dbshell           # Database shell
python manage.py dumpdata          # Export data
python manage.py loaddata          # Import data
```

## 📊 API Documentation

### Authentication Endpoints
- `POST /api/auth/login/` - User login
- `POST /api/auth/register/` - User registration
- `POST /api/auth/refresh/` - Refresh token

### Product Endpoints
- `GET /api/products/` - List products
- `POST /api/products/` - Create product
- `GET /api/products/{id}/` - Product details
- `PUT /api/products/{id}/` - Update product

### Admin Endpoints
- `GET /api/admin/users/` - User management
- `GET /api/admin/verifications/` - Verification requests
- `GET /api/admin/analytics/` - Platform analytics

### AI Assistant
- `POST /api/assistant` - General AI assistance

## 🚀 Deployment

### Production Deployment

1. **Frontend Deployment (Vercel)**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel --prod
   ```

2. **Backend Deployment (Heroku/DigitalOcean)**
   ```bash
   # Install dependencies
   pip install -r requirements.txt
   
   # Set environment variables
   heroku config:set DEBUG=False
   
   # Deploy
   git push heroku main
   ```

3. **Database Setup**
   - Configure PostgreSQL in production
   - Run migrations: `python manage.py migrate`
   - Create superuser: `python manage.py createsuperuser`

### Docker Production

1. **Build Images**
   ```bash
   docker-compose -f docker-compose.prod.yml build
   ```

2. **Deploy**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

## 🔒 Security

- JWT-based authentication
- SSL encryption for all data
- SQL injection protection
- XSS protection
- CSRF protection
- Rate limiting on API endpoints
- Secure file uploads

## 🌍 Localization

The platform supports:
- Amharic (አማርኛ)
- English

Language files are located in:
- Frontend: `lib/translations/`
- Backend: `backend/locale/`

## 📱 Mobile Support

- Progressive Web App (PWA) features
- Responsive design for all screen sizes
- Touch-optimized interface
- Offline browsing capability
- Push notifications support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

- **Email**: info@zutaliconmart.com
- **Phone**: +251 XXX XXX XXX
- **Website**: https://zutaliconmart.com

## 🔄 Version History

- **v1.0.0** - Initial release with core marketplace functionality
- **v1.1.0** - Added AI assistant and advanced analytics
- **v1.2.0** - Enhanced mobile app and PWA features
- **v1.3.0** - Improved admin dashboard and verification system

## 📊 Platform Statistics

- **Active Users**: 5,000+
- **Verified Suppliers**: 200+
- **Product Listings**: 10,000+
- **Monthly Orders**: 2,000+
- **Coverage**: Major Ethiopian cities

## 🎯 Roadmap

### Upcoming Features
- Mobile apps (iOS/Android)
- Advanced AI recommendations
- Supplier financing options
- International shipping
- IoT integration for smart construction
- Blockchain-based supply chain tracking

### Technical Improvements
- Microservices architecture
- Advanced analytics dashboard
- Real-time inventory synchronization
- Enhanced mobile performance
- Voice search in Amharic

## 🛠️ Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check DATABASE_URL in environment variables
   - Ensure PostgreSQL is running
   - Verify database credentials

2. **Supabase Connection Issues**
   - Verify SUPABASE_URL and keys
   - Check Supabase project status
   - Ensure correct permissions

3. **Build Errors**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Clear Next.js cache: `rm -rf .next`
   - Check TypeScript errors

4. **Authentication Issues**
   - Verify JWT configuration
   - Check CORS settings
   - Ensure proper token handling

### Performance Optimization

1. **Database Optimization**
   - Use database indexes
   - Optimize queries
   - Implement caching

2. **Frontend Optimization**
   - Implement code splitting
   - Optimize images
   - Use lazy loading

3. **Backend Optimization**
   - Implement Redis caching
   - Optimize API responses
   - Use database connection pooling

## 📚 Additional Resources

- [API Documentation](http://localhost:8000/api/docs/)
- [Admin Guide](./docs/admin-guide.md)
- [User Manual](./docs/user-manual.md)
- [Developer Documentation](./docs/developer-guide.md)

---

**Built with ❤️ for Ethiopia's construction industry**
