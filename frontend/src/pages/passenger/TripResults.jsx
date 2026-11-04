import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api, { getErrorMessage } from '../../utils/api'

const TripResults = () => {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const params = {}
    searchParams.forEach((value, key) => {
      params[key] = value
    })
    api.get('/trips/search', { params })
      .then(res => {
        setTrips(res.data.trips || [])
        setLoading(false)
      })
      .catch(err => {
        setError(getErrorMessage(err, 'Could not search trips.'))
        setLoading(false)
        setTrips([])
      })
  }, [searchParams])

  const handleSelectTrip = (tripId) => {
    navigate(`/trips/${tripId}/seats`)
  }

  if (loading) {
    return <div className="loading">Loading trips...</div>
  }

  return (
    <div className="container">
      <h1>Available Trips</h1>
      {error && <div className="error">{error}</div>}
      {error ? null : trips.length === 0 ? (
        <div className="card fade-in">
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <h2 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '1.25rem' }}>No trips found</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Try adjusting your search criteria</p>
          </div>
        </div>
      ) : (
        trips.map(trip => (
          <div key={trip.trip_id} className="trip-card fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
              <div style={{ flex: 1, minWidth: '240px' }}>
                <h2 style={{ 
                  fontSize: '1.75rem', 
                  marginBottom: '15px',
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                  letterSpacing: '-0.01em'
                }}>
                  {trip.from_city} → {trip.to_city}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ fontSize: '17px', fontWeight: 600, marginBottom: '12px' }}>
                    <span style={{ color: 'var(--primary-bright)' }}>{trip.company_name}</span>
                    <span style={{ marginLeft: '15px', color: 'var(--text-muted)', fontWeight: 500 }}>• {trip.bus_type}</span>
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Departure:</span> <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{new Date(trip.departure_datetime).toLocaleString()}</strong>
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Arrival:</span> <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{new Date(trip.arrival_datetime).toLocaleString()}</strong>
                  </p>
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <p style={{ 
                      padding: '8px 16px', 
                      background: trip.seats_available > 0 ? 'var(--success-soft)' : 'var(--danger-soft)',
                      borderRadius: '20px',
                      fontWeight: 600,
                      fontSize: '14px',
                      color: trip.seats_available > 0 ? 'var(--success)' : 'var(--danger)'
                    }}>
                      {trip.seats_available} / {trip.total_seats} Available
                    </p>
                    {trip.avg_rating && (
                      <p style={{ 
                        padding: '8px 16px', 
                        background: 'var(--warning-soft)',
                        borderRadius: '20px',
                        fontWeight: 600,
                        fontSize: '14px',
                        color: 'var(--warning)'
                      }}>
                        Rating {parseFloat(trip.avg_rating).toFixed(1)} / 5 ({trip.total_ratings} reviews)
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right', minWidth: '200px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ 
                    fontSize: '1.75rem', 
                    fontWeight: 700,
                    color: 'var(--primary-bright)',
                    lineHeight: 1
                  }}>
                    PKR {trip.fare_pkr.toLocaleString()}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px', fontWeight: 500 }}>per seat</div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => handleSelectTrip(trip.trip_id)}
                  disabled={trip.seats_available === 0}
                  style={{ width: '100%' }}
                >
                  {trip.seats_available === 0 ? 'Sold Out' : 'Select Seats'}
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

export default TripResults

