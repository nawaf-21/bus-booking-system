import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api, { getErrorMessage } from '../../utils/api'
import Invoice from '../../components/Invoice'

const MyBookings = () => {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedBooking, setSelectedBooking] = useState(null)

  useEffect(() => {
    api.get('/bookings/my')
      .then(res => setBookings(res.data.bookings))
      .catch(err => setError(getErrorMessage(err, 'Could not load your bookings.')))
      .finally(() => setLoading(false))
  }, [])

  const handleCancel = async (bookingId) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return
    try {
      await api.post(`/bookings/${bookingId}/cancel`)
      setBookings(bookings.filter(b => b.booking_id !== bookingId))
      alert('Booking cancelled successfully')
    } catch (err) {
      alert(err.response?.data?.error || 'Cancellation failed')
    }
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
          My Bookings
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 400 }}>View and manage your reservations</p>
      </div>
      {bookings.length === 0 ? (
        <div className="card fade-in">
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <h2 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '1.25rem' }}>No bookings yet</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Start booking your next journey!</p>
          </div>
        </div>
      ) : (
        bookings.map((booking, index) => (
          <div key={booking.booking_id} className="trip-card fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
              <div style={{ flex: 1, minWidth: '300px' }}>
                <h2 style={{ 
                  fontSize: '1.5rem',
                  marginBottom: '15px',
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                  letterSpacing: '-0.01em'
                }}>
                  {booking.route_name}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ fontSize: '16px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>Company:</span> {booking.company_name}
                  </p>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Departure:</strong> {new Date(booking.departure_datetime).toLocaleString()}
                  </p>
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <span style={{ 
                      padding: '6px 14px',
                      background: 'var(--accent-soft)',
                      borderRadius: '20px',
                      fontWeight: 600,
                      fontSize: '14px',
                      color: 'var(--primary)'
                    }}>
                      {booking.total_seats} Seats
                    </span>
                    <span style={{ 
                      padding: '6px 14px',
                      background: booking.booking_status === 'Confirmed' 
                        ? 'var(--success-soft)'
                        : 'var(--danger-soft)',
                      borderRadius: '20px',
                      fontWeight: 600,
                      fontSize: '14px',
                      color: booking.booking_status === 'Confirmed' ? 'var(--success)' : 'var(--danger)'
                    }}>
                      {booking.booking_status === 'Confirmed' ? 'Confirmed' : 'Cancelled'}
                    </span>
                  </div>
                  <p style={{ 
                    fontSize: '1.375rem',
                    fontWeight: 700,
                    marginTop: '10px',
                    color: 'var(--primary-bright)'
                  }}>
                    PKR {parseFloat(booking.amount_paid_pkr).toLocaleString()}
                  </p>
                  {booking.invoice_number && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                      Invoice: <strong style={{ color: 'var(--text-primary)' }}>{booking.invoice_number}</strong>
                    </p>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexDirection: 'column' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={() => setSelectedBooking(booking)}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  View Invoice
                </button>
                {booking.booking_status === 'Confirmed' && new Date(booking.departure_datetime) > new Date() && (
                  <button className="btn btn-danger" onClick={() => handleCancel(booking.booking_id)}>
                    Cancel Booking
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      )}
      
      {selectedBooking && (
        <Invoice 
          booking={selectedBooking} 
          onClose={() => setSelectedBooking(null)} 
        />
      )}
    </div>
  )
}

export default MyBookings

