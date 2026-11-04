import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api, { getErrorMessage } from '../../utils/api'

const SeatSelection = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [trip, setTrip] = useState(null)
  const [seats, setSeats] = useState([])
  const [selectedSeats, setSelectedSeats] = useState([])
  const [passengerData, setPassengerData] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/trips/${id}`)
      .then(res => setTrip(res.data.trip))
      .catch(() => {}) // the seat request below reports the error
    api.get(`/trips/${id}/seats`)
      .then(res => setSeats(res.data.seats))
      .catch(err => setError(getErrorMessage(err, 'Could not load the seat map for this trip.')))
      .finally(() => setLoading(false))
  }, [id])

  const toggleSeat = (seat) => {
    if (seat.seat_status === 'Booked') return

    const index = selectedSeats.findIndex(s => s.seat_id === seat.seat_id)
    if (index >= 0) {
      setSelectedSeats(selectedSeats.filter(s => s.seat_id !== seat.seat_id))
      const newData = { ...passengerData }
      delete newData[seat.seat_id]
      setPassengerData(newData)
    } else {
      setSelectedSeats([...selectedSeats, seat])
      setPassengerData({
        ...passengerData,
        [seat.seat_id]: { name: '', gender: '' }
      })
    }
  }

  const handlePassengerDataChange = (seatId, field, value) => {
    setPassengerData({
      ...passengerData,
      [seatId]: { ...passengerData[seatId], [field]: value }
    })
  }

  const handleContinue = () => {
    // Validate all selected seats have passenger data
    const allValid = selectedSeats.every(seat => {
      const data = passengerData[seat.seat_id]
      return data && data.name && data.gender
    })

    if (!allValid) {
      alert('Please fill in passenger details for all selected seats')
      return
    }

    // Store in sessionStorage and navigate to checkout
    sessionStorage.setItem('bookingData', JSON.stringify({
      trip_id: id,
      seats: selectedSeats.map(seat => ({
        seat_id: seat.seat_id,
        passenger_name: passengerData[seat.seat_id].name,
        passenger_gender: passengerData[seat.seat_id].gender
      }))
    }))
    navigate('/checkout')
  }

  if (error) {
    return <div className="container"><div className="error">{error}</div></div>
  }

  if (loading) {
    return <div className="loading">Loading seat map...</div>
  }

  // Group seats by row
  const seatsByRow = {}
  seats.forEach(seat => {
    if (!seatsByRow[seat.seat_row]) {
      seatsByRow[seat.seat_row] = []
    }
    seatsByRow[seat.seat_row].push(seat)
  })

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
          Select Seats
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 400 }}>Choose your preferred seats</p>
      </div>
      {trip && (
        <div className="card fade-in">
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '15px', fontSize: '1.5rem', fontWeight: 700 }}>{trip.from_city} → {trip.to_city}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '14px' }}><span style={{ color: 'var(--text-muted)' }}>Company:</span> <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{trip.company_name}</strong> - {trip.bus_type}</p>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '14px' }}><span style={{ color: 'var(--text-muted)' }}>Departure:</span> <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{new Date(trip.departure_datetime).toLocaleString()}</strong></p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}><span style={{ color: 'var(--text-muted)' }}>Fare per seat:</span> <span style={{ color: 'var(--primary-bright)', fontWeight: 600, fontSize: '16px' }}>PKR {trip.fare_pkr}</span></p>
        </div>
      )}

      <div className="card fade-in">
        <h2 style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          Select Your Seats
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
          Click on available seats to select them. Fill in passenger details below, then proceed to checkout.
        </p>
        <div style={{ marginBottom: '20px', color: 'var(--text-primary)', fontWeight: 600 }}>
          <span style={{ marginRight: '25px', display: 'inline-flex', alignItems: 'center' }}>
            <span className="seat-swatch available"></span>
            Available
          </span>
          <span style={{ marginRight: '25px', display: 'inline-flex', alignItems: 'center' }}>
            <span className="seat-swatch booked"></span>
            Booked
          </span>
          <span style={{ marginRight: '25px', display: 'inline-flex', alignItems: 'center' }}>
            <span className="seat-swatch selected"></span>
            Selected
          </span>
        </div>

        <div className="seat-map">
          {Object.keys(seatsByRow).sort((a, b) => Number(a) - Number(b) || a.localeCompare(b)).map(row => (
            <div key={row} className="seat-row">
              <span style={{ 
                minWidth: '30px', 
                fontWeight: 700, 
                color: 'var(--text-secondary)',
                fontSize: '14px'
              }}>
                Row {row}
              </span>
              {seatsByRow[row].map(seat => {
                const isSelected = selectedSeats.some(s => s.seat_id === seat.seat_id)
                const seatClass = seat.seat_status === 'Booked' 
                  ? 'seat booked' 
                  : isSelected 
                    ? 'seat selected' 
                    : 'seat available'
                return (
                  <button
                    key={seat.seat_id}
                    onClick={() => toggleSeat(seat)}
                    disabled={seat.seat_status === 'Booked'}
                    className={seatClass}
                    title={seat.seat_number}
                  >
                    {seat.seat_number}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        
      </div>

      {selectedSeats.length > 0 && (
        <div className="card fade-in">
          <h2 style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Enter Passenger Information
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
            Please provide details for {selectedSeats.length} {selectedSeats.length === 1 ? 'passenger' : 'passengers'}
          </p>
          {selectedSeats.map(seat => (
            <div key={seat.seat_id} style={{ marginBottom: '20px', padding: '20px', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'var(--surface-muted)' }}>
              <h3 style={{ color: 'var(--primary-light)', marginBottom: '20px', fontSize: '18px', fontWeight: 600 }}>
                Seat {seat.seat_number} - Passenger Information
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    placeholder="Enter passenger full name"
                    value={passengerData[seat.seat_id]?.name || ''}
                    onChange={(e) => handlePassengerDataChange(seat.seat_id, 'name', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select
                    value={passengerData[seat.seat_id]?.gender || ''}
                    onChange={(e) => handlePassengerDataChange(seat.seat_id, 'gender', e.target.value)}
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: '30px', padding: '20px', background: 'var(--accent-soft)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '5px' }}>Total Seats Selected</p>
                <p style={{ color: 'var(--text-primary)', fontSize: '24px', fontWeight: 700 }}>{selectedSeats.length}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '5px' }}>Total Amount</p>
                <p style={{ color: 'var(--primary-bright)', fontSize: '24px', fontWeight: 700 }}>
                  PKR {(selectedSeats.length * (trip?.fare_pkr || 0)).toLocaleString()}
                </p>
              </div>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={handleContinue}
              style={{ width: '100%', padding: '15px', fontSize: '16px', fontWeight: 600 }}
            >
              Proceed to Checkout →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default SeatSelection

