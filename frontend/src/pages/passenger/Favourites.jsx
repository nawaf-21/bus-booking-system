import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { getErrorMessage } from '../../utils/api'

const Favourites = () => {
  const [favourites, setFavourites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/favourites/routes')
      .then(res => setFavourites(res.data.favouriteRoutes))
      .catch(err => setError(getErrorMessage(err, 'Could not load favourite routes.')))
      .finally(() => setLoading(false))
  }, [])

  const handleRemove = async (favId) => {
    try {
      await api.delete(`/favourites/routes/${favId}`)
      setFavourites(favourites.filter(f => f.fav_id !== favId))
    } catch {
      alert('Failed to remove favourite')
    }
  }

  const handleSearch = (fav) => {
    navigate(`/trips/search?from_city_id=${fav.from_city_id}&to_city_id=${fav.to_city_id}&company_id=${fav.preferred_company_id || ''}`)
  }

  if (error) {
    return <div className="container"><div className="error">{error}</div></div>
  }

  if (loading) {
    return <div className="loading">Loading...</div>
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
          Favourite Routes
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 400 }}>Quick access to your preferred routes</p>
      </div>
      {favourites.length === 0 ? (
        <div className="card fade-in">
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <h2 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '1.25rem' }}>No favourites yet</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Add routes to your favourites for quick booking!</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
          {favourites.map(fav => (
            <div 
              key={fav.fav_id} 
              className="card fade-in" 
              style={{ 
                background: 'var(--surface-muted)'
              }}
            >
                <h2 style={{ 
                  fontSize: '1.5rem',
                  marginBottom: '15px',
                  color: 'var(--text-primary)',
                  fontWeight: 700
                }}>
                  {fav.route_name}
                </h2>
                {fav.preferred_company_name && (
                  <p style={{ 
                    marginBottom: '15px',
                    color: 'var(--text-secondary)',
                    fontSize: '15px'
                  }}>
                    <span style={{ color: 'var(--text-muted)' }}>Preferred:</span> <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fav.preferred_company_name}</strong>
                  </p>
                )}
                <p style={{ 
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  marginBottom: '20px',
                  color: 'var(--primary-bright)'
                }}>
                  PKR {fav.base_fare_pkr.toLocaleString()}
                </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => handleSearch(fav)} style={{ flex: 1 }}>
                  Search
                </button>
                <button className="btn btn-danger" onClick={() => handleRemove(fav.fav_id)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Favourites

