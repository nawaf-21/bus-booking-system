import { useState, useEffect } from 'react'
import api from '../../utils/api'
import Invoice from '../../components/Invoice'

const AdminBookings = () => {
  const [bookings, setBookings] = useState([])
  const [routes, setRoutes] = useState([])
  const [companies, setCompanies] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    from_date: '',
    to_date: '',
    route_id: '',
    user_id: '',
    company_id: ''
  })
  const [selectedBooking, setSelectedBooking] = useState(null)

  useEffect(() => {
    loadBookings()
    api.get('/routes').then(res => setRoutes(res.data.routes)).catch(() => {})
    api.get('/companies').then(res => setCompanies(res.data.companies)).catch(() => {})
    api.get('/users').then(res => setUsers(res.data.users)).catch(() => {})
    // Load once on mount; later loads happen when the admin presses Search
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadBookings = () => {
    const params = new URLSearchParams()
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key])
    })

    api.get(`/admin/bookings/search?${params.toString()}`)
      .then(res => {
        setBookings(res.data.bookings)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading bookings:', err)
        setLoading(false)
      })
  }

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value })
  }

  const handleSearch = () => {
    setLoading(true)
    loadBookings()
  }

  const handleReset = () => {
    setFilters({
      status: '',
      from_date: '',
      to_date: '',
      route_id: '',
      user_id: '',
      company_id: ''
    })
    setTimeout(() => {
      setFilters({
        status: '',
        from_date: '',
        to_date: '',
        route_id: '',
        user_id: '',
        company_id: ''
      })
      loadBookings()
    }, 100)
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="container">
      <h1>Booking Management</h1>

      {/* Filters */}
      <div className="card fade-in" style={{ marginBottom: '30px' }}>
        <h2 style={{ marginBottom: '20px' }}>Search & Filter</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div className="form-group">
            <label>Status</label>
            <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
              <option value="">All</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div className="form-group">
            <label>From Date</label>
            <input
              type="date"
              value={filters.from_date}
              onChange={(e) => handleFilterChange('from_date', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>To Date</label>
            <input
              type="date"
              value={filters.to_date}
              onChange={(e) => handleFilterChange('to_date', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Route</label>
            <select value={filters.route_id} onChange={(e) => handleFilterChange('route_id', e.target.value)}>
              <option value="">All Routes</option>
              {routes.map(route => (
                <option key={route.route_id} value={route.route_id}>
                  {route.from_city} → {route.to_city}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>User</label>
            <select value={filters.user_id} onChange={(e) => handleFilterChange('user_id', e.target.value)}>
              <option value="">All Users</option>
              {users.map(user => (
                <option key={user.user_id} value={user.user_id}>{user.full_name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Company</label>
            <select value={filters.company_id} onChange={(e) => handleFilterChange('company_id', e.target.value)}>
              <option value="">All Companies</option>
              {companies.map(comp => (
                <option key={comp.company_id} value={comp.company_id}>{comp.company_name}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button className="btn btn-primary" onClick={handleSearch}>Search</button>
          <button className="btn" onClick={handleReset}>Reset</button>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="card fade-in">
        {bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: 'var(--text-secondary)' }}>No bookings found</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Passenger</th>
                <th>Contact</th>
                <th>Route</th>
                <th>Company</th>
                <th>Departure</th>
                <th>Seats</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Invoice</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(booking => (
                <tr key={booking.booking_id}>
                  <td>#{booking.booking_id}</td>
                  <td>{booking.passenger_name}</td>
                  <td>
                    <div style={{ fontSize: '12px' }}>
                      <div>{booking.passenger_email}</div>
                      <div style={{ color: 'var(--text-muted)' }}>{booking.passenger_phone}</div>
                    </div>
                  </td>
                  <td>{booking.route_name}</td>
                  <td>{booking.company_name}</td>
                  <td>{new Date(booking.departure_datetime).toLocaleString()}</td>
                  <td>{booking.total_seats_booked}</td>
                  <td>PKR {parseFloat(booking.final_amount_pkr || 0).toLocaleString()}</td>
                  <td>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: booking.booking_status === 'Confirmed' ? 'var(--success)' : 'var(--danger)',
                      color: 'white'
                    }}>
                      {booking.booking_status}
                    </span>
                  </td>
                  <td>
                    {booking.invoice_number ? (
                      <button
                        className="btn btn-sm"
                        onClick={() => setSelectedBooking(booking)}
                      >
                        View
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn btn-sm"
                      onClick={() => setSelectedBooking(booking)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedBooking && (
        <Invoice
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}
    </div>
  )
}

export default AdminBookings

