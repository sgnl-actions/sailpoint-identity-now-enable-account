# SailPoint IdentityNow Enable Account Action

This SGNL action enables a disabled account in SailPoint IdentityNow. It's commonly used to restore access for users who need their accounts re-enabled after being disabled.

## Overview

The action calls the SailPoint IdentityNow `/v3/accounts/{id}/enable` API endpoint to initiate an account enable operation. This creates a provisioning task that processes asynchronously in SailPoint.

## Prerequisites

- SailPoint IdentityNow tenant with API access enabled
- Valid API credentials (Personal Access Token or OAuth2)
- Account ID of the account to enable
- Appropriate permissions to enable accounts

## Configuration

### Authentication

This action supports four authentication methods. Configure one of the following:

#### Option 1: Bearer Token (SailPoint API Token)
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `BEARER_AUTH_TOKEN` | Secret | Yes | Bearer token for SailPoint IdentityNow API authentication |

#### Option 2: Basic Authentication
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `BASIC_USERNAME` | Secret | Yes | Username for SailPoint IdentityNow authentication |
| `BASIC_PASSWORD` | Secret | Yes | Password for SailPoint IdentityNow authentication |

#### Option 3: OAuth2 Client Credentials
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `OAUTH2_CLIENT_CREDENTIALS_CLIENT_SECRET` | Secret | Yes | OAuth2 client secret |
| `OAUTH2_CLIENT_CREDENTIALS_CLIENT_ID` | Environment | Yes | OAuth2 client ID |
| `OAUTH2_CLIENT_CREDENTIALS_TOKEN_URL` | Environment | Yes | OAuth2 token endpoint URL |
| `OAUTH2_CLIENT_CREDENTIALS_SCOPE` | Environment | No | OAuth2 scope |
| `OAUTH2_CLIENT_CREDENTIALS_AUDIENCE` | Environment | No | OAuth2 audience |
| `OAUTH2_CLIENT_CREDENTIALS_AUTH_STYLE` | Environment | No | OAuth2 auth style |

#### Option 4: OAuth2 Authorization Code
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `OAUTH2_AUTHORIZATION_CODE_ACCESS_TOKEN` | Secret | Yes | OAuth2 access token |

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `ADDRESS` | Yes | Default SailPoint IdentityNow API base URL | `https://example.api.identitynow.com` |

### Input Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `accountId` | string | Yes | The ID of the account to enable | `2c91808570bbdc7f0170c02c3a6301f5` |
| `address` | string | No | Override API base URL | `https://custom.api.identitynow.com` |
| `externalVerificationId` | string | No | External verification ID for the enable operation | `ticket-12345` |
| `forceProvisioning` | boolean | No | Force provisioning of the account enable operation | `true` |

### Output Parameters

| Name | Type | Description |
|------|------|-------------|
| `accountId` | string | The ID of the account that was enabled |
| `enabled` | boolean | Whether the account was successfully enabled |
| `taskId` | string | The ID of the provisioning task created |
| `message` | string | Additional information about the operation |
| `enabledAt` | datetime | When the account was enabled (ISO 8601) |
| `address` | string | The SailPoint IdentityNow API base URL used |

## Usage Examples

### Basic Enable
```json
{
  "accountId": "2c91808570bbdc7f0170c02c3a6301f5",
  "sailpointDomain": "example.api.identitynow.com"
}
```

### Enable with Verification
```json
{
  "accountId": "2c91808570bbdc7f0170c02c3a6301f5",
  "sailpointDomain": "example.api.identitynow.com",
  "externalVerificationId": "ticket-12345",
  "forceProvisioning": true
}
```

## Error Handling

The action includes error handling with automatic retry logic managed by the framework:

### HTTP Status Codes
- **202 Accepted**: Successful enable request (expected response)
- **400 Bad Request**: Invalid account ID or account state
- **401 Unauthorized**: Invalid authentication credentials
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Account not found
- **429 Rate Limit**: Too many requests
- **502/503/504 Service Errors**: Temporary service issues

### Automatic Retry Logic

The framework automatically handles retry logic for transient errors. The error handler simply re-throws errors, allowing the framework to determine retry behavior based on the error type and status code.

## Security Considerations

- **API Token Security**: Store API tokens securely in the secrets manager, never in code
- **Input Validation**: Account IDs are URL-encoded to prevent injection attacks
- **Audit Trail**: All enable operations are logged in SailPoint's audit system
- **Permissions**: Ensure the API token has only the necessary permissions

## Troubleshooting

### Common Issues

1. **Account Not Found**
   - Verify the account ID is correct
   - Check that the account exists in the specified tenant

2. **Permission Denied**
   - Verify API token has permission to enable accounts
   - Check source system permissions

3. **Already Enabled**
   - The account may already be in an enabled state
   - Check account status before attempting enable

4. **Provisioning Delays**
   - Enable operations are asynchronous
   - Check the returned task ID for status
   - Monitor SailPoint provisioning queue

### Debug Information

Enable debug logging by checking:
- SailPoint API response details in logs
- Task ID for tracking in SailPoint UI
- Tracking ID for support cases

## Development

### Running Tests
```bash
npm test
npm run test:coverage
```

### Building
```bash
npm run build
```

### Linting
```bash
npm run lint
npm run lint:fix
```

## API Reference

- [SailPoint IdentityNow API - Enable Account](https://developer.sailpoint.com/docs/api/v3/enable-account/)
- [Authentication](https://developer.sailpoint.com/docs/api/authentication/)

## Support

For issues or questions:
- Check SailPoint IdentityNow documentation
- Review the task status in SailPoint UI using the returned task ID
- Contact SailPoint support with the tracking ID from error messages