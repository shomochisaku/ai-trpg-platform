# Authentication System Documentation

## Overview

The AI-TRPG platform uses JWT (JSON Web Token) based authentication with refresh tokens for secure user management. The system provides comprehensive user registration, login, token refresh, and logout functionality with security best practices.

## Architecture

### Components

1. **JWT Utilities** (`src/utils/jwt.ts`)
   - Token generation and verification
   - Access tokens (15 minutes) and refresh tokens (7 days)
   - Token payload validation

2. **Authentication Middleware** (`src/middleware/auth.ts`)
   - Request authentication
   - Resource ownership verification
   - User context injection

3. **Input Validation** (`src/utils/validation.ts`)
   - Zod-based schema validation
   - Password strength requirements
   - Email format validation

4. **Rate Limiting** (`src/middleware/rateLimiter.ts`)
   - Authentication attempt limiting
   - Account lockout protection
   - AI action rate limiting

## API Endpoints

### Authentication Routes (`/api/auth`)

#### POST `/api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "username": "optional_username",
  "displayName": "Optional Display Name"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clx1234567890",
      "email": "user@example.com",
      "username": "optional_username",
      "displayName": "Optional Display Name",
      "createdAt": "2023-01-01T00:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### POST `/api/auth/login`
Authenticate existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clx1234567890",
      "email": "user@example.com",
      "username": "optional_username",
      "displayName": "Optional Display Name",
      "createdAt": "2023-01-01T00:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### POST `/api/auth/refresh`
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clx1234567890",
      "email": "user@example.com",
      "username": "optional_username",
      "displayName": "Optional Display Name"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### GET `/api/auth/me`
Get current user information (requires authentication).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "clx1234567890",
    "email": "user@example.com",
    "username": "optional_username",
    "displayName": "Optional Display Name",
    "avatar": null,
    "bio": null,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

#### POST `/api/auth/logout`
Logout user and invalidate refresh token (requires authentication).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Security Features

### Password Requirements
- Minimum 8 characters
- At least one lowercase letter
- At least one uppercase letter  
- At least one number
- Maximum 128 characters

### Rate Limiting
- **Authentication attempts**: 5 per 15 minutes per IP
- **Registration attempts**: 3 per hour per IP
- **AI actions**: 30 per minute per user
- **Campaign creation**: 3 per 5 minutes per user

### Account Lockout
- **Failed login attempts**: 5 attempts
- **Lockout duration**: 15 minutes
- **Automatic unlock**: After lockout period expires

### Token Security
- **Access tokens**: 15 minute expiration
- **Refresh tokens**: 7 day expiration
- **Secure storage**: Refresh tokens stored in database
- **Token rotation**: New refresh tokens issued on refresh
- **Logout invalidation**: Tokens invalidated on logout

### Input Validation
- **Email validation**: Format and disposable email checking
- **Username validation**: Alphanumeric, underscore, hyphen only
- **XSS protection**: Input sanitization
- **Schema validation**: Comprehensive Zod schemas

## Protected Routes

All campaign-related routes require authentication:

- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns` - List user campaigns
- `GET /api/campaigns/:id` - Get campaign (owner only)
- `PUT /api/campaigns/:id` - Update campaign (owner only)
- `DELETE /api/campaigns/:id` - Delete campaign (owner only)
- `GET /api/campaigns/:id/stats` - Campaign stats (owner only)
- `POST /api/campaigns/:id/action` - Process action (owner only)

## Environment Variables

Required environment variables for authentication:

```env
# JWT Configuration
JWT_SECRET="your-jwt-secret-key-at-least-32-characters-long"
JWT_REFRESH_SECRET="your-refresh-token-secret-key-different-from-jwt-secret"

# Password Hashing
BCRYPT_ROUNDS=12

