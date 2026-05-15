import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing      from './pages/Landing'
import Login        from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import DevEngine    from './pages/DevEngine'
import ProtectedRoute from './components/ProtectedRoute'
export default function App() {
  return (
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
  )
}
