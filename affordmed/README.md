# URL Shortener Microservice

A production-ready URL shortening microservice built with Node.js, Express, and MongoDB. This service provides a robust API for creating, managing, and tracking shortened URLs with comprehensive analytics, geolocation tracking, and JWT-based authentication.

## 🚀 Features

- **URL Shortening**: Create shortened URLs with custom or auto-generated shortcodes
- **Expiration Management**: Set custom expiration times (default: 30 minutes)
- **Analytics**: Track clicks, referrers, and geolocation data
- **Custom Shortcodes**: Support for user-defined shortcodes
- **Geolocation Tracking**: Automatic IP-based location detection
- **JWT Authentication**: Secure user registration and authentication
- **Rate Limiting**: Built-in protection against abuse
- **Health Monitoring**: Comprehensive health checks
- **Custom Logging**: Structured logging without console.log
- **Error Handling**: Robust error handling with proper HTTP status codes

## 📋 Requirements

- Node.js >= 18.0.0
- MongoDB >= 4.4.0
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd url-shortener-microservice
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` file:

   ```env
   # Server Configuration
   PORT=3000
   HOST=0.0.0.0
   NODE_ENV=development

   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/url_shortener

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   JWT_EXPIRES_IN=24h

   # URL Shortener Configuration
   BASE_URL=http://localhost:3000

   # Logging
   LOG_LEVEL=info
   LOG_FORMAT=json
   ```

4. **Start MongoDB server**

   ```bash
   # On macOS with Homebrew
   brew services start mongodb-community

   # On Ubuntu/Debian
   sudo systemctl start mongod

   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

5. **Start the application**

   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## 🧪 Testing

Run the test suite:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

## 📚 API Documentation

### Base URL

```
http://localhost:3000
```

### Authentication Endpoints

#### 1. Register User

**POST** `/auth/register`

**Request Body:**

```json
{
  "email": "jayanthmurala1@gamil.com",
  "name": "Jayanthmurala",
  "mobileNo": "9999999999",
  "githubUsername": "github",
  "rollNo": "aalbb",
  "accessCode": "qxRMwq"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "email": "jayanthmurala@gamil.com",
    "name": "jayanthmurala",
    "rollNo": "aalbb",
    "accessCode": "qxRMwq",
    "clientID": "15cdaf0a-fa8d-4951-ae7c-3624524097e1",
    "clientSecret": "0aV51VssKLaGh3zF"
  },
  "message": "You can register only once. Do not forget to save your clientID and retrieve them again."
}
```

#### 2. Authenticate User

**POST** `/auth/auth`

**Request Body:**

```json
{
  "email": "jayanthmurala@gamil.com",
  "name": "jayanthmurala",
  "rollNo": "aalbb",
  "accessCode": "qxRMwq",
  "clientID": "15cdaf0a-fa8d-4951-ae7c-3624524097e1",
  "clientSecret": "0aV51VssKLaGh3zF"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "token_type": "Bearer",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 1743574344
  }
}
```

#### 3. Verify Token

**GET** `/auth/verify`

**Headers:**

```
Authorization: Bearer <your-jwt-token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "user": {
      "email": "jayanthmurala@gamil.com",
      "name": "jayanthmurala",
      "rollNo": "aalbb",
      "clientID": "15cdaf0a-fa8d-4951-ae7c-3624524097e1"
    }
  }
}
```

#### 4. Get User Profile

**GET** `/auth/profile`

**Headers:**

```
Authorization: Bearer <your-jwt-token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "email": "jayanthmurala@gamil.com",
    "name": "jayanthmurala",
    "mobileNo": "9999999999",
    "githubUsername": "github",
    "rollNo": "aalbb",
    "accessCode": "qxRMwq",
    "clientID": "15cdaf0a-fa8d-4951-ae7c-3624524097e1",
    "isRegistered": true,
    "lastLogin": "2024-01-01T12:00:00.000Z",
    "createdAt": "2024-01-01T10:00:00.000Z"
  }
}
```

### URL Shortening Endpoints (Protected)

#### 1. Create Shortened URL

**POST** `/shorturls`

**Headers:**

```
Authorization: Bearer <your-jwt-token>
```

**Request Body:**

```json
{
  "url": "https://example/very-long-url",
  "validity": 60,
  "shortcode": "my-custom-code"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "shortLink": "http://localhost:3000/my-custom-code",
    "expiry": "2024-01-01T12:00:00.000Z"
  }
}
```

#### 2. Get URL Statistics

**GET** `/shorturls/:shortcode`

**Headers:**

```
Authorization: Bearer <your-jwt-token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "totalClicks": 5,
    "originalUrl": "https://exampl/very-long-url",
    "createdAt": "2024-01-01T11:00:00.000Z",
    "expiry": "2024-01-01T12:00:00.000Z",
    "clickEvents": [
      {
        "timestamp": "2024-01-01T11:30:00.000Z",
        "referrer": "https://google.com",
        "geoLocation": {
          "country": "United States",
          "region": "California",
          "city": "San Francisco",
          "lat": 37.7749,
          "lon": -122.4194,
          "timezone": "America/Los_Angeles"
        }
      }
    ]
  }
}
```

