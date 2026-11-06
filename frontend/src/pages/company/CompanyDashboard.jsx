import { useState, useEffect } from 'react'
import api from '../../utils/api'

const CompanyDashboard = () => {
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/company/overview')
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
          Company Dashboard
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 400 }}>Your Business Analytics</p>
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
          <h3>Upcoming Trips</h3>
          <div className="value">{overview.stats?.upcomingTrips || 0}</div>
        </div>
        <div className="stat-card">
          <h3>Average Rating</h3>
          <div className="value">{parseFloat(overview.stats?.averageRating || 0).toFixed(1)} / 5</div>
        </div>
      </div>

      <div className="card fade-in">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
          Upcoming Trips
        </h2>
        <table>
          <thead>
            <tr>
              <th>Route</th>
              <th>Departure</th>
              <th>Booked</th>
              <th>Available</th>
              <th>Occupancy %</th>
            </tr>
          </thead>
          <tbody>
            {overview.upcomingTrips && overview.upcomingTrips.length > 0 ? (
              overview.upcomingTrips.map(trip => (
                <tr key={trip.trip_id}>
                  <td>{trip.route_name}</td>
                  <td>{new Date(trip.departure_datetime).toLocaleString()}</td>
                  <td>{trip.booked_seats || 0}</td>
                  <td>{trip.available_seats || 0}</td>
                  <td>{parseFloat(trip.occupancy_pct || 0).toFixed(1)}%</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No upcoming trips</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card fade-in">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
          Recent Feedback
        </h2>
        {!overview.recentFeedback || overview.recentFeedback.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No feedback yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Route</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Passenger</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {overview.recentFeedback.map(feedback => (
                <tr key={feedback.feedback_id}>
                  <td>{feedback.route_name}</td>
                  <td>{feedback.rating} / 5</td>
                  <td>{feedback.comments || 'N/A'}</td>
                  <td>{feedback.passenger_name}</td>
                  <td>{new Date(feedback.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default CompanyDashboard

