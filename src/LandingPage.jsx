import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Leaf, LockKeyhole, MapPin, Moon, Recycle, Sun, UserPlus } from 'lucide-react'
import { useAuth } from './AuthContext'
import { useTheme } from './ThemeContext'
import mzuzuCityImage from './images/Screenshot 2026-10-21 100433.png'
import './LandingPage.css'

export default function LandingPage() {
  const [mode, setMode] = useState('email')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const { user, signIn, signUp, requestPasswordReset } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/citizen'} replace />

  function handleContinue(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setMode('signin')
  }

  async function handleSignIn(event) {
    event.preventDefault()
    const result = await signIn({ email, password })
    if (result.error || !result.user) {
      setError(result.error || 'Sign in failed. Could not retrieve user profile.')
      return
    }
    navigate(result.user.role === 'admin' ? '/admin' : '/citizen')
  }

  async function handleSignUp(event) {
    event.preventDefault()
    const result = await signUp({ name, email, password })
    if (result.error || !result.user) {
      setError(result.error || 'Sign up failed. Could not retrieve user profile.')
      return
    }
    navigate('/citizen')
  }

  function handleForgotPassword(event) {
    event.preventDefault()
    const result = requestPasswordReset(email)
    setError('')
    setNotice(result.message)
  }

  function openMode(nextMode) {
    setMode(nextMode)
    setError('')
    setNotice('')
  }

  return (
    <div className="landing-page">
      <header className="landing-header">
        <a className="landing-brand" href="/" aria-label="Mzuzu SmartClean home">
          <span className="landing-brand-icon"><Leaf size={23} /></span>
          <span><strong>Mzuzu SmartClean</strong><small>Cleaner communities, healthier lives</small></span>
        </a>
        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#about">About the city</a>
          <a href="#how-it-works">How it works</a>
          <button type="button" className="landing-theme-toggle" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {theme === 'dark' ? <><Sun size={15} /> Light mode</> : <><Moon size={15} /> Dark mode</>}
          </button>
        </nav>
      </header>

      <main>
        <section className="landing-hero" style={{ '--landing-background': `url("${mzuzuCityImage}")` }}>
          <div className="landing-hero-copy">
            <span className="landing-eyebrow"><MapPin size={14} /> MZUZU CITY · NORTHERN MALAWI</span>
            <h1>A cleaner Mzuzu starts <em>with all of us.</em></h1>
            <p>Connect residents and city teams to report waste, follow local concerns, and support a healthier urban environment.</p>
            <div className="landing-hero-points">
              <span><CheckCircle2 size={17} /> Report waste in your community</span>
              <span><CheckCircle2 size={17} /> Help teams plan a response</span>
            </div>
            <a className="landing-learn-link" href="#about">Discover the SmartClean project <ArrowRight size={17} /></a>
          </div>

          <section className="signin-card" aria-labelledby="signin-title">
            <div className="signin-card-heading">
              <span className="signin-icon">{mode === 'signup' ? <UserPlus size={20} /> : <LockKeyhole size={20} />}</span>
              <div>
                <p className="landing-eyebrow">WELCOME TO SMARTCLEAN</p>
                <h2 id="signin-title">{mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : mode === 'signin' ? 'Enter your password' : 'Sign in to continue'}</h2>
              </div>
            </div>

            {mode === 'email' && (
              <form className="signin-form" onSubmit={handleContinue}>
                <p className="signin-intro">Enter your email to continue. Your account role determines which workspace opens.</p>
                <label htmlFor="signin-email">Email address</label>
                <input id="signin-email" type="email" autoComplete="username" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
                {error && <p className="signin-error" role="alert">{error}</p>}
                <button className="signin-submit" type="submit">Continue with email <ArrowRight size={17} /></button>
                <p className="signin-switch">New to SmartClean? <button type="button" onClick={() => openMode('signup')}>Sign up</button></p>
              </form>
            )}

            {mode === 'signin' && (
              <form className="signin-form" onSubmit={handleSignIn}>
                <p className="signin-intro">Signing in as <strong>{email}</strong></p>
                <label htmlFor="signin-password">Password</label>
                <input id="signin-password" type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                {error && <p className="signin-error" role="alert">{error}</p>}
                <button className="signin-submit" type="submit">Sign in <ArrowRight size={17} /></button>
                <div className="signin-links"><button type="button" onClick={() => openMode('forgot')}>Forgot password?</button><button type="button" onClick={() => openMode('email')}><ArrowLeft size={14} /> Change email</button></div>
              </form>
            )}

            {mode === 'signup' && (
              <form className="signin-form" onSubmit={handleSignUp}>
                <p className="signin-intro">Create a citizen account to report waste and support cleaner communities. The API must be running.</p>
                <label htmlFor="signup-name">Full name</label>
                <input id="signup-name" type="text" autoComplete="name" placeholder="Your name" value={name} onChange={(event) => setName(event.target.value)} required />
                <label htmlFor="signup-email">Email address</label>
                <input id="signup-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
                <label htmlFor="signup-password">Create a password</label>
                <input id="signup-password" type="password" autoComplete="new-password" placeholder="Choose a password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
                {error && <p className="signin-error" role="alert">{error}</p>}
                <button className="signin-submit" type="submit">Create account <ArrowRight size={17} /></button>
                <p className="signin-switch">Already have an account? <button type="button" onClick={() => openMode('email')}>Continue with email</button></p>
              </form>
            )}

            {mode === 'forgot' && (
              <form className="signin-form" onSubmit={handleForgotPassword}>
                <p className="signin-intro">Enter the email address for your account and we will help you recover access.</p>
                <label htmlFor="reset-email">Email address</label>
                <input id="reset-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
                {notice && <p className="signin-notice" role="status">{notice}</p>}
                <button className="signin-submit" type="submit">Request password help <ArrowRight size={17} /></button>
                <p className="signin-switch"><button type="button" onClick={() => openMode('signin')}>Back to sign in</button></p>
              </form>
            )}

            <p className="signin-demo-note">Sign-in is securely checked by the SmartClean service. Staff accounts are provisioned by an administrator.</p>
          </section>
        </section>

        <section className="landing-stats" aria-label="About Mzuzu">
          <div><strong>Malawi’s</strong><span>northern region hub</span></div>
          <div><strong>One city</strong><span>many communities</span></div>
          <div><strong>Shared care</strong><span>for cleaner public spaces</span></div>
        </section>

        <section className="landing-about" id="about">
          <div className="landing-section-copy">
            <span className="landing-eyebrow">ABOUT MZUZU</span>
            <h2>A growing city with a shared responsibility.</h2>
            <p>Mzuzu is Malawi’s northern regional centre and a busy home for residents, businesses, students, and visitors. As neighbourhoods and public spaces grow, keeping waste visible and well managed takes cooperation.</p>
            <p>SmartClean gives communities and city teams a simple way to share reports and build a clearer picture of where attention may be needed.</p>
          </div>
          <div className="about-feature-card">
            <span className="about-feature-icon"><Building2 size={23} /></span>
            <h3>Local knowledge matters</h3>
            <p>Residents know their streets and landmarks. Their reports can help make waste concerns easier to locate and review.</p>
            <span className="about-feature-icon second"><Recycle size={23} /></span>
            <h3>Better information, better planning</h3>
            <p>Organised reports can support practical decisions about monitoring and collection.</p>
          </div>
        </section>

        <section className="landing-how" id="how-it-works">
          <span className="landing-eyebrow">A SIMPLE PROCESS</span><h2>Work together for a cleaner city.</h2>
          <div className="how-cards">
            <article><span>01</span><h3>Sign in</h3><p>Your saved account role takes you to the right workspace automatically.</p></article>
            <article><span>02</span><h3>Share a report</h3><p>Citizens add a location, details, and a photo of the waste concern.</p></article>
            <article><span>03</span><h3>Review and respond</h3><p>City teams can review reports and use local information to plan follow-up.</p></article>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <a className="landing-brand footer-brand" href="/"><span className="landing-brand-icon"><Leaf size={21} /></span><span><strong>Mzuzu SmartClean</strong><small>Cleaner communities, healthier lives</small></span></a>
        <p>A community waste reporting project for Mzuzu City, Malawi.</p>
        <a href="#about">Learn about the project ↑</a>
      </footer>
    </div>
  )
}
