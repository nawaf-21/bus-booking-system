import { useState, useEffect } from 'react'
import api from '../../utils/api'

const AdminTrips = () => {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/trips')
      .then(res => {
        setTrips(res.data.trips)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading trips:', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="container">
      <h1>All Trips</h1>
      {trips.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            No trips found. Check backend terminal for errors.
          </p>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Route</th>
              <th>Company</th>
              <th>Bus</th>
              <th>Departure</th>
              <th>Arrival</th>
              <th>Fare (PKR)</th>
              <th>Status</th>
              <th>Occupancy</th>
            </tr>
          </thead>
          <tbody>
            {trips.map(trip => (
              <tr key={trip.trip_id}>
                <td>{trip.route_name}</td>
                <td>{trip.company_name}</td>
                <td>{trip.bus_name}</td>
                <td>{new Date(trip.departure_datetime).toLocaleString()}</td>
                <td>{new Date(trip.arrival_datetime).toLocaleString()}</td>
                <td>{trip.fare_pkr}</td>
                <td>{trip.trip_status}</td>
                <td>{trip.seats_booked || 0} / {trip.total_seats_available}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default AdminTrips

