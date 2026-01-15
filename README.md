# Portfolio Backend API

A production-ready RESTful API backend built with NestJS, designed to power modern portfolio applications with enterprise-grade authentication, authorization, and security features. This backend serves as a robust foundation for personal portfolio platforms, demonstrating professional backend development practices and architectural patterns suitable for scalable applications.

This API implements comprehensive user management, multi-factor authentication, role-based access control, and security best practices including rate limiting, brute-force protection, and audit logging. The architecture is designed for maintainability, testability, and horizontal scalability, making it suitable for both personal projects and production deployments.

## Tech Stack

### Core Technologies

- **Runtime**: Node.js 18+
- **Framework**: NestJS 10.x (TypeScript)
- **Database**: PostgreSQL 14+
- **ORM**: Prisma 5.x
- **Cache**: Redis 7.x
- **Email**: Nodemailer with SMTP

### Security & Authentication

- **Password Hashing**: Argon2
- **JWT**: jsonwebtoken with RS256
- **2FA**: Speakeasy (TOTP), Email OTP
- **Encryption**: AES-256-GCM
- **Session Management**: Database-backed with Redis

### Infrastructure

- **Containerization**: Podman/Docker
- **Validation**: class-validator, class-transformer
- **Logging**: Winston (planned)
- **Monitoring**: Health checks endpoint

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                         │
│          (Web App, Mobile App, Third-party Services)        │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Global Middleware (Helmet, CORS, Validation)      │    │
│  └────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Rate Limiting & Throttling (Redis-backed)         │    │
│  └────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Authentication Guard (JWT Validation)             │    │
│  └────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Auth Module  │  │ User Module  │  │  CASL Module    │  │
│  │              │  │              │  │ (Authorization) │  │
│  │ - Login      │  │ - Profile    │  │                 │  │
│  │ - Register   │  │ - Settings   │  │ - Policies      │  │
│  │ - 2FA        │  │ - Sessions   │  │ - Abilities     │  │
│  │ - Reset      │  │              │  │                 │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└────────────────────────────┬────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  PostgreSQL  │    │    Redis     │    │ Email Service│
│   Database   │    │    Cache     │    │    (SMTP)    │
│              │    │              │    │              │
│ - Users      │    │ - Sessions   │    │ - 2FA OTP    │
│ - Sessions   │    │ - Rate Limit │    │ - Verification│
│ - Tokens     │    │ - Lockout    │    │ - Reset      │
│ - Audit Logs │    │              │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
```

### Design Principles

**Modular Architecture**: The application follows NestJS module-based architecture, ensuring separation of concerns and independent scalability of features.

**Security-First Design**: All endpoints are secured by default with JWT authentication. Rate limiting and brute-force protection are implemented at the infrastructure level using Redis.

**Stateless Authentication**: JWT tokens enable horizontal scaling without shared session state. Refresh token rotation ensures security while maintaining user experience.

**Database-Agnostic ORM**: Prisma provides type-safe database access with migration support, making it easy to switch databases or add read replicas.

**Redis for Performance**: Redis serves as a distributed cache for rate limiting, account lockout tracking, and OTP storage, enabling multi-instance deployments.

## Features

### Core Features

#### User Management

- User registration with email/username
- Flexible login (email or username)
- User profile management
- Account settings
- Session management (view and revoke active sessions)
- Email verification with token expiration
- Password reset flow with single-use tokens

#### Authentication

- JWT-based authentication with access and refresh tokens
- Secure token rotation on refresh
- Configurable token expiration
- Multiple active sessions support
- Device and IP tracking per session
- Automatic session cleanup

#### Roles & Permissions

- Role-Based Access Control (RBAC) with CASL
- Three-tier role system: OWNER, ADMIN, USER
- Granular permission management
- Resource-level access control
- Ability-based authorization

### Security Features

#### Multi-Factor Authentication (2FA)

- TOTP-based 2FA (Google Authenticator)
- Email-based OTP
- QR code generation for TOTP setup
- Recovery codes (10 single-use codes)
- Configurable 2FA requirement

#### Password Security

- Argon2 password hashing (memory-hard algorithm)
- Password strength validation
- Secure password reset flow
- Password change with current password verification
- Automatic session invalidation on password change

#### Account Protection

- Account lockout after 5 failed login attempts
- Configurable lockout duration (15 minutes default)
- IP-based and user-based tracking
- Security alert emails on lockout
- Manual unlock capability

#### Rate Limiting & Throttling

- Global rate limiting with Redis backend
- Endpoint-specific limits:
  - Login: 5 attempts per minute
  - Registration: 3 attempts per 5 minutes
  - Password reset: 3 attempts per 15 minutes
  - OTP verification: 5 attempts per 15 minutes
  - OTP resend: 3 attempts per 15 minutes

#### Encryption & Hashing

- AES-256-GCM encryption for TOTP secrets
- Argon2 hashing for passwords and OTP codes
- Secure random token generation
- Token hashing before storage

#### Audit Trail

- Comprehensive audit logging for security events
- Login attempt tracking with IP addresses
- 2FA event logging (enable, disable, verify)
- Session activity tracking
- User action history

### Data Management

#### API Features

- RESTful endpoint design
- Request validation with DTOs
- Type-safe responses
- Error handling with standardized formats
- Request/response transformation

#### Data Integrity

- Database transactions for critical operations
- Foreign key constraints
- Unique constraints enforcement
- Cascade delete rules
- Referential integrity

### System Features

#### Security Headers

- Helmet.js integration
- CORS configuration
- Cookie security flags
- Content Security Policy (CSP)
- HSTS support

#### Email System

- HTML email templates with Handlebars
- Responsive email design
- Email delivery for:
  - Account verification
  - Password reset
  - 2FA setup confirmation
  - Account lockout alerts
  - Security notifications

#### Configuration Management

- Environment-based configuration
- Centralized config service
- Validation of environment variables
- Development/production profiles

## Authentication & Security

### Authentication Flow

1. **Registration**
   - User submits credentials
   - Password hashed with Argon2
   - Verification email sent
   - Account created in pending state

2. **Email Verification**
   - User receives verification link
   - Token validated (24-hour expiry)
   - Account activated
   - User can now log in

3. **Login**
   - Credentials validated
   - Account lockout checked
   - 2FA challenge issued (if enabled)
   - JWT tokens generated
   - Session created

4. **2FA Verification**
   - TOTP code or Email OTP validated
   - Rate limiting enforced
   - Recovery codes accepted as fallback
   - Access granted on success

5. **Token Refresh**
   - Refresh token validated
   - Old session invalidated
   - New token pair generated
   - Token rotation completed

### Security Measures

**Token Security**

- Access tokens: 15-minute expiration
- Refresh tokens: 7-day expiration
- Stored refresh tokens in database
- Token blacklisting on logout
- Automatic cleanup of expired tokens

**Encryption Standards**

- AES-256-GCM for sensitive data
- Unique IV per encryption
- Authentication tags for integrity
- Secure key management via environment variables

**Attack Prevention**

- SQL injection prevention via Prisma ORM
- XSS protection via validation pipes
- CSRF protection ready (when using cookies)
- Brute-force protection via rate limiting
- Email enumeration prevention

## API Overview

### Authentication Endpoints

```
POST   /auth/register              Register new account
POST   /auth/login                 Authenticate user
POST   /auth/refresh               Refresh access token
POST   /auth/logout                Invalidate session
GET    /auth/me                    Get current user
POST   /auth/verify-email          Verify email address
POST   /auth/resend-verification   Resend verification email
POST   /auth/forgot-password       Request password reset
GET    /auth/reset-password/:token Validate reset token
POST   /auth/reset-password        Reset password
POST   /auth/change-password       Change password (authenticated)
```

### Two-Factor Authentication Endpoints

```
POST   /auth/2fa/enable            Enable 2FA (TOTP or Email)
POST   /auth/2fa/verify-setup      Verify TOTP setup
POST   /auth/2fa/disable           Disable 2FA
GET    /auth/2fa/status            Get 2FA status
POST   /auth/2fa/resend            Resend email OTP
```

### Example Request/Response

**Register**

```bash
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "image": "https://example.com/avatar.jpg"
}
```

**Response**

```json
{
  "user": {
    "id": "cm4xr8wqz0000v8xy12abc123",
    "name": "John Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "USER",
    "emailVerifiedAt": null,
    "createdAt": "2026-01-15T16:30:00.000Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Please check your email to verify your account"
}
```

**Login with 2FA**

```bash
# Step 1: Initial login
POST /auth/login
{
  "identifier": "john@example.com",
  "password": "SecurePass123!"
}

# Response: 2FA challenge
{
  "requires2FA": true,
  "method": "google"
}

# Step 2: Submit 2FA code
POST /auth/login
{
  "identifier": "john@example.com",
  "password": "SecurePass123!",
  "twoFactorToken": "123456"
}

# Response: Successful authentication
{
  "user": { ... },
  "tokens": { ... }
}
```

## Database Schema Overview

### Core Tables

**users** - Identity and profile data

- id, name, username, email, image
- role (OWNER | ADMIN | USER)
- emailVerifiedAt, createdAt, updatedAt

**accounts** - Authentication credentials

- id, userId, passwordHash, provider
- lastLoginAt, createdAt, updatedAt

**sessions** - Active user sessions

- id, userId, token, expiresAt
- createdAt

**two_factor_auths** - 2FA configuration

- id, userId, type (TOTP | EMAIL)
- secret (encrypted), enabled, recoveryCodes
- createdAt, updatedAt

**email_otps** - Email OTP tracking

- id, userId, otpHash, attempts
- expiresAt, createdAt

**verification_tokens** - Email verification

- id, userId, token (hashed)
- expiresAt, createdAt

**password_reset_tokens** - Password reset

- id, userId, token (hashed), used
- expiresAt, createdAt

**login_attempts** - Security tracking

- id, identifier, ipAddress, success
- createdAt

**audit_logs** - Security events

- id, userId, action, method
- success, ipAddress, userAgent, metadata
- createdAt

### Relationships

- User → Account (1:1)
- User → Sessions (1:N)
- User → TwoFactorAuths (1:N)
- User → EmailOTPs (1:N)

## Environment Variables

Create a `.env` file in the project root:

```bash
# Application
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/portfolio"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# SMTP Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Portfolio <noreply@example.com>"

# Two-Factor Authentication
ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
OTP_EXPIRY_MINUTES=5
MAX_OTP_ATTEMPTS=5
MAX_RESEND_ATTEMPTS=3
LOCKOUT_MINUTES=15

# Email Verification
EMAIL_VERIFICATION_EXPIRY_HOURS=24
REQUIRE_EMAIL_VERIFICATION=false

# Password Reset
PASSWORD_RESET_EXPIRY_MINUTES=60

# Account Lockout
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000
```

### Generating Secure Keys

**JWT Secrets**

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Encryption Key** (must be 32 bytes = 64 hex characters)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Installation

### Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 14+
- Redis 7+
- Podman or Docker (for containerized deployment)

### Local Development Setup

1. **Clone the repository**

```bash
git clone <repository-url>
cd portfolio-api
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Generate Prisma Client**

```bash
npx prisma generate
```

5. **Run database migrations**

```bash
npx prisma migrate dev
```

6. **Seed database (optional)**

```bash
npm run seed
```

7. **Start development server**

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`

### Database Management

**Create a new migration**

```bash
npx prisma migrate dev --name migration_name
```

**Reset database**

```bash
npx prisma migrate reset
```

**Open Prisma Studio** (Database GUI)

```bash
npx prisma studio
```

**Generate ERD**

```bash
npx prisma generate
npx prisma-erd-generator
```

## Development Setup

### Project Structure

```
portfolio-api/
├── prisma/
│   ├── migrations/          # Database migrations
│   └── schema.prisma        # Database schema
├── src/
│   ├── auth/                # Authentication module
│   │   ├── dto/             # Data Transfer Objects
│   │   ├── guards/          # Auth guards
│   │   ├── services/        # Auth services
│   │   ├── strategies/      # Passport strategies
│   │   ├── templates/       # Email templates
│   │   ├── utils/           # Crypto utilities
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   ├── casl/                # Authorization (CASL)
│   │   ├── decorators/      # Custom decorators
│   │   ├── guards/          # Authorization guards
│   │   ├── casl-ability.factory.ts
│   │   └── casl.module.ts
│   ├── config/              # Configuration
│   │   ├── configuration.ts # App configuration
│   │   └── env.validation.ts
│   ├── prisma/              # Prisma service
│   │   ├── prisma.service.ts
│   │   └── prisma.module.ts
│   ├── redis/               # Redis service
│   │   ├── redis.service.ts
│   │   └── redis.module.ts
│   ├── app.controller.ts    # Root controller
│   ├── app.service.ts       # Root service
│   ├── app.module.ts        # Root module
│   └── main.ts              # Application entry
├── test/                    # E2E tests
├── .env.example             # Environment template
├── .gitignore
├── nest-cli.json
├── package.json
├── tsconfig.json
└── README.md
```

### Code Style

This project follows NestJS best practices and TypeScript conventions:

- **Naming**: PascalCase for classes, camelCase for variables/functions
- **File naming**: kebab-case (e.g., `two-factor.service.ts`)
- **Module structure**: One feature per module
- **Dependency injection**: Constructor-based DI
- **DTOs**: class-validator decorators for validation
- **Error handling**: NestJS built-in exceptions

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## Production Deployment

### Container Build (Podman/Docker)

**Create Dockerfile** (if not exists)

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npm run build
RUN npx prisma generate

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

**Build with Podman**

```bash
podman build -t portfolio-api:latest .
```

**Run with Podman**

```bash
podman run -d \
  --name portfolio-api \
  -p 3000:3000 \
  --env-file .env \
  portfolio-api:latest
```

### Container Compose Setup

**podman-compose.yml** or **docker-compose.yml**

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - '3000:3000'
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://postgres:password@db:5432/portfolio
      REDIS_URL: redis://redis:6379
    env_file:
      - .env
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:14-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: portfolio
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

**Deploy with Podman Compose**

```bash
podman-compose up -d
```

### Environment Configuration

**Production Environment Variables**

- Use strong, unique secrets for JWT keys
- Generate a new 32-byte encryption key
- Configure production SMTP settings
- Set `NODE_ENV=production`
- Enable email verification: `REQUIRE_EMAIL_VERIFICATION=true`
- Use production database with connection pooling
- Configure Redis with persistence

### Health Checks

The API includes health check endpoints for monitoring:

```bash
GET /health      # Basic health check
GET /health/db   # Database connectivity
GET /health/redis # Redis connectivity
```

### Logging

Production logging recommendations:

- Use Winston for structured logging
- Log to files and external services
- Include correlation IDs
- Separate error logs
- Monitor log aggregation

## Scripts

```bash
# Development
npm run start:dev          # Start with hot-reload
npm run start:debug        # Start with debugger

# Production
npm run build              # Build for production
npm run start:prod         # Start production server

# Database
npm run prisma:generate    # Generate Prisma Client
npm run prisma:migrate     # Run migrations
npm run prisma:studio      # Open Prisma Studio
npm run prisma:seed        # Seed database

# Testing
npm run test               # Run unit tests
npm run test:e2e           # Run E2E tests
npm run test:cov           # Generate coverage

# Code Quality
npm run lint               # Run ESLint
npm run format             # Format with Prettier
```

## Testing

### Test Structure

```
test/
├── unit/                  # Unit tests
│   ├── auth.service.spec.ts
│   ├── two-factor.service.spec.ts
│   └── ...
├── e2e/                   # End-to-end tests
│   ├── auth.e2e-spec.ts
│   ├── user.e2e-spec.ts
│   └── ...
└── fixtures/              # Test data
```

### Testing Strategy

**Unit Tests**

- Service layer logic testing
- Isolated component testing
- Mock external dependencies
- Test edge cases and error handling

**Integration Tests**

- API endpoint testing
- Database interaction testing
- Authentication flow testing
- Authorization testing

**E2E Tests**

- Complete user workflows
- Multi-step processes (registration → verification → login)
- 2FA flows
- Password reset flows

### Test Coverage Goals

- Overall: 80%+
- Services: 90%+
- Controllers: 85%+
- Critical paths: 100%

## Error Handling

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "Email must be a valid email address"
    }
  ]
}
```

### HTTP Status Codes

- `200 OK` - Successful request
- `201 Created` - Resource created
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate email)
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Exception Filters

