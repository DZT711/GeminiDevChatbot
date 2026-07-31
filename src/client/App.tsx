import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing      from './pages/Landing'
import Login        from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import DevEngine    from './pages/DevEngine'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthProvider'
import { SettingsProvider } from './contexts/SettingsProvider'
import { ChatProvider } from './contexts/ChatProvider'

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ChatProvider>
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/"              element={<Landing />} />
              <Route path="/login"         element={<Login />} />
              <Route path="/auth/callback" element={<AuthCallback />} />

              {/* Protected — requires valid session */}
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <DevEngine />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ChatProvider>
      </SettingsProvider>
    </AuthProvider>
  )
}
