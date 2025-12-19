import { getBaseURL, getAuthorizationHeader, resolveJSONPathTemplates} from '@sgnl-actions/utils';

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
async function enableAccount(accountId, baseUrl, authToken, externalVerificationId, forceProvisioning) {
  // Safely encode accountId to prevent injection
  const encodedAccountId = encodeURIComponent(accountId);
  const url = `${baseUrl}/v3/accounts/${encodedAccountId}/enable`;

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

  const response = await fetch(url, {
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
   * @param {Object} params - Input parameters
   * @param {string} params.accountId - The ID of the account to enable
   * @param {string} params.address - The SailPoint IdentityNow base URL
   * @param {string} params.externalVerificationId - Optional external verification ID
   * @param {boolean} params.forceProvisioning - Optional force provisioning flag
   *
   * @param {Object} context - Execution context with secrets and environment
   * @param {string} context.environment.ADDRESS - Default SailPoint IdentityNow API base URL
   *
   * The configured auth type will determine which of the following environment variables and secrets are available
   * @param {string} context.secrets.BEARER_AUTH_TOKEN
   *
   * @param {string} context.secrets.BASIC_USERNAME
   * @param {string} context.secrets.BASIC_PASSWORD
   *
   * @param {string} context.secrets.OAUTH2_CLIENT_CREDENTIALS_CLIENT_SECRET
   * @param {string} context.environment.OAUTH2_CLIENT_CREDENTIALS_AUDIENCE
   * @param {string} context.environment.OAUTH2_CLIENT_CREDENTIALS_AUTH_STYLE
   * @param {string} context.environment.OAUTH2_CLIENT_CREDENTIALS_CLIENT_ID
   * @param {string} context.environment.OAUTH2_CLIENT_CREDENTIALS_SCOPE
   * @param {string} context.environment.OAUTH2_CLIENT_CREDENTIALS_TOKEN_URL
   *
   * @param {string} context.secrets.OAUTH2_AUTHORIZATION_CODE_ACCESS_TOKEN
   *
   * @returns {Promise<Object>} Action result
   */
  invoke: async (params, context) => {
    const jobContext = context.data || {};

    // Resolve JSONPath templates in params
    const { result: resolvedParams, errors } = resolveJSONPathTemplates(params, jobContext);
    if (errors.length > 0) {
     console.warn('Template resolution errors:', errors);
    }

    const { accountId, externalVerificationId, forceProvisioning } = resolvedParams;

    console.log(`Starting SailPoint IdentityNow account enable for account: ${accountId}`);

    // Get base URL using utility function
    const baseUrl = getBaseURL(resolvedParams, context);

    // Get authorization header
    const authHeader = await getAuthorizationHeader(context);

    // Make the API request to enable account
    const response = await enableAccount(
      accountId,
      baseUrl,
      authHeader,
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
        enabledAt: new Date().toISOString(),
        address: baseUrl
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
   * Error handler for retryable failures
   * @param {Object} params - Contains the error from invoke
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Recovery result or throws for fatal errors
   */
  error: async (params, _context) => {
    const { error } = params;

    // Re-throw error to let framework handle retry logic
    throw error;
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