import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PASSWORD_RULES, passwordIsValid } from '../utils/password'

const Register = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    gender: '',
    phone_no: ''
  })
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!passwordIsValid(formData.password)) {
      setError('Please choose a password that meets all the rules below the password box')
      return
    }
    if (formData.password !== confirmPassword) {
      setError('The two passwords do not match')
      return
    }
    try {
      await register({ ...formData, role: 'Passenger' })
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed')
    }
  }

  return (
    <div className="container" style={{ maxWidth: '550px', marginTop: '50px' }}>
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
            Create Account
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 400 }}>Create your Musafir passenger account</p>
        </div>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              maxLength={100}
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              maxLength={64}
              required
            />
            <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', fontSize: '13px' }}>
              {PASSWORD_RULES.map(rule => {
                const ok = rule.test(formData.password)
                return (
                  <li key={rule.label} style={{ color: ok ? 'var(--success)' : 'var(--text-muted)' }}>
                    {ok ? '✓' : '○'} {rule.label}
                  </li>
                )
              })}
            </ul>
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {confirmPassword && confirmPassword !== formData.password && (
              <small style={{ color: 'var(--danger)' }}>The passwords do not match</small>
            )}
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              value={formData.phone_no}
              onChange={(e) => setFormData({ ...formData, phone_no: e.target.value })}
              placeholder="0300-1234567"
              pattern="([+]92|0)3[0-9]{2}-?[0-9]{7}"
              title="A Pakistani mobile number, for example 0300-1234567"
              required
            />
          </div>
          <div className="form-group">
            <label>Gender</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              required
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Register
          </button>
        </form>
        <p style={{ marginTop: '15px', textAlign: 'center' }}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  )
}

export default Register

