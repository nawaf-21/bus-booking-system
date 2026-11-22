import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api, { getErrorMessage } from '../../utils/api'
import Invoice from '../../components/Invoice'
import Modal from '../../components/Modal'

const MyBookings = () => {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedBooking, setSelectedBooking] = useState(null)
  // The booking the passenger is writing a review for
  const [reviewBooking, setReviewBooking] = useState(null)
  const [rating, setRating] = useState(5)
  const [comments, setComments] = useState('')
  // Which tab is open: 'upcoming', 'past' or 'cancelled'
  const [tab, setTab] = useState('upcoming')

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
      // Keep it in the list, but show it as cancelled and refunded
      setBookings(prev => prev.map(b => b.booking_id === bookingId
        ? { ...b, booking_status: 'Cancelled', payment_status: 'Refunded' }
        : b))
      alert('Booking cancelled successfully')
    } catch (err) {
      alert(err.response?.data?.error || 'Cancellation failed')
    }
  }

  const handleReview = async (e) => {
    e.preventDefault()
    try {
      await api.post(`/feedback/trips/${reviewBooking.trip_id}`, { rating: Number(rating), comments })
      setBookings(prev => prev.map(b => b.trip_id === reviewBooking.trip_id ? { ...b, has_review: 1 } : b))
      setReviewBooking(null)
      setRating(5)
      setComments('')
      alert('Thank you for your review!')
    } catch (err) {
      alert(getErrorMessage(err, 'Could not save your review'))
    }
  }

  // Badge colours for each booking status
  const statusColor = (status) => {
    if (status === 'Confirmed') return { background: 'var(--success-soft)', color: 'var(--success)' }
    if (status === 'Pending') return { background: 'var(--accent-soft)', color: 'var(--primary)' }
    return { background: 'var(--danger-soft)', color: 'var(--danger)' }
  }

  if (error) {
    return <div className="container"><div className="error">{error}</div></div>
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  // Put each booking in a tab:
  // upcoming = active and the bus has not left, past = active and the bus has left,
  // cancelled = cancelled or refunded
  const now = new Date()
  const isActive = (b) => b.booking_status === 'Confirmed' || b.booking_status === 'Pending'
  const upcoming = bookings
    .filter(b => isActive(b) && new Date(b.departure_datetime) > now)
    .sort((a, b) => new Date(a.departure_datetime) - new Date(b.departure_datetime)) // soonest first
  const past = bookings
    .filter(b => isActive(b) && new Date(b.departure_datetime) <= now)
    .sort((a, b) => new Date(b.departure_datetime) - new Date(a.departure_datetime)) // latest first
  const cancelled = bookings.filter(b => !isActive(b))
  const tabs = [
    { key: 'upcoming', label: 'Upcoming', list: upcoming, empty: 'No upcoming trips. Search for your next journey!' },
    { key: 'past', label: 'Past', list: past, empty: 'No past trips yet.' },
    { key: 'cancelled', label: 'Cancelled', list: cancelled, empty: 'No cancelled bookings.' }
  ]
  const currentTab = tabs.find(t => t.key === tab)

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
      <div className="pill-group" style={{ marginBottom: '20px' }}>
        {tabs.map(t => (
          <button key={t.key} className={`pill ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label} ({t.list.length})
          </button>
        ))}
      </div>
      {currentTab.list.length === 0 ? (
        <div className="card fade-in">
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <h2 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '1.25rem' }}>
              {bookings.length === 0 ? 'No bookings yet' : currentTab.empty}
            </h2>
            {bookings.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Start booking your next journey!</p>
            )}
          </div>
        </div>
      ) : (
        currentTab.list.map((booking, index) => (
          <div key={booking.booking_id} className="trip-card fade-in" style={{ animationDelay: `${Math.min(index, 5) * 0.1}s` }}>
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
                      {booking.total_seats} {booking.total_seats === 1 ? 'Seat' : 'Seats'}
                    </span>
                    <span style={{ 
                      padding: '6px 14px',
                      ...statusColor(booking.booking_status),
                      borderRadius: '20px',
                      fontWeight: 600,
                      fontSize: '14px'
                    }}>
                      {booking.booking_status}
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
                {/* A trip can be reviewed once, after the bus has left */}
                {booking.booking_status === 'Confirmed' && new Date(booking.departure_datetime) < new Date() && (
                  booking.has_review ? (
                    <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Reviewed</span>
                  ) : (
                    <button className="btn btn-secondary" onClick={() => setReviewBooking(booking)}>
                      Rate Trip
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        ))
      )}
      
      <Modal isOpen={reviewBooking !== null} onClose={() => setReviewBooking(null)} title="Rate your trip" size="small">
        {reviewBooking && (
          <form onSubmit={handleReview}>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>
              {reviewBooking.route_name} with {reviewBooking.company_name}
            </p>
            <div className="form-group">
              <label>Rating</label>
              <select value={rating} onChange={(e) => setRating(e.target.value)}>
                <option value="5">5 - Excellent</option>
                <option value="4">4 - Good</option>
                <option value="3">3 - Okay</option>
                <option value="2">2 - Poor</option>
                <option value="1">1 - Very bad</option>
              </select>
            </div>
            <div className="form-group">
              <label>Comments (optional)</label>
              <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows="3" maxLength="500" />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-primary">Submit Review</button>
              <button type="button" className="btn btn-secondary" onClick={() => setReviewBooking(null)}>Close</button>
            </div>
          </form>
        )}
      </Modal>

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

