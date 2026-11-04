import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

const Register = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    gender: '',
    phone_no: '',
    role: 'Passenger',
    company_id: null
  })
  const [companies, setCompanies] = useState([])
  const [error, setError] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (formData.role === 'BusCompany') {
      api.get('/companies')
        .then(res => setCompanies(res.data.companies))
        .catch(() => setCompanies([]))
    }
  }, [formData.role])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const user = await register(formData)
      if (user.role === 'Admin') {
        navigate('/admin')
      } else if (user.role === 'BusCompany') {
        navigate('/company')
      } else {
        navigate('/')
      }
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
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 400 }}>Create your Musafir account</p>
        </div>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
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
              required
            />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="text"
              value={formData.phone_no}
              onChange={(e) => setFormData({ ...formData, phone_no: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value, company_id: null })}
              required
            >
              <option value="Passenger">Passenger</option>
              <option value="BusCompany">Bus Company</option>
            </select>
          </div>
          {formData.role === 'Passenger' && (
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
          )}
          {formData.role === 'BusCompany' && companies.length > 0 && (
            <div className="form-group">
              <label>Company</label>
              <select
                value={formData.company_id || ''}
                onChange={(e) => setFormData({ ...formData, company_id: parseInt(e.target.value) })}
                required
              >
                <option value="">Select Company</option>
                {companies.map(company => (
                  <option key={company.company_id} value={company.company_id}>
                    {company.company_name}
                  </option>
                ))}
              </select>
            </div>
          )}
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