Custom exception filters handle:

- Validation errors
- Database errors
- Authentication errors
- Rate limiting errors
- Unhandled exceptions

## Performance & Scalability

### Performance Optimizations

**Database**

- Index optimization on frequently queried fields
- Connection pooling with Prisma
- Query optimization with select/include
- Pagination for large datasets
- Soft deletes for data retention

**Caching Strategy**

- Redis for rate limiting data
- Session caching
- OTP storage with TTL
- Account lockout tracking

**API Performance**

- Response compression
- Request validation at edge
- Database query batching
- Lazy loading of relations

### Scalability Considerations

**Horizontal Scaling**

- Stateless authentication with JWT
- Redis for shared state
- Database connection pooling
- Load balancer ready

**Vertical Scaling**

- Efficient resource utilization
- Memory-efficient password hashing
- Async operations where applicable
- Background job processing (planned)

**Database Scaling**

- Read replicas support (Prisma)
- Connection pooling
- Query optimization
- Partitioning strategy (future)

## Roadmap

### Planned Features

**Version 1.1**

- [ ] Swagger/OpenAPI documentation
- [ ] Admin dashboard endpoints
- [ ] User profile CRUD operations
- [ ] OAuth2 providers (Google, GitHub)

### Infrastructure Improvements

- [ ] Kubernetes deployment manifests
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Automated database backups
- [ ] Performance monitoring (APM)
- [ ] Security scanning in CI

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Rizal Achmad Saputra**

This backend API was developed as a demonstration of production-ready backend development practices, showcasing enterprise-grade authentication, security patterns, and architectural decisions suitable for scalable applications.

For questions, suggestions, or collaboration opportunities, please open an issue in the repository.

---

**Note**: This is a personal portfolio backend designed to demonstrate professional backend development skills. All security configurations, environment variables, and deployment settings should be reviewed and adjusted according to specific production requirements.
