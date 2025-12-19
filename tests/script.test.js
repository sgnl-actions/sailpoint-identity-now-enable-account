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
        address: 'https://example.api.identitynow.com',
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
        address: 'https://example.api.identitynow.com',
        enabled: true,
        taskId: 'task789',
        message: 'Account enable initiated',
        enabledAt: expect.any(String)
      });
    });

    it('should handle missing optional parameters', async () => {
      const params = {
        accountId: 'acc123',
        address: 'https://example.api.identitynow.com'
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


    it('should handle API error responses', async () => {
      const params = {
        accountId: 'acc123',
        address: 'https://example.api.identitynow.com'
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
        address: 'https://example.api.identitynow.com'
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
        address: 'https://example.api.identitynow.com'
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
    it('should rethrow errors', async () => {
      const testError = new Error('Test error');
      const params = {
        accountId: 'acc123',
        error: testError
      };
      const context = {};

      await expect(script.error(params, context)).rejects.toThrow('Test error');
    });

    it('should rethrow errors with status codes', async () => {
      const error = new Error('HTTP 429');
      error.statusCode = 429;
      const params = {
        accountId: 'acc123',
        error
      };
      const context = {};

      await expect(script.error(params, context)).rejects.toThrow('HTTP 429');
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