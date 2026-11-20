import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { getErrorMessage } from '../../utils/api'
import { useAuth } from '../../context/AuthContext'

const Home = () => {
  const [cities, setCities] = useState([])
  const [companies, setCompanies] = useState([])
  const [favouriteRoutes, setFavouriteRoutes] = useState([])
  const [loadError, setLoadError] = useState('')
  const [searchData, setSearchData] = useState({
    from_city_id: '',
    to_city_id: '',
    travel_date: '',
    bus_type: '',
    company_id: ''
  })
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/cities')
      .then(res => setCities(res.data.cities))
      .catch(err => setLoadError(getErrorMessage(err, 'Could not load the list of cities.')))
    api.get('/companies')
      .then(res => setCompanies(res.data.companies))
      .catch(() => {})
    if (user) {
      api.get('/favourites/routes')
        .then(res => setFavouriteRoutes(res.data.favouriteRoutes))
        .catch(() => {})
    }
  }, [user])

  const handleSearch = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    Object.keys(searchData).forEach(key => {
      if (searchData[key]) params.append(key, searchData[key])
    })
    navigate(`/trips/search?${params.toString()}`)
  }

  const handleFavouriteClick = (route) => {
    setSearchData({
      from_city_id: route.from_city_id || '',
      to_city_id: route.to_city_id || '',
      travel_date: '',
      bus_type: '',
      company_id: route.preferred_company_id || ''
    })
  }

  return (
    <div className="container">
      <div className="card fade-in" style={{ marginTop: '20px', background: 'var(--surface)' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            marginBottom: '0.5rem',
            color: 'var(--text-primary)',
            fontWeight: 700,
            letterSpacing: '-0.01em'
          }}>
            Search Bus Tickets
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 400 }}>Book your journey across Pakistan</p>
        </div>
        {loadError && <div className="error">{loadError}</div>}
        <form onSubmit={handleSearch}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div className="form-group">
              <label>From</label>
              <select
                value={searchData.from_city_id}
                onChange={(e) => {
                  const from = e.target.value;
                  // From and To can't be the same city, so clear To if it matches
                  const to = searchData.to_city_id === from ? '' : searchData.to_city_id;
                  setSearchData({ ...searchData, from_city_id: from, to_city_id: to });
                }}
                required
              >
                <option value="">Select City</option>
                {cities.map(city => (
                  <option key={city.city_id} value={city.city_id}>{city.city_name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>To</label>
              <select
                value={searchData.to_city_id}
                onChange={(e) => setSearchData({ ...searchData, to_city_id: e.target.value })}
                required
              >
                <option value="">Select City</option>
                {cities.filter(city => String(city.city_id) !== String(searchData.from_city_id)).map(city => (
                  <option key={city.city_id} value={city.city_id}>{city.city_name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Travel Date</label>
              <input
                type="date"
                value={searchData.travel_date}
                onChange={(e) => setSearchData({ ...searchData, travel_date: e.target.value })}
                min={new Date().toLocaleDateString('en-CA')}
              />
            </div>
            <div className="form-group">
              <label>Bus Type</label>
              <select
                value={searchData.bus_type}
                onChange={(e) => setSearchData({ ...searchData, bus_type: e.target.value })}
              >
                <option value="">All Types</option>
                <option value="AC">AC</option>
                <option value="Non-AC">Non-AC</option>
                <option value="Sleeper">Sleeper</option>
                <option value="Seater">Seater</option>
              </select>
            </div>
            <div className="form-group">
              <label>Company</label>
              <select
                value={searchData.company_id}
                onChange={(e) => setSearchData({ ...searchData, company_id: e.target.value })}
              >
                <option value="">All Companies</option>
                {companies.map(company => (
                  <option key={company.company_id} value={company.company_id}>
                    {company.company_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '15px' }}>
            Search Buses
          </button>
        </form>
      </div>

      {user && favouriteRoutes.length > 0 && (
        <div className="card fade-in">
          <h2 style={{ 
            marginBottom: '25px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            Favourite Routes
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {favouriteRoutes.map(fav => (
              <div 
                key={fav.fav_id} 
              className="card" 
              style={{ 
                cursor: 'pointer',
                background: 'var(--surface-muted)'
              }}
                onClick={() => handleFavouriteClick(fav)}
              >
                <h3 style={{ 
                  fontSize: '1.25rem',
                  marginBottom: '15px',
                  color: 'var(--primary-light)'
                }}>
                  {fav.route_name}
                </h3>
                {fav.preferred_company_name && (
                  <p style={{ 
                    marginBottom: '10px',
                    color: 'var(--text-secondary)',
                    fontWeight: 600
                  }}>
                    Preferred: {fav.preferred_company_name}
                  </p>
                )}
                <p style={{ 
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: 'var(--primary-bright)'
                }}>
                  PKR {fav.base_fare_pkr.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Home

