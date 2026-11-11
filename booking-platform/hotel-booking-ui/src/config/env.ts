function required(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const cognitoConfig = {
  domain: required('VITE_COGNITO_DOMAIN').replace(/\/$/, ''),
  clientId: required('VITE_COGNITO_CLIENT_ID'),
  redirectUri: required('VITE_COGNITO_REDIRECT_URI'),
  logoutUri: required('VITE_COGNITO_LOGOUT_URI'),
  scopes: required('VITE_COGNITO_SCOPES'),
} as const;

/** API Gateway mock (stage Test), called directly from the browser (needs CORS enabled on the API). */
export const mockApiUrl = required('VITE_MOCK_API_URL');

/** Hotels list API (GET ?token=<idToken>) and optional public base URL for hotel images in S3. */
export const hotelsApiUrl = required('VITE_HOTELS_API_URL');
export const hotelImagesBaseUrl = (import.meta.env.VITE_HOTEL_IMAGES_BASE_URL ?? '').replace(/\/$/, '');

/**
 * Authorization header settings for API calls.
 * token: which Cognito token to send ("id" or "access").
 * scheme: prefix such as "Bearer"; use "none" to send the raw token (what a REST API
 * Cognito user pool authorizer expects by default).
 */
const authToken = required('VITE_API_AUTH_TOKEN');
if (authToken !== 'id' && authToken !== 'access') {
  throw new Error('VITE_API_AUTH_TOKEN must be "id" or "access"');
}
export const apiAuthConfig = {
  token: authToken,
  scheme: required('VITE_API_AUTH_SCHEME'),
} as const;

/** Cognito group names that grant each role (case-sensitive, as shown in the console). */
export const groupConfig = {
  admin: required('VITE_COGNITO_ADMIN_GROUP'),
  hotelManager: required('VITE_COGNITO_HOTEL_MANAGER_GROUP'),
} as const;
