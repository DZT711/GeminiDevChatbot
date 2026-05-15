import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  useEffect(() => {
    const token = params.get('token')
    const error = params.get('error')

    if (error || !token) {
      navigate('/login?error=' + (error || 'unknown'), { replace: true })
      return
    }

    // Store JWT in localStorage so ProtectedRoute can read it
    localStorage.setItem('session', token)

    // Redirect into the app
    navigate('/app', { replace: true })
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-primary-dark flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-text-secondary">
        <span className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Signing you in…</p>
      </div>
    </div>
  )
}
