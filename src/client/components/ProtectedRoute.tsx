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
          storageService.clearUserSessionData();
          navigate('/login', { replace: true });
        } else {
          setStatus('ok');
        }
      });
  }, [navigate])

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-[#050506] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-zinc-400">
          <span className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-300 rounded-full animate-spin block" />
          <p className="text-xs font-mono tracking-wider text-zinc-500">Authenticating…</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
