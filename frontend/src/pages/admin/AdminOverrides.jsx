import { useState, useEffect } from 'react'
import api from '../../utils/api'
import ConfirmDialog from '../../components/ConfirmDialog'
import Alert from '../../components/Alert'

const AdminOverrides = () => {
  const [bookings, setBookings] = useState([])
  const [trips, setTrips] = useState([])
  const [seats, setSeats] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('cancel')
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: 'warning', title: '', message: '', onConfirm: null })
  const [alert, setAlert] = useState({ isOpen: false, message: '', type: 'info' })
  const [formData, setFormData] = useState({
    booking_id: '',
    reason: '',
    refund_amount: '',
    trip_id: '',
    seat_id: '',
    passenger_name: '',
    passenger_gender: ''
  })

  useEffect(() => {
    loadBookings()
    loadTrips()
  }, [])

  const loadBookings = () => {
    api.get('/admin/bookings')
      .then(res => {
        setBookings(res.data.bookings.filter(b => b.booking_status === 'Confirmed'))
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading bookings:', err)
        setLoading(false)
      })
  }

  const loadTrips = () => {
    api.get('/admin/trips')
      .then(res => {
        // Only upcoming scheduled trips can have seats reserved
        setTrips(res.data.trips.filter(t => t.trip_status === 'Scheduled' && new Date(t.departure_datetime) > new Date()))
      })
      .catch(err => console.error('Error loading trips:', err))
  }

  // Load the free seats of the chosen trip
  const loadSeats = (tripId) => {
    setSeats([])
    if (!tripId) return
    api.get(`/trips/${tripId}/seats`)
      .then(res => setSeats(res.data.seats.filter(s => s.seat_status === 'Available')))
      .catch(err => console.error('Error loading seats:', err))
  }

  const handleTripChange = (tripId) => {
    setFormData({ ...formData, trip_id: tripId, seat_id: '' })
    loadSeats(tripId)
  }

  const showAlert = (message, type = 'info') => {
    setAlert({ isOpen: true, message, type })
    setTimeout(() => setAlert({ isOpen: false, message: '', type: 'info' }), 3000)
  }

  const handleForceCancel = async (e) => {
    e.preventDefault()
    if (!formData.booking_id) {
      showAlert('Please select a booking', 'warning')
      return
    }
    
    setConfirmDialog({
      isOpen: true,
      type: 'warning',
      title: 'Force Cancel Booking',
      message: 'This will force cancel the booking and automatically refund the customer. Continue?',
      onConfirm: async () => {
        try {
          await api.post(`/admin/bookings/${formData.booking_id}/cancel`, {
            reason: formData.reason || 'Cancelled by admin'
          })
          showAlert('Booking cancelled and refunded successfully!', 'success')
          setFormData({ ...formData, booking_id: '', reason: '' })
          loadBookings()
        } catch (err) {
          showAlert(err.response?.data?.error || 'Failed to cancel booking', 'error')
        }
      }
    })
  }

  const handleRefund = async (e) => {
    e.preventDefault()
    if (!formData.booking_id) {
      showAlert('Please select a booking', 'warning')
      return
    }
    
    setConfirmDialog({
      isOpen: true,
      type: 'info',
      title: 'Process Refund',
      message: 'Process refund for this booking?',
      onConfirm: async () => {
        try {
          await api.post(`/admin/bookings/${formData.booking_id}/refund`, {
            amount: formData.refund_amount,
            reason: formData.reason || 'Admin refund'
          })
          showAlert('Refund processed successfully!', 'success')
          setFormData({ ...formData, booking_id: '', refund_amount: '', reason: '' })
          loadBookings()
        } catch (err) {
          showAlert(err.response?.data?.error || 'Failed to process refund', 'error')
        }
      }
    })
  }

  const handleReserveSeat = async (e) => {
    e.preventDefault()
    if (!formData.trip_id || !formData.seat_id || !formData.passenger_name) {
      showAlert('Please fill all required fields', 'warning')
      return
    }
    
    setConfirmDialog({
      isOpen: true,
      type: 'info',
      title: 'Manually Reserve Seat',
      message: 'This will create a booking without payment. Reserve this seat manually?',
      onConfirm: async () => {
        try {
          await api.post('/admin/seats/reserve', {
            trip_id: formData.trip_id,
            seat_id: formData.seat_id,
            passenger_name: formData.passenger_name,
            passenger_gender: formData.passenger_gender || 'Neutral'
          })
          showAlert('Seat reserved successfully!', 'success')
          setFormData({
            ...formData,
            trip_id: '',
            seat_id: '',
            passenger_name: '',
            passenger_gender: ''
          })
          setSeats([])
          loadTrips()
        } catch (err) {
          showAlert(err.response?.data?.error || 'Failed to reserve seat', 'error')
        }
      }
    })
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
          Manual Override Tools
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 400 }}>Force cancel bookings, process refunds, and manually reserve seats</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
        <button
          className="btn"
          onClick={() => setActiveTab('cancel')}
          style={{
            background: activeTab === 'cancel' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'cancel' ? '#ffffff' : 'var(--text-secondary)',
            borderBottom: activeTab === 'cancel' ? '2px solid var(--primary)' : '2px solid transparent',
            borderRadius: '8px 8px 0 0',
            padding: '0.625rem 1.25rem',
            marginBottom: '-1px'
          }}
        >
          Force Cancel
        </button>
        <button
          className="btn"
          onClick={() => setActiveTab('refund')}
          style={{
            background: activeTab === 'refund' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'refund' ? '#ffffff' : 'var(--text-secondary)',
            borderBottom: activeTab === 'refund' ? '2px solid var(--primary)' : '2px solid transparent',
            borderRadius: '8px 8px 0 0',
            padding: '0.625rem 1.25rem',
            marginBottom: '-1px'
          }}
        >
          Process Refund
        </button>
        <button
          className="btn"
          onClick={() => setActiveTab('reserve')}
          style={{
            background: activeTab === 'reserve' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'reserve' ? '#ffffff' : 'var(--text-secondary)',
            borderBottom: activeTab === 'reserve' ? '2px solid var(--primary)' : '2px solid transparent',
            borderRadius: '8px 8px 0 0',
            padding: '0.625rem 1.25rem',
            marginBottom: '-1px'
          }}
        >
          Reserve Seat
        </button>
      </div>

      {/* Force Cancel */}
      {activeTab === 'cancel' && (
        <div className="card fade-in">
          <h2>Force Cancel Booking</h2>
          <form onSubmit={handleForceCancel}>
            <div className="form-group">
              <label>Select Booking *</label>
              <select
                value={formData.booking_id}
                onChange={(e) => setFormData({ ...formData, booking_id: e.target.value })}
                required
              >
                <option value="">Select Booking</option>
                {bookings.map(booking => (
                  <option key={booking.booking_id} value={booking.booking_id}>
                    #{booking.booking_id} - {booking.passenger_name} - {booking.route_name} - PKR {parseFloat(booking.final_amount_pkr || 0).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Cancellation Reason</label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Reason for cancellation..."
                rows="3"
              />
            </div>
            <button type="submit" className="btn btn-danger">Force Cancel & Refund</button>
          </form>
        </div>
      )}

      {/* Process Refund */}
      {activeTab === 'refund' && (
        <div className="card fade-in">
          <h2>Process Refund</h2>
          <form onSubmit={handleRefund}>
            <div className="form-group">
              <label>Select Booking *</label>
              <select
                value={formData.booking_id}
                onChange={(e) => setFormData({ ...formData, booking_id: e.target.value })}
                required
              >
                <option value="">Select Booking</option>
                {/* Only confirmed bookings that were actually paid for can be refunded */}
                {bookings.filter(b => Number(b.final_amount_pkr) > 0).map(booking => (
                  <option key={booking.booking_id} value={booking.booking_id}>
                    #{booking.booking_id} - {booking.passenger_name} - PKR {parseFloat(booking.final_amount_pkr || 0).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Refund Amount (leave blank for full refund)</label>
              <input
                type="number"
                value={formData.refund_amount}
                onChange={(e) => setFormData({ ...formData, refund_amount: e.target.value })}
                placeholder="Enter amount or leave blank for full refund"
                min="1"
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label>Refund Reason</label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Reason for refund..."
                rows="3"
              />
            </div>
            <button type="submit" className="btn btn-primary">Process Refund</button>
          </form>
        </div>
      )}

      {/* Reserve Seat */}
      {activeTab === 'reserve' && (
        <div className="card fade-in">
          <h2>Manually Reserve Seat</h2>
          <form onSubmit={handleReserveSeat}>
            <div className="form-group">
              <label>Select Trip *</label>
              <select
                value={formData.trip_id}
                onChange={(e) => handleTripChange(e.target.value)}
                required
              >
                <option value="">Select Trip</option>
                {trips.map(trip => (
                  <option key={trip.trip_id} value={trip.trip_id}>
                    {trip.route_name} - {new Date(trip.departure_datetime).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Seat *</label>
              <select
                value={formData.seat_id}
                onChange={(e) => setFormData({ ...formData, seat_id: e.target.value })}
                disabled={!formData.trip_id}
                required
              >
                <option value="">{formData.trip_id ? 'Select Seat' : 'Select a trip first'}</option>
                {seats.map(seat => (
                  <option key={seat.seat_id} value={seat.seat_id}>
                    {seat.seat_number} ({seat.seat_type})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Passenger Name *</label>
              <input
                type="text"
                value={formData.passenger_name}
                onChange={(e) => setFormData({ ...formData, passenger_name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Passenger Gender</label>
              <select
                value={formData.passenger_gender}
                onChange={(e) => setFormData({ ...formData, passenger_gender: e.target.value })}
              >
                <option value="Neutral">Neutral</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary">Reserve Seat</button>
          </form>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        confirmText={confirmDialog.confirmText || 'Confirm'}
      />

      {/* Alert */}
      {alert.isOpen && (
        <Alert
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert({ isOpen: false, message: '', type: 'info' })}
        />
      )}
    </div>
  )
}

export default AdminOverrides

