import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api, { getErrorMessage } from '../../utils/api'
import { useAuth } from '../../context/AuthContext'

const TripResults = () => {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  // Trips whose route was saved to favourites on this page
  const [savedTrips, setSavedTrips] = useState([])
  // How the results are ordered: 'departure', 'price' or 'rating'
  const [sortBy, setSortBy] = useState('departure')

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

  const handleSaveRoute = async (trip) => {
    try {
      await api.post('/favourites/routes', { route_id: trip.route_id, preferred_company_id: trip.company_id })
      setSavedTrips([...savedTrips, trip.trip_id])
    } catch (err) {
      alert(getErrorMessage(err, 'Could not save this route'))
    }
  }

  // Go back to the home page with the same search filled in
  const backToSearch = () => {
    navigate(`/?${searchParams.toString()}`)
  }

  const handleSelectTrip = (tripId) => {
    navigate(`/trips/${tripId}/seats`)
  }

  if (loading) {
    return <div className="loading">Loading trips...</div>
  }

  // Sort a copy of the list (never change state directly).
  // Rating: highest first, trips with no rating last. Ties go by departure time.
  const byDeparture = (a, b) => new Date(a.departure_datetime) - new Date(b.departure_datetime)
  const sortedTrips = [...trips].sort((a, b) => {
    if (sortBy === 'price') return a.fare_pkr - b.fare_pkr || byDeparture(a, b)
    if (sortBy === 'rating') return (b.avg_rating || 0) - (a.avg_rating || 0) || byDeparture(a, b)
    return byDeparture(a, b)
  })

  return (
    <div className="container">
      <button className="pill" onClick={backToSearch} style={{ marginBottom: '12px' }}>
        ← Change search
      </button>
      <h1>Available Trips</h1>
      {error && <div className="error">{error}</div>}
      {trips.length > 1 && (
        <div className="pill-group" style={{ alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '14px', marginRight: '4px' }}>Sort by:</span>
          <button className={`pill ${sortBy === 'departure' ? 'active' : ''}`} onClick={() => setSortBy('departure')}>
            Earliest departure
          </button>
          <button className={`pill ${sortBy === 'price' ? 'active' : ''}`} onClick={() => setSortBy('price')}>
            Lowest price
          </button>
          <button className={`pill ${sortBy === 'rating' ? 'active' : ''}`} onClick={() => setSortBy('rating')}>
            Best rating
          </button>
        </div>
      )}
      {error ? null : trips.length === 0 ? (
        <div className="card fade-in">
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <h2 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '1.25rem' }}>No trips found</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>Try another date, or remove the bus type or company filter.</p>
            <button className="btn btn-primary" onClick={backToSearch}>Change search</button>
          </div>
        </div>
      ) : (
        sortedTrips.map(trip => (
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
                {user?.role === 'Passenger' && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleSaveRoute(trip)}
                    disabled={savedTrips.includes(trip.trip_id)}
                    style={{ width: '100%', marginTop: '8px' }}
                  >
                    {savedTrips.includes(trip.trip_id) ? 'Saved to Favourites' : 'Save Route'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

export default TripResults

