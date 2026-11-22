import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { getErrorMessage } from '../../utils/api'

const Checkout = () => {
  const [bookingData, setBookingData] = useState(null)
  const [preview, setPreview] = useState(null)
  const [promoCode, setPromoCode] = useState('')
  // The promo code that was checked and is included in the price shown
  const [appliedPromo, setAppliedPromo] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  // Message under the promo box: { type: 'error' | 'success', text }
  const [promoMessage, setPromoMessage] = useState(null)
  // Error shown above the Confirm button if the booking fails
  const [confirmError, setConfirmError] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Card')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const data = sessionStorage.getItem('bookingData')
    if (!data) {
      navigate('/')
      return
    }
    const parsed = JSON.parse(data)
    setBookingData(parsed)
    
    // Get preview
    api.post('/bookings/preview', {
      trip_id: parsed.trip_id,
      seat_ids: parsed.seats.map(s => s.seat_id),
      passenger_names: parsed.seats.map(s => s.passenger_name),
      passenger_genders: parsed.seats.map(s => s.passenger_gender)
    })
      .then(res => setPreview(res.data))
      .catch(err => setError(getErrorMessage(err, 'Could not prepare your booking.')))
      .finally(() => setLoading(false))
  }, [navigate])

  const getPreview = (code) => api.post('/bookings/preview', {
    trip_id: bookingData.trip_id,
    seat_ids: bookingData.seats.map(s => s.seat_id),
    passenger_names: bookingData.seats.map(s => s.passenger_name),
    passenger_genders: bookingData.seats.map(s => s.passenger_gender),
    promo_code: code
  })

  const handlePromoCode = async () => {
    const code = promoCode.trim().toUpperCase()
    if (!code) {
      setPromoMessage({ type: 'error', text: 'Please type a promo code first' })
      return
    }
    try {
      // The preview checks the code for this trip and works out the discount
      const newPreview = await getPreview(code)
      setPreview(newPreview.data)
      setAppliedPromo(code)
      setPromoCode(code)
      setPromoMessage({
        type: 'success',
        text: `${code} applied. You save PKR ${newPreview.data.pricing.discountAmount.toLocaleString()}.`
      })
    } catch (err) {
      setPromoMessage({ type: 'error', text: getErrorMessage(err, 'This promo code could not be applied') })
    }
  }

  const handleRemovePromo = async () => {
    try {
      const newPreview = await getPreview(null)
      setPreview(newPreview.data)
      setAppliedPromo(null)
      setPromoCode('')
      setPromoMessage(null)
    } catch (err) {
      setPromoMessage({ type: 'error', text: getErrorMessage(err, 'Could not remove the promo code') })
    }
  }

  const handleConfirm = async () => {
    if (submitting) return
    setSubmitting(true)
    setConfirmError('')
    try {
      const res = await api.post('/bookings/confirm', {
        trip_id: bookingData.trip_id,
        seat_ids: bookingData.seats.map(s => s.seat_id),
        passenger_names: bookingData.seats.map(s => s.passenger_name),
        passenger_genders: bookingData.seats.map(s => s.passenger_gender),
        promo_code: appliedPromo,
        payment_method: paymentMethod
      })
      sessionStorage.removeItem('bookingData')
      navigate(`/booking/${res.data.bookingId}/confirmation`)
    } catch (err) {
      setConfirmError(getErrorMessage(err, 'Booking failed. Please try again.'))
      setSubmitting(false)
    }
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">{error}</div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>Back to seat selection</button>
      </div>
    )
  }

  if (loading || !preview) {
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
          Checkout
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 400 }}>Review and confirm your booking</p>
      </div>
      <div className="card">
        <h2>Trip Details</h2>
        <p><strong>Route:</strong> {preview.trip.fromCity} → {preview.trip.toCity}</p>
        <p><strong>Fare per seat:</strong> PKR {preview.trip.farePerSeat}</p>
      </div>

      <div className="card">
        <h2>Selected Seats</h2>
        {preview.seats.map((seat, idx) => (
          <p key={idx}>Seat {seat.seatNumber} - {seat.passengerName} ({seat.passengerGender})</p>
        ))}
      </div>

      <div className="card">
        <h2>Promo Code</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={promoCode}
            onChange={(e) => {
              setPromoCode(e.target.value)
              setPromoMessage(null) // hide the old message while typing
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handlePromoCode()
            }}
            placeholder="Enter promo code"
            disabled={appliedPromo !== null}
            style={{ flex: 1, padding: '8px' }}
          />
          {appliedPromo ? (
            <button className="btn btn-secondary" onClick={handleRemovePromo}>Remove</button>
          ) : (
            <button className="btn btn-secondary" onClick={handlePromoCode}>Apply</button>
          )}
        </div>
        {promoMessage && (
          <p style={{
            marginTop: '10px',
            fontSize: '14px',
            fontWeight: 500,
            color: promoMessage.type === 'success' ? 'var(--success)' : 'var(--danger)'
          }}>
            {promoMessage.text}
          </p>
        )}
      </div>

      <div className="card">
        <h2>Payment</h2>
        <div className="form-group">
          <label>Payment Method</label>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="Card">Card</option>
            <option value="JazzCash">JazzCash</option>
            <option value="Easypaisa">Easypaisa</option>
            <option value="CashOnCounter">Cash on Counter</option>
          </select>
        </div>
      </div>

      <div className="card fade-in" style={{ 
        background: 'var(--surface-muted)',
        border: '1px solid var(--border-hover)'
      }}>
        <h2 style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          Summary
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Base Amount:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>PKR {preview.pricing.baseAmount.toLocaleString()}</span>
          </div>
          {preview.pricing.discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--success)', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 500 }}>Discount:</span>
              <span style={{ fontWeight: 600 }}>-PKR {preview.pricing.discountAmount.toLocaleString()}</span>
            </div>
          )}
          <div style={{ 
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Total:</span>
            <span style={{ 
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--primary-bright)'
            }}>
              PKR {preview.pricing.finalAmount.toLocaleString()}
            </span>
          </div>
        </div>
        {confirmError && <div className="error">{confirmError}</div>}
        <button className="btn btn-primary" onClick={handleConfirm} disabled={submitting} style={{ width: '100%' }}>
          {submitting ? 'Booking...' : 'Confirm Booking'}
        </button>
      </div>
    </div>
  )
}

export default Checkout

