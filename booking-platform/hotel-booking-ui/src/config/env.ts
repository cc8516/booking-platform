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
