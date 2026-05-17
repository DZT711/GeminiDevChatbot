import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

/* ── Interfaces ── */
interface UserContext {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  customInstructions?: string | null;
  isGuest?: boolean;
}

/* ── Icons ─────────────────────────────────────────────── */
const IconCode = () => (
  <svg className="w-8 h-8 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
)
const IconLang = () => (
  <svg className="w-8 h-8 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
  </svg>
)
const IconBrain = () => (
  <svg className="w-8 h-8 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
)
const IconGitHub = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>
)

/* ── Animated code snippet ──────────────────────────────── */
function CodeSnippet({ code }: { code: string }) {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    setDisplayed('')
    let i = 0
    const id = setInterval(() => {
      setDisplayed(code.slice(0, ++i))
      if (i >= code.length) clearInterval(id)
    }, 18)
    return () => clearInterval(id)
  }, [code])
  return (
    <pre className="bg-gray-900 rounded-xl p-5 text-sm text-text-primary font-mono leading-relaxed overflow-x-auto">
      <code>{displayed}</code>
    </pre>
  )
}

/* ── Main component ─────────────────────────────────────── */
export default function Landing() {
  const navigate = useNavigate()
  const [user, setUser] = useState<UserContext | null>(null);

  useEffect(() => {
    document.title = "DevEngine | AI Coding Assistant";
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('session');
        if (!token) return;
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (e) {
        console.error("Failed to fetch user context", e);
      }
    };
    fetchUser();
  }, []);

  const features = [
    { icon: <IconCode />,  title: 'AI Code Assistance',         desc: 'Instant code suggestions, bug fixes, and line-by-line explanations.' },
    { icon: <IconLang />,  title: 'Natural Language',            desc: 'Describe what you need in plain English — no jargon required.' },
    { icon: <IconBrain />, title: 'Context-Aware Responses',    desc: "Understands your project context to give relevant, accurate advice." },
  ]

  const steps = [
    { n: '1', title: 'Sign in',   desc: 'One click with GitHub or Google. No password needed.' },
    { n: '2', title: 'Ask',       desc: 'Type your coding question or paste your code.' },
    { n: '3', title: 'Get help',  desc: 'Receive working code, explanations, and fixes instantly.' },
  ]

  const techStack = [
    { name: 'Gemini API', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Google_Gemini_Logo.svg/200px-Google_Gemini_Logo.svg.png' },
    { name: 'Python',     logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Python-logo-notext.svg/120px-Python-logo-notext.svg.png' },
    { name: 'React',      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/120px-React-icon.svg.png' },
    { name: 'Vite',       logo: 'https://vitejs.dev/logo.svg' },
  ]

  const installCode = `npm install geminidevchatbot\n# or\npip install geminidevchatbot`
  const usageCode   = `import GeminiDevChatbot\n\nchatbot = GeminiDevChatbot()\nresponse = chatbot.ask(\n    "How to implement a binary search?"\n)\nprint(response)`

  return (
    <div className="min-h-screen bg-primary-dark text-text-primary">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-primary-dark/90 backdrop-blur-md border-b border-gray-800 px-8 h-14 flex items-center justify-between">
        <span className="font-heading text-lg font-bold text-accent-blue tracking-tight">GeminiDevChatbot</span>
        <div className="flex items-center gap-6">
          {[
            ['Features',    '#features'],
            ['How it Works','#how-it-works'],
            ['Tech Stack',  '#tech-stack'],
            ['Docs',        '#get-started'],
          ].map(([label, href]) => (
            <a key={label} href={href} className="text-text-secondary hover:text-text-primary text-sm transition-colors">
              {label}
            </a>
          ))}
          {user ? (
            <div className="flex items-center gap-4 hidden sm:flex">
              <span className="text-sm font-semibold text-text-primary px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800/50">
                Hi, {user.name || user.email.split('@')[0]}
              </span>
              <button
                onClick={() => navigate('/app')}
                className="bg-accent-blue text-white text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-blue-500 transition-colors"
              >
                Dashboard
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('session');
                  setUser(null);
                }}
                className="text-red-400 border border-red-500/30 text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="bg-accent-blue text-white text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-blue-500 transition-colors"
            >
              Sign in
            </button>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="min-h-[92vh] flex flex-col items-center justify-center text-center px-8 py-24 bg-gradient-to-b from-primary-dark via-slate-900 to-primary-dark">
        <div className="inline-flex items-center gap-2 bg-accent-blue/10 border border-accent-blue/25 text-accent-blue text-xs font-semibold px-4 py-1.5 rounded-full mb-8">
          🤖 Powered by Google Gemini
        </div>
        <h1 className="font-heading text-5xl md:text-6xl font-bold leading-[1.1] mb-6 max-w-3xl tracking-tight">
          Your AI Pair Programmer:{' '}
          <span className="text-accent-blue">Code Smarter, Faster.</span>
        </h1>
        <p className="text-text-secondary text-xl max-w-xl leading-relaxed mb-10">
          GeminiDevChatbot leverages advanced AI to help developers write better code, fix bugs, and understand complex concepts — instantly.
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          <button
            onClick={() => navigate(user ? '/app' : '/login')}
            className="bg-accent-blue text-white font-bold px-8 py-3.5 rounded-xl text-base hover:bg-blue-500 transition-all shadow-lg shadow-accent-blue/20"
          >
            {user ? "Go to Dashboard →" : "Get Started — it's free →"}
          </button>
          <a
            href="https://github.com/DZT711/GeminiDevChatbot"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 border border-gray-700 hover:border-gray-500 text-text-primary font-semibold px-8 py-3.5 rounded-xl text-base transition-all"
          >
            <IconGitHub /> View on GitHub
          </a>
        </div>
        <p className="mt-6 text-xs text-text-secondary">
          Sign in or register automatically with GitHub or Google — no password needed.
        </p>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-8 bg-slate-900">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="font-heading text-4xl mb-3">Unlock Your Development Potential</h2>
          <p className="text-text-secondary mb-14 text-lg">Everything you need to code faster and smarter</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="group bg-primary-dark border border-gray-800 hover:border-accent-blue/50 rounded-2xl p-8 text-left transition-all duration-300 hover:shadow-lg hover:shadow-accent-blue/5"
              >
                <div className="mb-5 w-14 h-14 rounded-xl bg-accent-blue/10 flex items-center justify-center group-hover:bg-accent-blue/20 transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-heading text-lg mb-3">{f.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it Works ── */}
      <section id="how-it-works" className="py-24 px-8 bg-primary-dark">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-4xl mb-3">Effortless Integration</h2>
          <p className="text-text-secondary mb-16 text-lg">Three simple steps to smarter development</p>
          <div className="flex flex-wrap justify-center items-center gap-0">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center">
                <div className="text-center w-52">
                  <div className="w-16 h-16 rounded-2xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-2xl font-heading font-bold text-accent-blue mx-auto mb-5">
                    {s.n}
                  </div>
                  <h3 className="font-heading text-lg mb-2">{s.title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed max-w-40 mx-auto">{s.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="w-16 h-px bg-gradient-to-r from-accent-blue/40 to-accent-blue/10 mx-2 flex-shrink-0 hidden md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech Stack ── */}
      <section id="tech-stack" className="py-24 px-8 bg-slate-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-heading text-4xl mb-3">Built with Best-in-Class Tech</h2>
          <p className="text-text-secondary mb-16 text-lg">Powered by industry-leading technologies</p>
          <div className="flex flex-wrap justify-center gap-12">
            {techStack.map((t, i) => (
              <div key={i} className="text-center group">
                <div className="w-20 h-20 rounded-2xl bg-primary-dark border border-gray-800 group-hover:border-gray-600 flex items-center justify-center mb-3 mx-auto transition-all">
                  <img src={t.logo} alt={t.name} className="h-10 w-10 object-contain grayscale group-hover:grayscale-0 transition-all" />
                </div>
                <p className="text-text-secondary text-sm font-medium">{t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Get Started / Docs ── */}
      <section id="get-started" className="py-24 px-8 bg-primary-dark">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-heading text-4xl mb-3">Get Up and Running in Minutes</h2>
            <p className="text-text-secondary text-lg">Simple setup, powerful results</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
              <h3 className="font-heading text-xl mb-5 text-text-primary">Installation</h3>
              <CodeSnippet code={installCode} />
            </div>
            <div>
              <h3 className="font-heading text-xl mb-5 text-text-primary">Basic Usage</h3>
              <CodeSnippet code={usageCode} />
              <p className="text-text-secondary text-xs mt-4">
                Full documentation on{' '}
                <a
                  href="https://github.com/DZT711/GeminiDevChatbot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-blue hover:underline"
                >
                  GitHub →
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-20 px-8 bg-gradient-to-r from-accent-blue/10 via-slate-900 to-accent-blue/10 border-y border-accent-blue/10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-heading text-3xl mb-4">{user ? "Welcome back to DevEngine" : "Ready to code smarter?"}</h2>
          <p className="text-text-secondary mb-8">Join developers already using GeminiDevChatbot to build faster.</p>
          <button
            onClick={() => navigate(user ? '/app' : '/login')}
            className="bg-accent-blue text-white font-bold px-10 py-4 rounded-xl text-lg hover:bg-blue-500 transition-all shadow-lg shadow-accent-blue/20"
          >
            {user ? "Open Dashboard →" : "Start for free →"}
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-primary-dark border-t border-gray-800 py-10 px-8">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-between items-center gap-6">
          <span className="font-heading font-bold text-accent-blue">GeminiDevChatbot</span>
          <div className="flex gap-8">
            {[
              ['GitHub',   'https://github.com/DZT711/GeminiDevChatbot'],
              ['Twitter',  '#'],
              ['LinkedIn', '#'],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                target={href.startsWith('http') ? '_blank' : '_self'}
                rel="noopener noreferrer"
                className="text-text-secondary hover:text-text-primary text-sm transition-colors"
              >
                {label}
              </a>
            ))}
          </div>
          <p className="text-text-secondary text-xs">© {new Date().getFullYear()} GeminiDevChatbot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