# Optional Admin Configuration
ADMIN_EMAILS="admin1@example.com,admin2@example.com"
```

## Error Codes

### Authentication Errors
- `TOKEN_MISSING` - No authorization token provided
- `TOKEN_INVALID` - Invalid or malformed token
- `USER_NOT_FOUND` - User associated with token not found
- `AUTH_REQUIRED` - Authentication required for this endpoint
- `ADMIN_REQUIRED` - Admin privileges required

### Registration Errors
- `VALIDATION_ERROR` - Input validation failed
- `USER_EXISTS` - User with email or username already exists
- `DISPOSABLE_EMAIL` - Disposable email addresses not allowed
- `REGISTRATION_ERROR` - General registration failure

### Login Errors
- `INVALID_CREDENTIALS` - Invalid email or password
- `ACCOUNT_LOCKED` - Account temporarily locked
- `LOGIN_ERROR` - General login failure

### Token Errors
- `INVALID_REFRESH_TOKEN` - Invalid or expired refresh token
- `REFRESH_ERROR` - Token refresh failed

### Resource Errors
- `RESOURCE_NOT_FOUND` - Resource not found or access denied
- `AUTH_CHECK_ERROR` - Authorization check failed

## Usage Examples

### Frontend Integration

```typescript
// Login example
const login = async (email: string, password: string) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Store tokens securely
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    return data.data.user;
  } else {
    throw new Error(data.error);
  }
};

// Authenticated request example
const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
  const accessToken = localStorage.getItem('accessToken');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (response.status === 401) {
    // Try to refresh token
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      const refreshResponse = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        localStorage.setItem('accessToken', refreshData.data.accessToken);
        localStorage.setItem('refreshToken', refreshData.data.refreshToken);
        
        // Retry original request
        return makeAuthenticatedRequest(url, options);
      }
    }
    
    // Redirect to login
    window.location.href = '/login';
    return;
  }
  
  return response.json();
};
```

## Testing

Run authentication tests:

```bash
npm test -- auth.integration.test.ts
```

The test suite covers:
- User registration with validation
- Login with rate limiting
- Token refresh functionality
- Protected route access
- Error handling scenarios

## Database Schema

The authentication system uses the following database fields:

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  username     String   @unique
  password     String
  refreshToken String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  // Profile fields
  displayName String?
  avatar      String?
  bio         String?
  
  // Relations
  gameSessions     GameSession[]
  messages         GameMessage[]
  characters       Character[]
  // ... other relations
}
```

## Troubleshooting

### Common Issues

1. **JWT_SECRET not set**
   - Ensure JWT_SECRET environment variable is configured
   - Use a secure random string at least 32 characters long

2. **Token expired errors**
   - Implement automatic token refresh in frontend
   - Check system clock synchronization

3. **Rate limiting issues**
   - Check rate limit headers in response
   - Implement exponential backoff for failed attempts

4. **Database connection errors**
   - Verify DATABASE_URL is correct
   - Run database migrations: `npm run prisma:migrate`

5. **CORS issues**
   - Configure FRONTEND_URL environment variable
   - Update CORS settings in server configuration

### Debug Mode

Enable debug logging for authentication:

```env
LOG_LEVEL=debug
```

This will log detailed information about:
- Token verification attempts
- Authentication middleware execution
- Rate limiting decisions
- Database queries

## Security Considerations

1. **Token Storage**
   - Store access tokens in memory or secure HTTP-only cookies
   - Never store tokens in localStorage in production
   - Consider using secure, HTTP-only cookies for refresh tokens

2. **HTTPS Requirements**
   - Always use HTTPS in production
   - Set secure cookie flags appropriately

3. **Environment Security**
   - Use strong, unique JWT secrets
   - Rotate secrets periodically
   - Never commit secrets to version control

4. **Database Security**
   - Use connection pooling
   - Enable database query logging in development only
   - Regular security updates for dependencies

5. **Monitoring**
   - Monitor failed login attempts
   - Set up alerts for unusual authentication patterns
   - Log security events for audit trails