#### 3. Delete Shortened URL

**DELETE** `/shorturls/:shortcode`

**Headers:**

```
Authorization: Bearer <your-jwt-token>
```

**Response:**

```json
{
  "success": true,
  "message": "URL deleted successfully"
}
```

### Public Endpoints

#### 1. Redirect to Original URL

**GET** `/:shortcode`

**Response:** HTTP 302 redirect to the original URL

#### 2. Health Check

**GET** `/health`

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T11:00:00.000Z",
    "services": {
      "mongodb": {
        "status": "healthy",
        "message": "MongoDB connection is working"
      }
    }
  }
}
```

#### 3. API Documentation

**GET** `/docs`

Returns comprehensive API documentation with examples.

## 🔧 Configuration

### Environment Variables

| Variable         | Default                                        | Description               |
| ---------------- | ---------------------------------------------- | ------------------------- |
| `PORT`           | 3000                                           | Server port               |
| `HOST`           | 0.0.0.0                                        | Server host               |
| `NODE_ENV`       | development                                    | Environment mode          |
| `MONGODB_URI`    | mongodb://localhost:27017/url_shortener        | MongoDB connection string |
| `JWT_SECRET`     | your-super-secret-jwt-key-change-in-production | JWT secret key            |
| `JWT_EXPIRES_IN` | 24h                                            | JWT token expiration      |
| `BASE_URL`       | http://localhost:3000                          | Base URL for shortlinks   |
| `LOG_LEVEL`      | info                                           | Logging level             |
| `LOG_FORMAT`     | json                                           | Logging format            |

### Rate Limiting

- **Window**: 15 minutes
- **Max Requests**: 100 per IP
- **Message**: "Too many requests from this IP"

##  Architecture

### Project Structure

```
src/
├── config/
│   └── config.js          # Application configuration
├── controllers/
│   ├── authController.js   # Authentication controllers
│   └── urlController.js    # URL shortening controllers
├── middleware/
│   ├── authMiddleware.js   # Authentication middleware
│   ├── logger.js          # Custom logging middleware
│   └── errorHandler.js    # Error handling middleware
├── models/
│   ├── User.js            # User model for authentication
│   └── Url.js             # MongoDB URL model
├── routes/
│   ├── authRoutes.js      # Authentication routes
│   └── urlRoutes.js       # URL shortening routes
├── services/
│   ├── authService.js     # Authentication service
│   ├── mongoService.js    # MongoDB service
│   ├── geoIp.js           # Geolocation service
│   └── urlService.js      # URL shortening service
├── utils/
│   ├── authUtils.js       # JWT utilities
│   ├── authValidators.js  # Authentication validation
│   ├── validators.js      # URL validation
│   └── shortcodeGenerator.js # Shortcode generation
└── server.js              # Main application entry point

tests/
└── urlService.test.js     # Test suite
```

### Database Schema (MongoDB)

#### User Collection

```javascript
{
  _id: ObjectId,
  email: String,
  name: String,
  mobileNo: String,
  githubUsername: String,
  rollNo: String,
  accessCode: String,
  clientID: String,
  clientSecret: String,
  isRegistered: Boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
```

#### URL Collection

```javascript
{
  _id: ObjectId,
  shortcode: String,
  originalUrl: String,
  createdAt: Date,
  expiresAt: Date,
  isActive: Boolean,
  clickCount: Number,
  clickEvents: [
    {
      timestamp: Date,
      referrer: String,
      geoLocation: {
        country: String,
        region: String,
        city: String,
        ip: String
      },
      userAgent: String
    }
  ],
  createdBy: String,
  metadata: Map
}
```

#### Indexes

- `email`: Unique index
- `rollNo`: Unique index
- `clientID`: Unique index
- `shortcode`: Unique index
- `expiresAt`: TTL index for automatic cleanup
- `isActive`: For filtering active URLs
- `createdAt`: For sorting and analytics

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt for client secret hashing
- **Input Validation**: Comprehensive validation using Joi
- **Rate Limiting**: Protection against abuse
- **CORS Configuration**: Configurable cross-origin requests
- **Helmet**: Security headers
- **Error Handling**: No sensitive information in error responses
- **Reserved Keywords**: Protection against route conflicts

## 📊 Monitoring & Logging

### Custom Logging

- Structured JSON logging in production
- Request/response logging
- Error tracking with stack traces
- Performance metrics
- Authentication attempt logging

### Health Checks

- MongoDB connection status
- Service availability
- Response time monitoring

## 🚀 Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/url_shortener
JWT_SECRET=yourSuperSecret
BASE_URL=https://your-domain
LOG_LEVEL=warn
```
