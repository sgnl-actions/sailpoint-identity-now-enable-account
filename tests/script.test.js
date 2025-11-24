import { jest } from '@jest/globals';
import script from '../src/script.mjs';

// Mock the global fetch function
global.fetch = jest.fn();
global.URL = URL;
global.console = {
  log: jest.fn(),
  error: jest.fn()
};
global.setTimeout = (fn) => {
  // For testing, execute immediately
  return fn();
};

describe('SailPoint IdentityNow Enable Account Action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('invoke handler', () => {
    it('should successfully enable an account', async () => {
      const params = {
        accountId: 'acc123',
        sailpointDomain: 'example.api.identitynow.com',
        externalVerificationId: 'ext456',
        forceProvisioning: true
      };

      const context = {
        secrets: {
          BEARER_AUTH_TOKEN: 'Bearer test-token'
        },
        environment: {}
      };

      const mockResponse = {
        ok: true,
        json: async () => ({ id: 'task789', message: 'Account enable initiated' })
      };
      fetch.mockResolvedValue(mockResponse);

      const result = await script.invoke(params, context);

      expect(fetch).toHaveBeenCalledWith(
        'https://example.api.identitynow.com/v3/accounts/acc123/enable',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-token',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            externalVerificationId: 'ext456',
            forceProvisioning: true
          })
        }
      );

      expect(result).toEqual({
        accountId: 'acc123',
        enabled: true,
        taskId: 'task789',
        message: 'Account enable initiated',
        enabledAt: expect.any(String)
      });
    });

    it('should handle missing optional parameters', async () => {
      const params = {
        accountId: 'acc123',
        sailpointDomain: 'example.api.identitynow.com'
      };

      const context = {
        secrets: {
          BEARER_AUTH_TOKEN: 'test-token'
        },
        environment: {}
      };

      const mockResponse = {
        ok: true,
        json: async () => ({ taskId: 'task789' })
      };
      fetch.mockResolvedValue(mockResponse);

      const result = await script.invoke(params, context);

      expect(fetch).toHaveBeenCalledWith(
        'https://example.api.identitynow.com/v3/accounts/acc123/enable',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-token',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        }
      );

      expect(result.enabled).toBe(true);
    });

    it('should validate required parameters', async () => {
      const context = {
        secrets: {
          BEARER_AUTH_TOKEN: 'test-token'
        }
      };

      await expect(script.invoke({}, context))
        .rejects.toThrow('Invalid or missing accountId parameter');

      await expect(script.invoke({ accountId: 'acc123' }, context))
        .rejects.toThrow('Invalid or missing sailpointDomain parameter');
    });

    it('should validate required secrets', async () => {
      const params = {
        accountId: 'acc123',
        sailpointDomain: 'example.api.identitynow.com'
      };

      const context = { secrets: {} };

      await expect(script.invoke(params, context))
        .rejects.toThrow('Missing required secret: BEARER_AUTH_TOKEN');
    });

    it('should handle API error responses', async () => {
      const params = {
        accountId: 'acc123',
        sailpointDomain: 'example.api.identitynow.com'
      };

      const context = {
        secrets: {
          BEARER_AUTH_TOKEN: 'test-token'
        }
      };

      const mockResponse = {
        ok: false,
        status: 404,
        json: async () => ({
          detailCode: 'NOT_FOUND',
          trackingId: 'track123'
        })
      };
      fetch.mockResolvedValue(mockResponse);

      await expect(script.invoke(params, context))
        .rejects.toThrow('Failed to enable account: NOT_FOUND - track123');
    });

    it('should handle non-JSON error responses', async () => {
      const params = {
        accountId: 'acc123',
        sailpointDomain: 'example.api.identitynow.com'
      };

      const context = {
        secrets: {
          BEARER_AUTH_TOKEN: 'test-token'
        }
      };

      const mockResponse = {
        ok: false,
        status: 500,
        json: async () => { throw new Error('Not JSON'); },
        text: async () => 'Internal Server Error'
      };
      fetch.mockResolvedValue(mockResponse);

      await expect(script.invoke(params, context))
        .rejects.toThrow('Failed to enable account: Internal Server Error');
    });

    it('should encode accountId to prevent injection', async () => {
      const params = {
        accountId: 'acc/123&test=1',
        sailpointDomain: 'example.api.identitynow.com'
      };

      const context = {
        secrets: {
          BEARER_AUTH_TOKEN: 'test-token'
        }
      };

      const mockResponse = {
        ok: true,
        json: async () => ({ id: 'task789' })
      };
      fetch.mockResolvedValue(mockResponse);

      await script.invoke(params, context);

      expect(fetch).toHaveBeenCalledWith(
        'https://example.api.identitynow.com/v3/accounts/acc%2F123%26test%3D1/enable',
        expect.any(Object)
      );
    });
  });

  describe('error handler', () => {
    it('should retry on rate limiting (429)', async () => {
      const params = {
        accountId: 'acc123',
        sailpointDomain: 'example.api.identitynow.com',
        error: { message: 'HTTP 429', statusCode: 429 }
      };

      const context = {
        secrets: {
          BEARER_AUTH_TOKEN: 'test-token'
        },
        environment: {
          RATE_LIMIT_BACKOFF_MS: '1000'
        }
      };

      const mockResponse = {
        ok: true,
        json: async () => ({ id: 'task789' })
      };
      fetch.mockResolvedValue(mockResponse);

      const result = await script.error(params, context);

      expect(result).toMatchObject({
        accountId: 'acc123',
        enabled: true,
        recoveryMethod: 'rate_limit_retry'
      });
    });

    it('should retry on service errors (502, 503, 504)', async () => {
      const params = {
        accountId: 'acc123',
        sailpointDomain: 'example.api.identitynow.com',
        error: { message: 'Service unavailable', statusCode: 503 }
      };

      const context = {
        secrets: {
          BEARER_AUTH_TOKEN: 'test-token'
        },
        environment: {
          SERVICE_ERROR_BACKOFF_MS: '500'
        }
      };

      const mockResponse = {
        ok: true,
        json: async () => ({ taskId: 'task789' })
      };
      fetch.mockResolvedValue(mockResponse);

      const result = await script.error(params, context);

      expect(result).toMatchObject({
        accountId: 'acc123',
        enabled: true,
        recoveryMethod: 'service_retry'
      });
    });

    it('should throw on unrecoverable errors', async () => {
      const params = {
        accountId: 'acc123',
        error: { message: 'Authentication failed', statusCode: 401 }
      };

      const context = {
        secrets: {},
        environment: {}
      };

      await expect(script.error(params, context))
        .rejects.toThrow('Unrecoverable error enabling account acc123: Authentication failed');
    });
  });

  describe('halt handler', () => {
    it('should handle graceful shutdown', async () => {
      const params = {
        accountId: 'acc123',
        reason: 'user_requested'
      };

      const context = {};

      const result = await script.halt(params, context);

      expect(result).toEqual({
        accountId: 'acc123',
        reason: 'user_requested',
        haltedAt: expect.any(String),
        cleanupCompleted: true
      });
    });

    it('should handle missing accountId', async () => {
      const params = {
        reason: 'timeout'
      };

      const context = {};

      const result = await script.halt(params, context);

      expect(result.accountId).toBe('unknown');
      expect(result.reason).toBe('timeout');
    });
  });
});