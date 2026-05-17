import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/* ── Provider icons ─────────────────────────────────────── */
const GitHubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>
)

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

/* ── Error messages ─────────────────────────────────────── */
const ERROR_MESSAGES: Record<string, string> = {
  access_denied:  'You cancelled the sign-in. Please try again.',
  server_error:   'Something went wrong on our end. Please try again.',
  no_email:       'Your account has no verified email. Please use a different provider.',
  default:        'Sign-in failed. Please try again.',
}

export default function Login() {
  const [loading, setLoading] = useState<string | null>(null)   // 'github' | 'google' | 'login' | 'register' | null
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [appError, setAppError] = useState<string | null>(null)
  
  const [params]  = useSearchParams()
  const navigate  = useNavigate()
  const errorKey  = params.get('error')
  const errorMsg  = appError || (errorKey ? (ERROR_MESSAGES[errorKey] ?? ERROR_MESSAGES.default) : null)

  useEffect(() => {
    document.title = "Sign in to DevEngine";
  }, []);

  const handleOAuth = async (provider: string) => {
    setLoading(provider)
    try {
      const res = await fetch(`/api/auth/${provider}/url`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to get auth url')
      
      const authWindow = window.open(
        data.url,
        '_blank',
        'width=600,height=700'
      )
      
      if (!authWindow) {
        setAppError('Please allow popups for this site to connect your account.')
        setLoading(null)
      }
    } catch(e: any) {
      setAppError(e.message)
      setLoading(null)
    }
  }

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const token = event.data.token
        localStorage.setItem('session', token)
        navigate('/app')
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setAppError(decodeURIComponent(event.data.error || 'OAuth error'))
        setLoading(null)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const handleLogin = async () => {
    setLoading('login')
    setAppError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to login')
      
      localStorage.setItem('session', data.token)
      navigate('/app')
    } catch(e: any) {
      setAppError(e.message)
      setLoading(null)
    }
  }

  const handleRegister = async () => {
    setLoading('register')
    setAppError(null)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to register')
      
      localStorage.setItem('session', data.token)
      navigate('/app')
    } catch(e: any) {
      setAppError(e.message)
      setLoading(null)
    }
  }

  const handleGuest = async () => {
    setLoading('guest')
    setAppError(null)
    try {
      const res = await fetch('/api/auth/guest', {
        method: 'POST'
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create guest session')
      
      localStorage.setItem('session', data.token)
      navigate('/app')
    } catch(e: any) {
      setAppError(e.message)
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-primary-dark flex items-center justify-center px-4 relative">
      <button 
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm font-medium bg-slate-800/50 hover:bg-slate-700/50 px-4 py-2 rounded-xl backdrop-blur-sm"
      >
        <ArrowLeft size={16} />
        Back
      </button>
      <div className="w-full max-w-md">

        {/* ── Logo + heading ── */}
        <div className="text-center mb-10">
          <a href="/" className="inline-flex items-center gap-3 mb-6 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-xl bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-heading text-xl font-bold text-text-primary">GeminiDevChatbot</span>
          </a>
          <h1 className="font-heading text-3xl font-bold text-text-primary mb-2">Welcome</h1>
          <p className="text-text-secondary text-sm">
            Sign in or create your account — no password needed
          </p>
        </div>

        {/* ── Error banner ── */}
        {errorMsg && (
          <div className="mb-5 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {errorMsg}
          </div>
        )}

        {/* ── Card ── */}
        <div className="bg-slate-800/60 border border-gray-700/80 rounded-2xl p-8 backdrop-blur-sm">

          {/* OAuth buttons */}
          <div className="flex flex-col gap-3 mb-6">
            <button
              onClick={() => handleOAuth('github')}
              disabled={!!loading}
              className="flex items-center justify-center gap-3 w-full py-3 px-4
                         bg-gray-900 border border-gray-600 hover:border-gray-400
                         rounded-xl text-text-primary text-sm font-medium
                         transition-all duration-200 hover:bg-gray-800
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'github'
                ? <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                : <GitHubIcon />
              }
              {loading === 'github' ? 'Redirecting to GitHub…' : 'Continue with GitHub'}
            </button>

            <button
              onClick={() => handleOAuth('google')}
              disabled={!!loading}
              className="flex items-center justify-center gap-3 w-full py-3 px-4
                         bg-gray-900 border border-gray-600 hover:border-gray-400
                         rounded-xl text-text-primary text-sm font-medium
                         transition-all duration-200 hover:bg-gray-800
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'google'
                ? <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                : <GoogleIcon />
              }
              {loading === 'google' ? 'Redirecting to Google…' : 'Continue with Google'}
            </button>
            
            <button
              onClick={handleGuest}
              disabled={!!loading}
              className="flex items-center justify-center gap-3 w-full py-3 px-4
                         bg-accent-blue/10 border border-accent-blue/30 hover:border-accent-blue/60 hover:bg-accent-blue/20
                         rounded-xl text-accent-blue text-sm font-bold
                         transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading === 'guest'
                ? <span className="w-4 h-4 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
                : null
              }
              {loading === 'guest' ? 'Initializing guest session...' : 'Try DevEngine Anonymously'}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-700" />
            <span className="text-xs text-text-secondary">or</span>
            <div className="flex-1 h-px bg-gray-700" />
          </div>

          {/* Email Login/Registration */}
          <div className="flex flex-col gap-3 mb-6">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={!!loading}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-700
                           text-text-primary placeholder-gray-500 text-sm focus:border-accent-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={!!loading}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-700
                           text-text-primary placeholder-gray-500 text-sm focus:border-accent-blue focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleLogin}
                disabled={!!loading || !email || !password}
                className="flex-1 py-2.5 rounded-xl border border-gray-600 bg-gray-800 hover:bg-gray-700 text-text-primary
                           text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading === 'login' ? 'Signing in...' : 'Sign in'}
              </button>
              <button
                onClick={handleRegister}
                disabled={!!loading || !email || !password}
                className="flex-1 py-2.5 rounded-xl border border-accent-blue/50 bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue
                           text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading === 'register' ? 'Registering...' : 'Register'}
              </button>
            </div>
          </div>

          {/* New user note */}
          <div className="bg-accent-blue/5 border border-accent-blue/15 rounded-xl px-4 py-3 mb-5">
            <p className="text-xs text-text-secondary text-center leading-relaxed">
              <span className="text-accent-blue font-medium">New here?</span>{' '}
              Your account is created automatically on your first sign-in.
              No separate registration needed.
            </p>
          </div>

          {/* Terms */}
          <p className="text-center text-xs text-text-secondary">
            By continuing you agree to our{' '}
            <a href="/terms"   className="text-accent-blue hover:underline">Terms</a>
            {' '}and{' '}
            <a href="/privacy" className="text-accent-blue hover:underline">Privacy Policy</a>
          </p>
        </div>

        {/* DB transparency note */}
        <div className="mt-4 px-4 py-3 rounded-xl bg-gray-800/30 border border-gray-700/40
                        flex flex-wrap gap-x-6 gap-y-1 justify-center text-xs text-text-secondary">
          <span>🔐 Tokens → <code className="text-accent-blue">accounts</code> table</span>
          <span>👤 Profile → <code className="text-accent-blue">users</code> table</span>
          <span>🔑 Session via signed JWT</span>
        </div>
      </div>
    </div>
  )
}
