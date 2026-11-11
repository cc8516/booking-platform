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
| `VITE_MOCK_API_URL` | `https://2dhm3rl6ag.execute-api.us-east-2.amazonaws.com/Test/admin` — API Gateway stage Test, resource `/{admin+}` (greedy proxy), called directly from the browser |
| `VITE_HOTELS_API_URL` | `https://hgipqkz4z3.execute-api.us-east-2.amazonaws.com/Test` — hotels list endpoint, `GET ?token=<idToken>` |
| `VITE_HOTEL_IMAGES_BASE_URL` | Optional public S3/CDN base URL; image URL = base + `/` + hotel `fileName`. Empty = no images shown |
| `VITE_API_AUTH_TOKEN` | `id` or `access` — which Cognito token goes in the API `Authorization` header |
| `VITE_API_AUTH_SCHEME` | `Bearer` (default) or `none` for the raw token (REST API Cognito authorizers) |
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
  hotels/                  HotelsProvider (loads hotels from the API for the signed-in user), useHotels, context
  pages/                   HomePage, HotelsPage, AddHotelPage (admin only), BookingsPage (protected), AuthCallbackPage
  components/Header.tsx    Nav + sign in/out
  types/hotel.ts           Hotel / NewHotel types (optional `imageUrl`)
  api/hotelsApi.ts         fetchHotels(): GET hotels list with `?token=<idToken>`; maps backend fields (Name, City, Country, Description, Rating, Price, FileName) to `Hotel`, uses the API's presigned `ImageUrl` (fallback: `VITE_HOTEL_IMAGES_BASE_URL` + `fileName`)
  api/mockApi.ts           createHotel(): POSTs the new hotel as multipart/form-data with an `Authorization` header (see env) to the API Gateway mock (stage Test) when "Save hotel" is clicked. Fields: hotelName, hotelRating, hotelCity, hotelCountry, hotelPrice, hotelDescription, photo (optional), userId (Cognito `sub`), idToken
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

Roles come from the id token's `cognito:groups` claim (parsed into `AuthUser.groups`). `useAuth()` exposes `isAdmin` and `isHotelManager`. Admins see "+ Add hotel" on `/hotels` and can open `/hotels/new`. Hotel Manager has no features yet beyond a header badge. These checks are UI-only — the .NET API must enforce groups too. Group changes only take effect after the user signs in again (new token). The hotels list is fetched from the API when signed in (empty otherwise); a hotel added in the UI is appended locally (with its photo as a data URL) until the next load.

## Conventions

- Function components, named exports for components/hooks (default export only for `App`).
- Keep context objects, providers and hooks in separate files (keeps fast refresh working).
- No `any`; narrow `unknown` explicitly. Strict TypeScript is on.
- Run `npm run build` and `npm run lint` after changes.
- Mock data is temporary; API calls to the .NET backend should go in a dedicated `src/api/` layer when added.

## Known limitations / next steps

- Implicit Grant is deprecated for SPAs; consider Authorization Code + PKCE (change is confined to `cognito.ts` and `AuthCallbackPage.tsx`).
- Tokens are decoded but not signature-verified client-side; the backend must validate them.
- Booking flow and API client not yet implemented; the list is read from the API but the backend only returns the signed-in user's hotels (it scans by `UserId`).
- `ListHotels` returns a presigned S3 GET `ImageUrl` per hotel (valid 1 h; the Lambda needs `bucketName` env var and S3 read permission). Images in the list expire after an hour until it is reloaded. The list endpoint (REST API `ListAdminHotels`, Lambda proxy, no authorizer, `token` query param) is a simple GET with no custom headers, so no preflight; the Lambda's `Access-Control-Allow-Origin: http://localhost:8080` is enough. It does not verify the JWT signature, so anyone can read any user's hotels by forging a token.
- The API Gateway mock has no CORS headers (OPTIONS returns 403), so until CORS is enabled on the API Gateway resource (allow origin `http://localhost:8080`, methods POST/OPTIONS, allow header `Authorization`, deploy to stage Test; the Authorization header forces a preflight OPTIONS request) the browser delivers the multipart POST but blocks the response, the form shows a CORS error and the hotel is NOT added to the local list (save requires the API call to succeed). The mock accepts unauthenticated POST on `/Test` and returns 200 with an empty body.
- Hotel Manager role has no permissions defined yet.
