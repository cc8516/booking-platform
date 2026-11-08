import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { cognitoConfig } from './config/env';
import { AuthProvider } from './auth/AuthProvider';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Header } from './components/Header';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { BookingsPage } from './pages/BookingsPage';
import { HomePage } from './pages/HomePage';
import { HotelsPage } from './pages/HotelsPage';

// Callback route is derived from the redirect URI registered in Cognito.
const callbackPath = new URL(cognitoConfig.redirectUri).pathname;

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Header />
        <main className="container">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/hotels" element={<HotelsPage />} />
            <Route path={callbackPath} element={<AuthCallbackPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/bookings" element={<BookingsPage />} />
            </Route>
          </Routes>
        </main>
      </AuthProvider>
    </BrowserRouter>
  );
}
