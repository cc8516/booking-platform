/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COGNITO_DOMAIN: string;
  readonly VITE_COGNITO_CLIENT_ID: string;
  readonly VITE_COGNITO_REDIRECT_URI: string;
  readonly VITE_COGNITO_LOGOUT_URI: string;
  readonly VITE_COGNITO_SCOPES: string;
  readonly VITE_COGNITO_ADMIN_GROUP: string;
  readonly VITE_COGNITO_HOTEL_MANAGER_GROUP: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
