# CLAUDE.md

Hotel booking front end (React + TypeScript + Vite). Auth is Amazon Cognito Hosted UI (Implicit Grant). A .NET backend will be integrated later.

> **Maintenance rule:** whenever code, config, structure, commands or conventions change, update this file in the same change. Keep it accurate and concise.

## Commands

- `npm run dev` — dev server on http://localhost:8080 (port is pinned with `strictPort`; must match the Cognito callback URL)
- `npm run build` — type-check (`tsc -b`) and production build
- `npm run lint` — oxlint
- `npm run preview` — serve the production build

## Stack

React 19, TypeScript, Vite, `react-router-dom` v7. No auth library — the Cognito flow is hand-written in `src/auth/cognito.ts`.

## Configuration

Env vars live in `.env` (template: `.env.example`), typed in `src/vite-env.d.ts` and read through `src/config/env.ts` (throws if one is missing). Never read `import.meta.env` directly elsewhere.

| Variable | Purpose |
| --- | --- |
| `VITE_COGNITO_DOMAIN` | Hosted UI domain |
| `VITE_COGNITO_CLIENT_ID` | App client ID (public client, no secret) |
| `VITE_COGNITO_REDIRECT_URI` | `http://localhost:8080/hotel` — must be in the app client's allowed callback URLs |
| `VITE_COGNITO_LOGOUT_URI` | `http://localhost:8080/` — must be in allowed sign-out URLs |
| `VITE_COGNITO_SCOPES` | `openid email profile` |
| `VITE_COGNITO_ADMIN_GROUP` | Cognito group name that grants Admin (default `Admin`) |
| `VITE_COGNITO_HOTEL_MANAGER_GROUP` | Cognito group name for Hotel Manager (default `Hotel Manager`) |

Cognito: user pool `us-east-2_i36FtHXmG`, region `us-east-2`. JWKS for backend token validation: `https://cognito-idp.us-east-2.amazonaws.com/us-east-2_i36FtHXmG/.well-known/jwks.json`.

## Structure

```
src/
  config/env.ts            Typed env access
  auth/
    cognito.ts             Login/logout URLs, callback parsing, state/nonce checks, JWT decode, sessionStorage
    authContext.ts         Context object + value type
    AuthProvider.tsx       Session state, signIn/signOut, auto-expiry
    useAuth.ts             Hook for consuming the context
    ProtectedRoute.tsx     Redirects unauthenticated users to Hosted UI
    types.ts               AuthTokens, AuthUser, AuthSession
    roles.ts               isAdmin / isHotelManager from `cognito:groups` (id token claim)
    RoleRoute.tsx          UI guard by role; nest inside ProtectedRoute
  hotels/                  HotelsProvider (localStorage-backed, temporary), useHotels, context
  pages/                   HomePage, HotelsPage, AddHotelPage (admin only), BookingsPage (protected), AuthCallbackPage
  components/Header.tsx    Nav + sign in/out
  data/hotels.ts           Seed hotel data (replace with .NET API)
  types/hotel.ts           Hotel / NewHotel types (optional `imageUrl`)
  utils/image.ts           Validates (JPEG/PNG/WebP, ≤5 MB) and downsizes photos to ≤1024px JPEG data URLs
```

## Auth flow

1. `signIn(returnTo)` stores `state`, `nonce` and `returnTo` in sessionStorage and redirects to `{domain}/login?response_type=token…`.
2. Cognito redirects to the redirect URI with tokens in the URL fragment. The route path is derived from `VITE_COGNITO_REDIRECT_URI` in `App.tsx` and rendered by `AuthCallbackPage`.
3. `handleCallbackHash` validates `state`, `nonce` and `aud`, saves the session, and the page navigates to `returnTo` (clearing the fragment).
4. Session is kept in `sessionStorage` (key `auth_session`) and dropped at expiry. No refresh token with Implicit Grant.
5. For the backend, send `session.tokens.accessToken` as `Authorization: Bearer …`.

Routes: `/` home, `/hotels` list, `/hotels/new` (Admin group only), `/bookings` (signed in), callback path from env (`/hotel`).

## Roles

Roles come from the id token's `cognito:groups` claim (parsed into `AuthUser.groups`). `useAuth()` exposes `isAdmin` and `isHotelManager`. Admins see "+ Add hotel" on `/hotels` and can open `/hotels/new`. Hotel Manager has no features yet beyond a header badge. These checks are UI-only — the .NET API must enforce groups too. Group changes only take effect after the user signs in again (new token). Hotels added in the UI (including their photo, stored as a downsized data URL) are kept in `localStorage` until the API exists.

## Conventions

- Function components, named exports for components/hooks (default export only for `App`).
- Keep context objects, providers and hooks in separate files (keeps fast refresh working).
- No `any`; narrow `unknown` explicitly. Strict TypeScript is on.
- Run `npm run build` and `npm run lint` after changes.
- Mock data is temporary; API calls to the .NET backend should go in a dedicated `src/api/` layer when added.

## Known limitations / next steps

- Implicit Grant is deprecated for SPAs; consider Authorization Code + PKCE (change is confined to `cognito.ts` and `AuthCallbackPage.tsx`).
- Tokens are decoded but not signature-verified client-side; the backend must validate them.
- Booking flow and API client not yet implemented; hotel add is local-only (`HotelsProvider.addHotel` → replace with POST to the API).
- Photos live in `localStorage` (~5 MB total quota); a full quota silently stops persisting. Move to S3 (presigned upload URL from the API) with the backend.
- Hotel Manager role has no permissions defined yet.
