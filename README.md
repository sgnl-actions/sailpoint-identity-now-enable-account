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

### Secrets

| Name | Description | Required |
|------|-------------|----------|
| `BEARER_AUTH_TOKEN` | Bearer token for SailPoint IdentityNow API authentication | Yes |

### Environment Variables

| Name | Description | Default |
|------|-------------|---------|
| `RATE_LIMIT_BACKOFF_MS` | Milliseconds to wait when rate limited | 30000 |
| `SERVICE_ERROR_BACKOFF_MS` | Milliseconds to wait on service errors | 10000 |

### Input Parameters

| Name | Type | Description | Required |
|------|------|-------------|----------|
| `accountId` | string | The ID of the account to enable | Yes |
| `sailpointDomain` | string | SailPoint IdentityNow tenant domain (e.g., `example.api.identitynow.com`) | Yes |
| `externalVerificationId` | string | External verification ID for the enable operation | No |
| `forceProvisioning` | boolean | Force provisioning of the account enable operation | No |

### Output Parameters

| Name | Type | Description |
|------|------|-------------|
| `accountId` | string | The ID of the account that was enabled |
| `enabled` | boolean | Whether the account was successfully enabled |
| `taskId` | string | The ID of the provisioning task created |
| `message` | string | Additional information about the operation |
| `enabledAt` | datetime | When the account was enabled (ISO 8601) |

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

The action includes automatic retry logic for common transient errors:

### Retryable Errors
- **429 Rate Limit**: Waits 30 seconds (configurable) before retrying
- **502 Bad Gateway**: Waits 10 seconds before retrying  
- **503 Service Unavailable**: Waits 10 seconds before retrying
- **504 Gateway Timeout**: Waits 10 seconds before retrying

### Fatal Errors
- **400 Bad Request**: Invalid parameters or account state
- **401 Unauthorized**: Invalid or expired credentials
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Account ID does not exist

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