# URL Shortener Microservice - Design Document

## 🎯 Overview

This document outlines the design decisions, architecture, and implementation details for the URL Shortener Microservice. The service is built as a production-ready microservice using Node.js, Express, and MongoDB, following microservice best practices.

## 🏗️ Architecture

### Technology Stack

| Component | Technology | Version | Rationale |
|-----------|------------|---------|-----------|
| **Runtime** | Node.js | >= 18.0.0 | LTS version with modern ES features |
| **Framework** | Express.js | ^4.18.2 | Lightweight, flexible, widely adopted |
| **Database** | MongoDB | ^4.4.0 | Document-based, scalable, flexible schema |
| **ODM** | Mongoose | ^8.0.3 | MongoDB object modeling and validation |
| **Validation** | Joi | ^17.11.0 | Robust schema validation |
| **ID Generation** | nanoid | ^5.0.4 | URL-safe, collision-resistant IDs |
| **HTTP Client** | axios | ^1.6.2 | Promise-based HTTP client |
| **Security** | helmet | ^7.1.0 | Security headers middleware |
| **Rate Limiting** | express-rate-limit | ^7.1.5 | Built-in protection against abuse |
| **Compression** | compression | ^1.7.4 | Response compression |
| **CORS** | cors | ^2.8.5 | Cross-origin resource sharing |

### Architecture Patterns

1. **Layered Architecture**
   - Controllers: Handle HTTP requests/responses
   - Services: Business logic layer
   - Models: Data layer with Mongoose schemas
   - Utilities: Helper functions and validators
   - Middleware: Cross-cutting concerns

2. **Dependency Injection**
   - Services are injected where needed
   - Easy to test and mock
   - Loose coupling between components

3. **Singleton Pattern**
   - Database connections
   - Logger instances
   - Service instances

4. **Factory Pattern**
   - Shortcode generation strategies
   - Error handling strategies

## 🗄️ Database Design

### MongoDB Schema

#### URL Collection
```javascript
{
  _id: ObjectId,
  shortcode: String,           // Unique, indexed
  originalUrl: String,         // Required
  createdAt: Date,            // Auto-generated, indexed
  expiresAt: Date,            // Required, indexed
  isActive: Boolean,          // Default: true, indexed
  clickCount: Number,         // Default: 0
  clickEvents: [              // Array of click events
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
  createdBy: String,          // Default: 'system'
  metadata: Map               // Additional data
}
```

#### Indexes
- `shortcode`: Unique index for fast lookups
- `expiresAt`: TTL index for automatic cleanup
- `isActive`: For filtering active URLs
- `createdAt`: For sorting and analytics

#### MongoDB Features Used
- **Document Storage**: Flexible schema for analytics
- **Indexing**: Optimized query performance
- **TTL Indexes**: Automatic document expiration
- **Aggregation**: Complex analytics queries
- **Transactions**: Data consistency

### Why MongoDB?

1. **Flexibility**: Schema evolution without migrations
2. **Scalability**: Horizontal scaling with sharding
3. **Analytics**: Rich aggregation capabilities
4. **Performance**: Efficient indexing and querying
5. **Durability**: ACID compliance with transactions

## 🔧 Core Components

### 1. URL Service (`src/services/urlService.js`)
**Responsibilities:**
- URL creation and validation
- Shortcode generation and management
- Analytics tracking
- Expiration handling

**Key Methods:**
- `createShortUrl()` - Creates shortened URLs
- `getUrlStats()` - Retrieves analytics
- `redirectToUrl()` - Handles redirects with tracking
- `deleteUrl()` - Removes URLs
- `cleanupExpiredUrls()` - Automatic cleanup

### 2. MongoDB Service (`src/services/mongoService.js`)
**Responsibilities:**
- Database connection management
- Connection health monitoring
- Error handling and retries
- Graceful shutdown

**Features:**
- Connection pooling
- Automatic reconnection
- Health checks
- Structured logging

### 3. URL Model (`src/models/Url.js`)
**Responsibilities:**
- Data schema definition
- Validation rules
- Instance methods
- Static methods

**Features:**
- Mongoose schema with validation
- Virtual properties (isExpired, shortLink)
- Pre-save middleware
- Index management

### 4. Geo IP Service (`src/services/geoIp.js`)
**Responsibilities:**
- IP geolocation lookup
- Client IP detection
- Location data enrichment

**External API:**
- Free IP-API service
- Fallback handling
- Rate limiting consideration

### 5. Custom Logger (`src/middleware/logger.js`)
**Features:**
- Structured JSON logging
- Request/response tracking
- Performance metrics
- Error tracking
- No console.log usage (as required)

## 🔒 Security Considerations

### Input Validation
- **Joi Schema Validation**: Comprehensive request validation
- **Mongoose Validation**: Database-level validation
- **URL Sanitization**: Protocol enforcement
- **Shortcode Validation**: Format and length checks
- **Reserved Keywords**: Protection against route conflicts

### Rate Limiting
- **Window**: 15 minutes
- **Limit**: 100 requests per IP
- **Headers**: Standard rate limit headers
- **Custom Messages**: User-friendly error messages

