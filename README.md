# VSR Construction - Professional Construction Management Platform

**Version 2.0** - Enterprise-ready construction company website and management platform for **VSR Construction**, specializing in snow removal, landscaping, hardscaping, and general contracting services.

## 🚀 **Current Features (v2.0)**

### **🌐 Public Website**
- **Professional Landing Page**: Modern dark theme with company branding
- **Service Showcases**: Detailed service pages for all construction offerings
- **Quote System**: Intelligent quote request system with automated routing
- **Multi-language Support**: English/Spanish with auto-detection
- **Mobile Optimized**: Responsive design for all device types
- **SEO Optimized**: Search engine optimized with meta tags

### **🔐 Admin Portal**
- **Secure Authentication**: JWT-based admin authentication with bcrypt hashing
- **Admin Dashboard**: Comprehensive system overview with real-time metrics
- **User Management**: Complete admin and employee account management
- **Quote Management**: Process and manage customer quote requests
- **Analytics System**: User tracking, engagement metrics, conversion analytics
- **Project Management**: Project status tracking and client updates
- **Employee Tools**: Employee registration and project assignment
- **System Controls**: Maintenance mode, service status, emergency controls

### **👥 Employee Portal**
- **Employee Dashboard**: Personalized dashboard with assigned projects
- **Snow Removal Tools**: Comprehensive snow removal service management
- **Project Tracking**: Real-time project status updates
- **Time Management**: Service scheduling and hour tracking
- **Documentation**: Excel export for service reports

### **🛡️ Enterprise Security**
- **Security Headers**: CSP, HSTS, XSS protection
- **Rate Limiting**: API abuse protection
- **Audit Logging**: Complete authentication and action audit trails
- **Data Encryption**: Secure user data storage with encryption
- **Session Management**: Secure cookie-based sessions with cleanup

---

## 🛠️ **Technology Stack**

