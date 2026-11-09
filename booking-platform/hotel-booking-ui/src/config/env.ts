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

/** Cognito group names that grant each role (case-sensitive, as shown in the console). */
export const groupConfig = {
  admin: required('VITE_COGNITO_ADMIN_GROUP'),
  hotelManager: required('VITE_COGNITO_HOTEL_MANAGER_GROUP'),
} as const;
