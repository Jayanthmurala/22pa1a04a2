const urlService = require('../src/services/urlService');
const Url = require('../src/models/Url');
const { logger } = require('../src/middleware/logger');

// Mock MongoDB models and services
jest.mock('../src/models/Url');
jest.mock('../src/middleware/logger');

describe('URL Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset URL model mocks
    Url.findByShortcode.mockReset();
    Url.shortcodeExists.mockReset();
    Url.findOne.mockReset();
  });

  describe('createShortUrl', () => {
    it('should create a shortened URL with valid input', async () => {
      const mockData = {
        url: 'https://example.com/very-long-url',
        validity: 60
      };

      const mockUrlDoc = {
        shortLink: 'http://localhost:3000/abc123',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        save: jest.fn().mockResolvedValue(true)
      };

      Url.shortcodeExists.mockResolvedValue(false);
      Url.mockImplementation(() => mockUrlDoc);

      const result = await urlService.createShortUrl(mockData);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('shortLink');
      expect(result.data).toHaveProperty('expiry');
      expect(mockUrlDoc.save).toHaveBeenCalled();
    });

    it('should create URL with custom shortcode', async () => {
      const mockData = {
        url: 'https://example.com/very-long-url',
        shortcode: 'my-custom-code'
      };

      const mockUrlDoc = {
        shortLink: 'http://localhost:3000/my-custom-code',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        save: jest.fn().mockResolvedValue(true)
      };

      Url.shortcodeExists.mockResolvedValue(false);
      Url.mockImplementation(() => mockUrlDoc);

      const result = await urlService.createShortUrl(mockData);

      expect(result.success).toBe(true);
      expect(result.data.shortLink).toContain('my-custom-code');
    });

    it('should reject invalid URL', async () => {
      const mockData = {
        url: 'invalid-url',
        validity: 30
      };

      const result = await urlService.createShortUrl(mockData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
    });

    it('should reject reserved shortcode', async () => {
      const mockData = {
        url: 'https://example.com/very-long-url',
        shortcode: 'api'
      };

      const result = await urlService.createShortUrl(mockData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Shortcode not available');
    });

    it('should reject duplicate shortcode', async () => {
      const mockData = {
        url: 'https://example.com/very-long-url',
        shortcode: 'existing-code'
      };

      Url.shortcodeExists.mockResolvedValue(true);

      const result = await urlService.createShortUrl(mockData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Shortcode not available');
    });

    it('should handle MongoDB duplicate key error', async () => {
      const mockData = {
        url: 'https://example.com/very-long-url'
      };

      const mockUrlDoc = {
        save: jest.fn().mockRejectedValue({ code: 11000 })
      };

      Url.shortcodeExists.mockResolvedValue(false);
      Url.mockImplementation(() => mockUrlDoc);

      const result = await urlService.createShortUrl(mockData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Shortcode already exists');
    });
  });

  describe('getUrlStats', () => {
    it('should return URL statistics for valid shortcode', async () => {
      const mockUrlDoc = {
        originalUrl: 'https://example.com/very-long-url',
        shortcode: 'test-code',
        createdAt: new Date('2024-01-01T10:00:00.000Z'),
        expiresAt: new Date('2024-12-31T23:59:59.000Z'),
        clickCount: 5,
        isExpired: false,
        clickEvents: [
          {
            timestamp: new Date('2024-01-01T11:00:00.000Z'),
            referrer: 'https://google.com',
            geoLocation: {
              country: 'United States',
              city: 'San Francisco'
            }
          }
        ]
      };

      Url.findByShortcode.mockResolvedValue(mockUrlDoc);

      const result = await urlService.getUrlStats('test-code');

      expect(result.success).toBe(true);
      expect(result.data.totalClicks).toBe(5);
      expect(result.data.originalUrl).toBe('https://example.com/very-long-url');
      expect(result.data.clickEvents).toHaveLength(1);
    });

    it('should return 404 for non-existent shortcode', async () => {
      Url.findByShortcode.mockResolvedValue(null);

      const result = await urlService.getUrlStats('non-existent');

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.error).toBe('URL not found');
    });

    it('should return 410 for expired URL', async () => {
      const mockUrlDoc = {
        originalUrl: 'https://example.com/very-long-url',
        expiresAt: new Date('2020-01-01T00:00:00.000Z'),
        clickCount: 0,
        isExpired: true
      };

      Url.findByShortcode.mockResolvedValue(mockUrlDoc);

      const result = await urlService.getUrlStats('expired-code');

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(410);
      expect(result.error).toBe('URL has expired');
    });

    it('should reject invalid shortcode format', async () => {
      const result = await urlService.getUrlStats('invalid@code');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid shortcode format');
    });
  });

  describe('redirectToUrl', () => {
    it('should redirect to original URL and log click', async () => {
      const mockUrlDoc = {
        originalUrl: 'https://example.com/very-long-url',
        shortcode: 'test-code',
        expiresAt: new Date('2024-12-31T23:59:59.000Z'),
        clickCount: 0,
        isExpired: false,
        addClickEvent: jest.fn().mockResolvedValue(true)
      };

      const mockReq = {
        get: jest.fn().mockReturnValue('https://google.com'),
        ip: '127.0.0.1'
      };

      Url.findByShortcode.mockResolvedValue(mockUrlDoc);

      const result = await urlService.redirectToUrl('test-code', mockReq);

      expect(result.success).toBe(true);
      expect(result.data.originalUrl).toBe('https://example.com/very-long-url');
      expect(mockUrlDoc.addClickEvent).toHaveBeenCalled();
    });

    it('should return 404 for non-existent shortcode', async () => {
      Url.findByShortcode.mockResolvedValue(null);

      const result = await urlService.redirectToUrl('non-existent', {});

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
    });

    it('should return 410 for expired URL', async () => {
      const mockUrlDoc = {
        originalUrl: 'https://example.com/very-long-url',
        expiresAt: new Date('2020-01-01T00:00:00.000Z'),
        isExpired: true
      };

      Url.findByShortcode.mockResolvedValue(mockUrlDoc);

      const result = await urlService.redirectToUrl('expired-code', {});

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(410);
    });
  });

  describe('deleteUrl', () => {
    it('should delete existing URL', async () => {
      const mockUrlDoc = {
        shortcode: 'test-code',
        deactivate: jest.fn().mockResolvedValue(true)
      };

      Url.findOne.mockResolvedValue(mockUrlDoc);

      const result = await urlService.deleteUrl('test-code');

      expect(result.success).toBe(true);
      expect(result.message).toBe('URL deleted successfully');
      expect(mockUrlDoc.deactivate).toHaveBeenCalled();
    });

    it('should return error for non-existent URL', async () => {
      Url.findOne.mockResolvedValue(null);

      const result = await urlService.deleteUrl('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('URL not found');
    });

    it('should reject invalid shortcode format', async () => {
      const result = await urlService.deleteUrl('invalid@code');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid shortcode format');
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status when MongoDB is connected', async () => {
      const mockMongoService = {
        healthCheck: jest.fn().mockResolvedValue({
          status: 'healthy',
          message: 'MongoDB connection is working'
        })
      };

      jest.doMock('../src/services/mongoService', () => mockMongoService);

      const result = await urlService.getHealthStatus();

      expect(result.status).toBe('healthy');
      expect(result.services.mongodb.status).toBe('healthy');
    });

    it('should return unhealthy status when MongoDB is disconnected', async () => {
      const mockMongoService = {
        healthCheck: jest.fn().mockResolvedValue({
          status: 'unhealthy',
          message: 'MongoDB connection failed'
        })
      };

      jest.doMock('../src/services/mongoService', () => mockMongoService);

      const result = await urlService.getHealthStatus();

      expect(result.status).toBe('unhealthy');
      expect(result.services.mongodb.status).toBe('unhealthy');
    });
  });

  describe('cleanupExpiredUrls', () => {
    it('should cleanup expired URLs', async () => {
      const mockExpiredUrls = [
        { deactivate: jest.fn().mockResolvedValue(true) },
        { deactivate: jest.fn().mockResolvedValue(true) }
      ];

      Url.getExpiredUrls.mockResolvedValue(mockExpiredUrls);

      const result = await urlService.cleanupExpiredUrls();

      expect(result).toBe(2);
      expect(mockExpiredUrls[0].deactivate).toHaveBeenCalled();
      expect(mockExpiredUrls[1].deactivate).toHaveBeenCalled();
    });

    it('should return 0 when no expired URLs exist', async () => {
      Url.getExpiredUrls.mockResolvedValue([]);

      const result = await urlService.cleanupExpiredUrls();

      expect(result).toBe(0);
    });
  });
}); 