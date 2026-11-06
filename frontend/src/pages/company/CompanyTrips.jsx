import { useState, useEffect } from 'react'
import api from '../../utils/api'

const CompanyTrips = () => {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/company/trips')
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
      <h1>My Company Trips</h1>
      <table>
        <thead>
          <tr>
            <th>Route</th>
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
              <td>{trip.bus_name}</td>
              <td>{new Date(trip.departure_datetime).toLocaleString()}</td>
              <td>{new Date(trip.arrival_datetime).toLocaleString()}</td>
              <td>{trip.fare_pkr}</td>
              <td>{trip.trip_status}</td>
              <td>{trip.booked_seats} / {trip.total_seats}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default CompanyTrips

