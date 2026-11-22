import { useState, useEffect } from 'react'
import api from '../../utils/api'

const AdminDashboard = () => {
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/overview')
      .then(res => {
        setOverview(res.data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading dashboard:', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="loading">Loading dashboard...</div>
  }

  if (!overview) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '20px' }}>Error Loading Dashboard</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Unable to load dashboard data. Please check:
          </p>
          <ul style={{ textAlign: 'left', display: 'inline-block', marginTop: '20px', color: 'var(--text-secondary)' }}>
            <li>Backend server is running</li>
            <li>Database connection is working</li>
            <li>You are logged in correctly</li>
          </ul>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              marginTop: '20px', 
              padding: '12px 24px', 
              background: 'var(--accent)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ 
          fontSize: '2rem',
          marginBottom: '0.5rem',
          color: 'var(--text-primary)',
          fontWeight: 700,
          letterSpacing: '-0.01em'
        }}>
          Admin Dashboard
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 400 }}>Global System Overview</p>
      </div>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Bookings</h3>
          <div className="value">{overview.stats?.totalBookings || 0}</div>
        </div>
        <div className="stat-card">
          <h3>Total Revenue</h3>
          <div className="value">PKR {(overview.stats?.totalRevenue || 0).toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <h3>Total Passengers</h3>
          <div className="value">{overview.stats?.totalUsers || 0}</div>
        </div>
      </div>

      <div className="card fade-in">
        <h2 style={{ marginBottom: '1rem' }}>
          Top 5 Routes by Bookings
        </h2>
        <table>
          <thead>
            <tr>
              <th>Route</th>
              <th>Bookings</th>
              <th>Revenue (PKR)</th>
            </tr>
          </thead>
          <tbody>
            {overview.topRoutes && overview.topRoutes.length > 0 ? (
              overview.topRoutes.map(route => (
                <tr key={route.route_name}>
                  <td>{route.route_name}</td>
                  <td>{route.total_bookings}</td>
                  <td>{route.total_revenue_pkr?.toLocaleString() || 0}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No data available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card fade-in">
        <h2 style={{ marginBottom: '1rem' }}>
          Top 5 Companies by Revenue
        </h2>
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Bookings</th>
              <th>Revenue (PKR)</th>
              <th>Avg Booking Value</th>
            </tr>
          </thead>
          <tbody>
            {overview.topCompaniesByRevenue && overview.topCompaniesByRevenue.length > 0 ? (
              overview.topCompaniesByRevenue.map(company => (
                <tr key={company.company_name}>
                  <td>{company.company_name}</td>
                  <td>{company.total_bookings}</td>
                  <td>{company.total_revenue_pkr?.toLocaleString() || 0}</td>
                  <td>{Math.round(company.avg_booking_value_pkr || 0).toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No data available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card fade-in">
        <h2 style={{ marginBottom: '1rem' }}>
          Top 5 Companies by Rating
        </h2>
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Rating</th>
              <th>Total Ratings</th>
              <th>Bookings</th>
            </tr>
          </thead>
          <tbody>
            {overview.topCompaniesByRating && overview.topCompaniesByRating.length > 0 ? (
              overview.topCompaniesByRating.map(company => (
                <tr key={company.company_name}>
                  <td>{company.company_name}</td>
                  <td>{parseFloat(company.average_rating || 0).toFixed(1)} / 5</td>
                  <td>{company.total_ratings || 0}</td>
                  <td>{company.total_bookings || 0}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No data available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AdminDashboard

