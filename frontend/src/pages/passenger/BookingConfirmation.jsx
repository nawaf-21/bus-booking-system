import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import api, { getErrorMessage } from '../../utils/api'

const BookingConfirmation = () => {
  const { id } = useParams()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/bookings/${id}`)
      .then(res => setBooking(res.data))
      .catch(err => setError(getErrorMessage(err, 'Could not load this booking.')))
      .finally(() => setLoading(false))
  }, [id])

  if (error) {
    return <div className="container"><div className="error">{error}</div></div>
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="container">
      <div className="card fade-in" style={{ 
        textAlign: 'center',
        background: 'var(--surface)',
        border: '3px solid var(--success)'
      }}>
        <h1 style={{ 
          color: 'var(--success)',
          fontSize: '1.75rem',
          marginBottom: '1rem',
          fontWeight: 700,
          letterSpacing: '-0.01em'
        }}>
          Booking Confirmed!
        </h1>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Booking ID: {booking.booking.booking_id}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '0.75rem' }}><span style={{ color: 'var(--text-muted)' }}>Invoice Number:</span> <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{booking.booking.invoice_number}</strong></p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '0.75rem' }}><span style={{ color: 'var(--text-muted)' }}>Route:</span> <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{booking.booking.route_name}</strong></p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '0.75rem' }}><span style={{ color: 'var(--text-muted)' }}>Company:</span> <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{booking.booking.company_name}</strong></p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '0.75rem' }}><span style={{ color: 'var(--text-muted)' }}>Departure:</span> <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{new Date(booking.booking.departure_datetime).toLocaleString()}</strong></p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '16px', marginTop: '1.5rem' }}><span style={{ color: 'var(--text-muted)' }}>Total Amount:</span> <span style={{ color: 'var(--primary-bright)', fontWeight: 700, fontSize: '1.5rem' }}>PKR {booking.booking.final_amount_pkr}</span></p>
        <div style={{ marginTop: '30px' }}>
          <Link to="/my-bookings" className="btn btn-primary">View My Bookings</Link>
        </div>
      </div>
    </div>
  )
}

export default BookingConfirmation

