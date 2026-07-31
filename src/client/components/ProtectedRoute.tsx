import { apiClient } from '../services/apiClient.js';
import { storageService } from '../services/storageService.js';
import { useEffect, useState } from 'react'
import { useNavigate }          from 'react-router-dom'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'checking' | 'ok' | 'denied'>('checking')

  useEffect(() => {
    const token = storageService.getItem('session')

    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    // Verify token is still valid with the server
    apiClient.get('/api/auth/me')
      .then(() => setStatus('ok'))
      .catch((err) => {
        if (err.name === 'ApiError') {
          storageService.removeItem('session');
          navigate('/login', { replace: true });
        } else {
          setStatus('ok');
        }
      });
  }, [navigate])

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-primary-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-text-secondary">
          <span className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Loading…</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
