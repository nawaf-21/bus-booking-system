import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { DEMO_MODE } from '../utils/api'
import { QUICK_LOGINS, SAMPLE_PASSWORD } from '../demo/demoData'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const signIn = async (loginEmail, loginPassword) => {
    setError('')
    try {
      const user = await login(loginEmail.trim(), loginPassword)
      if (user.role === 'Admin') {
        navigate('/admin')
      } else if (user.role === 'BusCompany') {
        navigate('/company')
      } else {
        // go back to the page they came from
        navigate(location.state?.from || '/')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    signIn(email, password)
  }

  return (
    <div className="container" style={{ maxWidth: '450px', marginTop: '50px' }}>
      <div className="card fade-in" style={{ 
        background: 'var(--surface)',
        backdropFilter: 'blur(20px)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ 
            fontSize: '1.75rem',
            color: 'var(--text-primary)',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            marginBottom: '0.5rem'
          }}>
            Login
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 400 }}>Welcome back to Musafir</p>
        </div>
        {error && <div className="error">{error}</div>}
        {/* quick logins, only in demo/dev */}
        {(DEMO_MODE || import.meta.env.DEV) && (
          <>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '10px' }}>
              Quick login (sample accounts)
            </p>
            <div className="quick-login">
              {QUICK_LOGINS.map(account => (
                <button
                  key={account.email}
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => signIn(account.email, DEMO_MODE ? 'demo' : SAMPLE_PASSWORD)}
                >
                  {account.label}
                </button>
              ))}
            </div>
            <div className="login-divider"><span>or use your email</span></div>
          </>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Login
          </button>
        </form>
        <p style={{ marginTop: '15px', textAlign: 'center' }}>
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  )
}

export default Login

