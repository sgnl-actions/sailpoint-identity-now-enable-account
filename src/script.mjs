/**
 * SailPoint IdentityNow Enable Account Action
 *
 * Enables an account in SailPoint IdentityNow by calling the /v3/accounts/{id}/enable endpoint.
 * This action is commonly used to re-enable disabled accounts for users who need access restored.
 */

/**
 * Helper function to enable an account in SailPoint IdentityNow
 * @private
 */
async function enableAccount(accountId, sailpointDomain, authToken, externalVerificationId, forceProvisioning) {
  // Safely encode accountId to prevent injection
  const encodedAccountId = encodeURIComponent(accountId);
  const url = new URL(`/v3/accounts/${encodedAccountId}/enable`, `https://${sailpointDomain}`);

  // Build request body
  const requestBody = {};

  if (externalVerificationId) {
    requestBody.externalVerificationId = externalVerificationId;
  }

  if (forceProvisioning !== undefined && forceProvisioning !== null) {
    requestBody.forceProvisioning = forceProvisioning;
  }

  // Ensure auth token has Bearer prefix
  const authHeader = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  return response;
}


export default {
  /**
   * Main execution handler - enables an account in SailPoint IdentityNow
   * @param {Object} params - Job input parameters
   * @param {string} params.accountId - The ID of the account to enable
   * @param {string} params.sailpointDomain - The SailPoint IdentityNow tenant domain
   * @param {string} params.externalVerificationId - Optional external verification ID
   * @param {boolean} params.forceProvisioning - Optional force provisioning flag
   * @param {Object} context - Execution context with env, secrets, outputs
   * @param {string} context.secrets.BEARER_AUTH_TOKEN - Bearer token for SailPoint IdentityNow API authentication
   * @returns {Object} Job results
   */
  invoke: async (params, context) => {
    const { accountId, sailpointDomain, externalVerificationId, forceProvisioning } = params;

    console.log(`Starting SailPoint IdentityNow account enable for account: ${accountId}`);

    // Validate inputs
    if (!accountId || typeof accountId !== 'string') {
      throw new Error('Invalid or missing accountId parameter');
    }
    if (!sailpointDomain || typeof sailpointDomain !== 'string') {
      throw new Error('Invalid or missing sailpointDomain parameter');
    }

    // Validate SailPoint API token is present
    if (!context.secrets?.BEARER_AUTH_TOKEN) {
      throw new Error('Missing required secret: BEARER_AUTH_TOKEN');
    }

    // Make the API request to enable account
    const response = await enableAccount(
      accountId,
      sailpointDomain,
      context.secrets.BEARER_AUTH_TOKEN,
      externalVerificationId,
      forceProvisioning
    );

    // Handle the response
    if (response.ok) {
      // 202 Accepted is the expected success response
      const responseData = await response.json();
      console.log(`Successfully initiated account enable for account ${accountId}`);

      return {
        accountId: accountId,
        enabled: true,
        taskId: responseData.id || responseData.taskId,
        message: responseData.message || 'Account enable operation initiated',
        enabledAt: new Date().toISOString()
      };
    }

    // Handle error responses
    const statusCode = response.status;
    let errorMessage = `Failed to enable account: HTTP ${statusCode}`;

    try {
      const errorBody = await response.json();
      if (errorBody.detailCode) {
        errorMessage = `Failed to enable account: ${errorBody.detailCode} - ${errorBody.trackingId || ''}`;
      } else if (errorBody.message) {
        errorMessage = `Failed to enable account: ${errorBody.message}`;
      }
      console.error('SailPoint API error response:', errorBody);
    } catch {
      // Response might not be JSON
      const errorText = await response.text();
      if (errorText) {
        errorMessage = `Failed to enable account: ${errorText}`;
      }
      console.error('Failed to parse error response');
    }

    // Throw error with status code for proper error handling
    const error = new Error(errorMessage);
    error.statusCode = statusCode;
    throw error;
  },

  /**
   * Error recovery handler - attempts to recover from retryable errors
   * @param {Object} params - Original params plus error information
   * @param {Object} context - Execution context
   * @returns {Object} Recovery results
   */
  error: async (params, context) => {
    const { error, accountId, sailpointDomain, externalVerificationId, forceProvisioning } = params;
    const statusCode = error.statusCode;

    console.error(`Account enable failed for account ${accountId}: ${error.message}`);

    // Get configurable backoff times from environment
    const rateLimitBackoffMs = parseInt(context.environment?.RATE_LIMIT_BACKOFF_MS || '30000', 10);
    const serviceErrorBackoffMs = parseInt(context.environment?.SERVICE_ERROR_BACKOFF_MS || '10000', 10);

    // Handle rate limiting (429)
    if (statusCode === 429 || error.message.includes('429') || error.message.includes('rate limit')) {
      console.log(`Rate limited by SailPoint API - waiting ${rateLimitBackoffMs}ms before retry`);
      await new Promise(resolve => setTimeout(resolve, rateLimitBackoffMs));

      console.log(`Retrying account enable for account ${accountId} after rate limit backoff`);

      // Retry the operation using helper function
      const retryResponse = await enableAccount(
        accountId,
        sailpointDomain,
        context.secrets.BEARER_AUTH_TOKEN,
        externalVerificationId,
        forceProvisioning
      );

      if (retryResponse.ok) {
        const responseData = await retryResponse.json();
        console.log(`Successfully enabled account ${accountId} after retry`);

        return {
          accountId: accountId,
          enabled: true,
          taskId: responseData.id || responseData.taskId,
          message: responseData.message || 'Account enable operation initiated after retry',
          enabledAt: new Date().toISOString(),
          recoveryMethod: 'rate_limit_retry'
        };
      }
    }

    // Handle temporary service issues (502, 503, 504)
    if ([502, 503, 504].includes(statusCode)) {
      console.log(`SailPoint service temporarily unavailable - waiting ${serviceErrorBackoffMs}ms before retry`);
      await new Promise(resolve => setTimeout(resolve, serviceErrorBackoffMs));

      console.log(`Retrying account enable for account ${accountId} after service interruption`);

      // Retry the operation using helper function
      const retryResponse = await enableAccount(
        accountId,
        sailpointDomain,
        context.secrets.BEARER_AUTH_TOKEN,
        externalVerificationId,
        forceProvisioning
      );

      if (retryResponse.ok) {
        const responseData = await retryResponse.json();
        console.log(`Successfully enabled account ${accountId} after service recovery`);

        return {
          accountId: accountId,
          enabled: true,
          taskId: responseData.id || responseData.taskId,
          message: responseData.message || 'Account enable operation initiated after service recovery',
          enabledAt: new Date().toISOString(),
          recoveryMethod: 'service_retry'
        };
      }
    }

    // Cannot recover from this error
    console.error(`Unable to recover from error for account ${accountId}`);
    throw new Error(`Unrecoverable error enabling account ${accountId}: ${error.message}`);
  },

  /**
   * Graceful shutdown handler - cleanup when job is halted
   * @param {Object} params - Original params plus halt reason
   * @param {Object} context - Execution context
   * @returns {Object} Cleanup results
   */
  halt: async (params, _context) => {
    const { reason, accountId } = params;
    console.log(`Account enable job is being halted (${reason}) for account ${accountId}`);

    // No cleanup needed for this simple operation
    // The POST request either completed or didn't

    return {
      accountId: accountId || 'unknown',
      reason: reason,
      haltedAt: new Date().toISOString(),
      cleanupCompleted: true
    };
  }
};