### **Frontend**
- **[Next.js 15.x](https://nextjs.org/)** – React framework with SSG/SSR
- **[React 19](https://react.dev/)** – Latest React with concurrent features
- **[TypeScript 5.x](https://www.typescriptlang.org/)** – Full TypeScript implementation
- **[Tailwind CSS 3.4.x](https://tailwindcss.com/)** – Utility-first CSS framework
- **[React Icons](https://react-icons.github.io/react-icons/)** – Comprehensive icon library

### **Backend & Database**
- **Next.js API Routes** – Serverless API endpoints
- **[PostgreSQL](https://www.postgresql.org/)** – Production-grade relational database
- **[JWT](https://jwt.io/)** – JSON Web Token authentication
- **[bcrypt](https://github.com/kelektiv/node.bcrypt.js)** – Password hashing
- **[Nodemailer](https://nodemailer.com/)** – Email service integration

### **Architecture**
- **Clean Architecture** – CQRS pattern with domain separation
- **Dependency Injection** – Container-based service management
- **Observability** – Comprehensive logging and monitoring
- **Resilience Patterns** – Circuit breakers, retry logic, error recovery

---

## 📁 **Project Structure**

```
vsr-landing/
├── README.md                    # Project documentation
├── package.json                 # Dependencies and scripts  
├── next.config.ts              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── .env.local                  # Development environment variables
├── .env.production.template    # Production environment template
├── data/                       # Application data storage
│   ├── analytics.json          # Analytics data
│   ├── quote-requests.json     # Quote requests
│   └── secure/                 # Encrypted user data
├── docs/                       # Documentation
│   ├── VERSION_CHANGELOG.md    # Version history
│   ├── VERSION_ROADMAP.md      # Development roadmap
│   ├── security/              # Security documentation
│   ├── guides/                # Implementation guides
│   └── architecture/          # Architecture documentation
├── public/                     # Static assets
│   ├── VSR.png                # Company logo
│   ├── uploads/               # User uploaded files
│   └── locales/               # Internationalization files
└── src/                       # Source code
    ├── components/            # React components
    │   ├── admin/            # Admin portal components
    │   ├── employee/         # Employee portal components
    │   └── ui/               # Reusable UI components
    ├── pages/                 # Next.js pages
    │   ├── api/              # API routes
    │   ├── portal/           # Portal pages (admin/employee)
    │   └── services/         # Service pages
    ├── lib/                   # Utility libraries
    │   ├── database.ts       # Database connections
    │   ├── security.ts       # Security utilities
    │   └── auth/             # Authentication logic
    ├── hooks/                 # Custom React hooks
    ├── context/              # React context providers
    ├── observability/        # Monitoring and logging
    ├── resilience/           # Error handling and recovery
    └── types/                # TypeScript type definitions
```

## 🔮 **Planned Features (v3.0 - Q1 2025)**

### **📱 Mobile Integration**
- **MetaSnap Android Integration**: Custom Android app integration for field operations
- **Progressive Web App**: Full PWA capabilities with offline functionality
- **Push Notifications**: Real-time project updates and notifications
- **Mobile-First Forms**: Touch-optimized form interactions

### **🤖 AI & Automation**
- **Smart Quote Generator**: AI-powered quote generation with image analysis
- **Chatbot Integration**: 24/7 customer support with intelligent responses
- **Automated Follow-ups**: Intelligent email sequences based on user behavior

### **❄️ Enhanced Snow Removal System**
- **Database Integration**: Full PostgreSQL integration for snow removal requests
- **Real-time Tracking**: GPS integration for equipment and crew tracking
- **Weather API**: Automated weather-based scheduling and alerts
- **Route Optimization**: AI-optimized routing for maximum efficiency
- **Equipment Management**: Comprehensive equipment tracking and maintenance

### **💰 Business Operations**
- **Payment Processing**: Stripe integration for deposits and payments
- **CRM Integration**: Salesforce or HubSpot integration
- **Calendar Sync**: Google Calendar/Outlook integration for scheduling
- **Advanced Analytics**: Conversion optimization and business intelligence
---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ and npm
- PostgreSQL 14+ (for production)
- Git for version control

### Local Development
```bash
# Clone the repository
git clone https://github.com/kennermatt-cmd/vsr-landing.git
cd vsr-landing

# Install dependencies
npm install

# Install additional dependencies
npm install cookie @types/cookie formidable nodemailer

# Set up environment variables
cp .env.production.template .env.local
# Edit .env.local with your configuration

# Run development server
npm run dev

# Alternative with custom hostname
./node_modules/.bin/next dev --hostname 0.0.0.0
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

### Docker Deployment
```bash
# Build Docker image
docker build -t vsr-app .

# Run container
docker run -p 3000:3000 vsr-app

# Docker Compose (recommended)
docker-compose up -d
```

### Production Setup
```bash
# Build for production
npm run build

# Start production server
npm start

# Run linting and type checks
npm run lint
npm run type-check
```

### Admin Account Setup
1. Visit `/portal/admin/register` to create admin account
2. Set up PostgreSQL database connection
3. Configure SMTP settings for email notifications
4. Test all functionality in staging environment

---

## 📚 Documentation

- **[Version Changelog](docs/VERSION_CHANGELOG.md)** - Complete version history and upgrade notes
- **[Development Roadmap](docs/VERSION_ROADMAP.md)** - Future development plans and timelines
- **[Security Documentation](docs/security/)** - Security implementation and audit reports
- **[Architecture Guide](docs/architecture/)** - System architecture and design patterns
- **[API Documentation](docs/api/)** - Complete API reference for integrations

---

## 🤝 Contributing

This is a private project for VSR Construction. For internal development:

1. Follow existing code patterns and conventions
2. Maintain TypeScript strict mode compliance
3. Add tests for new functionality
4. Update documentation for changes
5. Run security audits before deployment

### Development Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
npm test             # Run test suite
npm audit            # Security audit
```

---

## 📞 Contact & Support

**Project Owners:**
- **Marcus Vargas** - Owner | [marcus@vsrsnow.com](mailto:marcus@vsrsnow.com)
- **Zach Lewis** - Co-Owner | [zach@vsrsnow.com](mailto:zach@vsrsnow.com)

**Development Team:**
- **Matthew Kenner** - Lead Developer | [m.kenner@outlook.com](mailto:m.kenner@outlook.com)

**Business Inquiries:**
- Main Office: [info@vsrsnow.com](mailto:info@vsrsnow.com)
- Phone: (555) 123-4567
- Website: [vsrsnow.com](https://vsrsnow.com)

**Technical Support:**
- GitHub Issues: Create issues for bug reports and feature requests
- Documentation: Check `/docs/` for comprehensive guides
- Emergency: Contact development team directly

---

## ⚖️ License

**Proprietary Software License**

This project and all its contents are proprietary software owned by **VSR LLC**. 

- ✅ **Authorized Use**: Internal operations, client services, and authorized business purposes
- ❌ **Prohibited**: Redistribution, modification without permission, reverse engineering
- 🔒 **Confidential**: All code, documentation, and business logic are confidential
- 📋 **Compliance**: Must comply with all applicable data protection regulations

**Copyright © 2025 VSR LLC. All rights reserved.**

*For licensing inquiries or permission requests, contact legal@vsrsnow.com*