### Security Headers
- **Helmet**: Security headers middleware
- **CORS**: Configurable cross-origin policies
- **Content Security Policy**: Disabled for API service
- **Trust Proxy**: Real IP detection

### Error Handling
- **No Sensitive Data**: Error responses don't leak information
- **Structured Errors**: Consistent error format
- **Status Codes**: Proper HTTP status codes
- **Logging**: Error tracking without exposure

## 📊 Analytics & Tracking

### Click Events
Each redirect generates a click event with:
- **Timestamp**: ISO 8601 format
- **Referrer**: HTTP referrer header
- **Geolocation**: Country, region, city, coordinates
- **User Agent**: Browser/client information

### Geolocation Strategy
1. **IP Detection**: Multiple header checks
2. **Private IP Handling**: Skip local/private IPs
3. **External API**: Free IP-API service
4. **Fallback**: Default location for failures
5. **Caching**: Consider MongoDB caching for performance

## 🚀 Performance Optimizations

### Caching Strategy
- **MongoDB Indexing**: Optimized query performance
- **Connection Pooling**: Efficient connections
- **Compression**: Response compression
- **TTL Indexes**: Automatic cleanup

### Scalability Considerations
- **Stateless Design**: No session storage
- **Horizontal Scaling**: Multiple instances
- **Load Balancing**: Ready for load balancers
- **Database Sharding**: MongoDB cluster support

### Monitoring & Observability
- **Health Checks**: Service availability
- **Custom Logging**: Structured logging
- **Error Tracking**: Comprehensive error handling
- **Performance Metrics**: Response time tracking

## 🔄 API Design

### RESTful Endpoints
```
POST   /shorturls          # Create shortened URL
GET    /shorturls/:code    # Get URL statistics
GET    /:code              # Redirect to original URL
DELETE /shorturls/:code    # Delete shortened URL
GET    /health             # Health check
GET    /docs               # API documentation
```

### Response Format
```json
{
  "success": true,
  "data": { ... },
  "error": "Error message",
  "details": [ ... ]
}
```

### Error Handling
- **400**: Bad Request (validation errors)
- **404**: Not Found (URL not found)
- **410**: Gone (URL expired)
- **409**: Conflict (duplicate shortcode)
- **429**: Too Many Requests (rate limiting)
- **500**: Internal Server Error
- **503**: Service Unavailable (health check)

## 🧪 Testing Strategy

### Test Coverage
- **Unit Tests**: Service layer testing
- **Integration Tests**: API endpoint testing
- **Mocking**: MongoDB and external services
- **Error Scenarios**: Edge case handling

### Test Structure
```
tests/
└── urlService.test.js     # Core service tests
```

### Testing Tools
- **Jest**: Test framework
- **Supertest**: HTTP assertions
- **Mocking**: Service dependencies

## 🚀 Deployment Considerations

### Environment Configuration
- **Development**: Local MongoDB, debug logging
- **Production**: External MongoDB, structured logging
- **Staging**: Similar to production

### Docker Support
- **Multi-stage builds**: Optimized images
- **Health checks**: Container health monitoring
- **Environment variables**: Configuration management

### Monitoring
- **Health endpoints**: Service status
- **Logging**: Structured application logs
- **Metrics**: Performance monitoring
- **Alerts**: Error notification

## 🔮 Future Enhancements

### Potential Improvements
1. **User Authentication**: User-specific URLs
2. **Custom Domains**: Branded shortlinks
3. **QR Code Generation**: Mobile-friendly links
4. **Analytics Dashboard**: Web interface
5. **Webhook Support**: Real-time notifications
6. **Bulk Operations**: Batch URL creation
7. **API Rate Limiting**: Per-user limits
8. **Advanced Analytics**: MongoDB aggregation pipelines

### Scalability Plans
1. **MongoDB Atlas**: Cloud-hosted MongoDB
2. **Load Balancer**: Multiple instances
3. **CDN Integration**: Global distribution
4. **Microservice Split**: Separate analytics service

## 📋 Assumptions & Constraints

### Technical Assumptions
1. **Pre-authorized Access**: No authentication required
2. **MongoDB Availability**: MongoDB is always available
3. **External API Reliability**: Geo IP service is reliable
4. **Network Stability**: Stable internet connection

### Business Constraints
1. **URL Expiration**: Default 30 minutes, max 24 hours
2. **Shortcode Length**: 8 characters default, 3-20 range
3. **Rate Limiting**: 100 requests per 15 minutes
4. **Reserved Keywords**: Protected route names

### Performance Constraints
1. **Response Time**: < 200ms for redirects
2. **Concurrent Users**: 1000+ simultaneous users
3. **Storage**: MongoDB storage constraints
4. **External APIs**: Rate limiting considerations

## 🎯 Success Metrics

### Performance Metrics
- **Response Time**: < 200ms average
- **Uptime**: 99.9% availability
- **Error Rate**: < 0.1% error rate
- **Throughput**: 1000+ requests/second

### Business Metrics
- **URL Creation**: Successful shortening rate
- **Click Tracking**: Analytics accuracy
- **User Experience**: Redirect success rate
- **System Health**: Service availability

This design document provides a comprehensive overview of the URL Shortener Microservice architecture, implementation details, and considerations for production deployment. 