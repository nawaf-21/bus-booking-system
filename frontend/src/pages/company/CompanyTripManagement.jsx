import { useState, useEffect } from 'react'
import api from '../../utils/api'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'
import Alert from '../../components/Alert'

// local time for datetime-local input
const toLocalInput = (value) => {
  const d = new Date(value)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const arrivalFor = (departure, route) => {
  if (!departure || !route || !route.approx_duration_min) return ''
  return toLocalInput(new Date(departure).getTime() + route.approx_duration_min * 60000)
}

// 270 -> "4h 30m"
const formatDuration = (minutes) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

const CompanyTripManagement = () => {
  const [trips, setTrips] = useState([])
  const [buses, setBuses] = useState([])
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [formData, setFormData] = useState({
    bus_id: '',
    route_id: '',
    departure_datetime: '',
    arrival_datetime: '',
    fare_pkr: ''
  })
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: 'warning', title: '', message: '', onConfirm: null })
  const [alert, setAlert] = useState({ isOpen: false, message: '', type: 'info' })

  useEffect(() => {
    loadTrips()
    loadBuses()
    loadRoutes()
  }, [])

  const loadTrips = () => {
    api.get('/company/trips')
      .then(res => {
        setTrips(res.data.trips)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading trips:', err)
        setLoading(false)
      })
  }

  // keep inactive buses too so edit can still show them
  const loadBuses = () => {
    api.get('/company/buses')
      .then(res => setBuses(res.data.buses))
      .catch(err => console.error('Error loading buses:', err))
  }

  const loadRoutes = () => {
    api.get('/company/routes')
      .then(res => setRoutes(res.data.routes))
      .catch(err => console.error('Error loading routes:', err))
  }

  const handleAdd = () => {
    setFormData({
      bus_id: '',
      route_id: '',
      departure_datetime: '',
      arrival_datetime: '',
      fare_pkr: ''
    })
    setShowAddModal(true)
  }

  const handleEdit = (trip) => {
    setSelectedTrip(trip)
    api.get(`/trips/${trip.trip_id}`)
      .then(res => {
        const tripData = res.data.trip || trip
        let routeId = tripData.route_id
        if (!routeId && trip.route_name) {
          const route = routes.find(r => trip.route_name.includes(r.from_city) && trip.route_name.includes(r.to_city))
          if (route) routeId = route.route_id
        }
        
        setFormData({
          bus_id: tripData.bus_id || trip.bus_id || '',
          route_id: routeId || '',
          departure_datetime: (tripData.departure_datetime || trip.departure_datetime) ? 
            toLocalInput(tripData.departure_datetime || trip.departure_datetime) : '',
          arrival_datetime: (tripData.arrival_datetime || trip.arrival_datetime) ? 
            toLocalInput(tripData.arrival_datetime || trip.arrival_datetime) : '',
          fare_pkr: tripData.fare_pkr || trip.fare_pkr || ''
        })
        setShowEditModal(true)
      })
      .catch(() => {
        const route = routes.find(r => trip.route_name && trip.route_name.includes(r.from_city))
        setFormData({
          bus_id: trip.bus_id || '',
          route_id: route?.route_id || '',
          departure_datetime: trip.departure_datetime ? toLocalInput(trip.departure_datetime) : '',
          arrival_datetime: trip.arrival_datetime ? toLocalInput(trip.arrival_datetime) : '',
          fare_pkr: trip.fare_pkr || ''
        })
        setShowEditModal(true)
      })
  }

  const showAlert = (message, type = 'info') => {
    setAlert({ isOpen: true, message, type })
    setTimeout(() => setAlert({ isOpen: false, message: '', type: 'info' }), 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (showAddModal) {
        await api.post('/trips', {
          ...formData,
          departure_datetime: new Date(formData.departure_datetime).toISOString(),
          arrival_datetime: new Date(formData.arrival_datetime).toISOString()
        })
        showAlert('Trip created successfully!', 'success')
      } else {
        // route and bus can't change on edit
        await api.put(`/trips/${selectedTrip.trip_id}`, {
          fare_pkr: formData.fare_pkr,
          departure_datetime: new Date(formData.departure_datetime).toISOString(),
          arrival_datetime: new Date(formData.arrival_datetime).toISOString()
        })
        showAlert('Trip updated successfully!', 'success')
      }
      setShowAddModal(false)
      setShowEditModal(false)
      loadTrips()
    } catch (err) {
      showAlert(err.response?.data?.error || 'Operation failed', 'error')
    }
  }

  const handleDelete = (tripId) => {
    setConfirmDialog({
      isOpen: true,
      type: 'warning',
      title: 'Cancel Trip',
      message: 'Cancel this trip? All bookings will be cancelled.',
      onConfirm: async () => {
        try {
          await api.delete(`/trips/${tripId}`)
          showAlert('Trip cancelled successfully!', 'success')
          loadTrips()
        } catch (err) {
          showAlert(err.response?.data?.error || 'Failed to cancel trip', 'error')
        }
      }
    })
  }

  // passengers can rate completed trips
  const handleComplete = (trip) => {
    setConfirmDialog({
      isOpen: true,
      type: 'info',
      title: 'Mark Trip Completed',
      message: `Mark ${trip.route_name} on ${new Date(trip.departure_datetime).toLocaleString()} as completed? Its passengers can then rate the trip, and it can no longer be edited or cancelled.`,
      onConfirm: async () => {
        try {
          await api.put(`/trips/${trip.trip_id}`, { status: 'Completed' })
          showAlert('Trip marked as completed', 'success')
          loadTrips()
        } catch (err) {
          showAlert(err.response?.data?.error || 'Failed to update trip', 'error')
        }
      }
    })
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  const selectedRoute = routes.find(r => String(r.route_id) === String(formData.route_id))

  // use the route base fare unless they typed their own
  const handleRouteChange = (routeId) => {
    const oldRoute = routes.find(r => String(r.route_id) === String(formData.route_id))
    const newRoute = routes.find(r => String(r.route_id) === String(routeId))
    const fareUntouched = formData.fare_pkr === '' || (oldRoute && Number(formData.fare_pkr) === Number(oldRoute.base_fare_pkr))
    setFormData({
      ...formData,
      route_id: routeId,
      fare_pkr: newRoute && fareUntouched ? String(newRoute.base_fare_pkr) : formData.fare_pkr,
      arrival_datetime: arrivalUntouched() ? arrivalFor(formData.departure_datetime, newRoute) : formData.arrival_datetime
    })
  }

  // empty or still our auto value = can be refilled
  const arrivalUntouched = () =>
    formData.arrival_datetime === '' ||
    formData.arrival_datetime === arrivalFor(formData.departure_datetime, selectedRoute)

  const handleDepartureChange = (departure) => {
    setFormData({
      ...formData,
      departure_datetime: departure,
      arrival_datetime: arrivalUntouched() ? arrivalFor(departure, selectedRoute) : formData.arrival_datetime
    })
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Trip Management</h1>
        <button className="btn btn-primary" onClick={handleAdd}>
          Add Trip
        </button>
      </div>

      <div className="card fade-in">
        {trips.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: 'var(--text-secondary)' }}>No trips found</p>
          </div>
        ) : (
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {trips.map(trip => (
                <tr key={trip.trip_id}>
                  <td>{trip.route_name}</td>
                  <td>{trip.bus_name || '-'}</td>
                  <td>{new Date(trip.departure_datetime).toLocaleString()}</td>
                  <td>{new Date(trip.arrival_datetime).toLocaleString()}</td>
                  <td>PKR {parseFloat(trip.fare_pkr || 0).toLocaleString()}</td>
                  <td>{trip.trip_status}</td>
                  <td>{trip.booked_seats || 0} / {trip.total_seats || 0}</td>
                  <td>
                    {trip.trip_status === 'Scheduled' ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-sm" onClick={() => handleEdit(trip)}>Edit</button>
                        <button className="btn btn-sm btn-success" onClick={() => handleComplete(trip)}>Complete</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(trip.trip_id)}>
                          Cancel
                        </button>
                      </div>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        isOpen={showAddModal || showEditModal}
        onClose={() => {
          setShowAddModal(false)
          setShowEditModal(false)
        }}
        title={showAddModal ? 'Add Trip' : 'Edit Trip'}
        size="large"
      >
        <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Route *</label>
                <select
                  value={formData.route_id}
                  onChange={(e) => handleRouteChange(e.target.value)}
                  disabled={showEditModal}
                  required
                >
                  <option value="">Select Route</option>
                  {routes.map(route => (
                    <option key={route.route_id} value={route.route_id}>
                      {route.from_city} → {route.to_city} (base fare PKR {parseFloat(route.base_fare_pkr || 0).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Bus *</label>
                <select
                  value={formData.bus_id}
                  onChange={(e) => setFormData({ ...formData, bus_id: e.target.value })}
                  disabled={showEditModal}
                  required
                >
                  <option value="">Select Bus</option>
                  {buses
                    .filter(bus => showEditModal ? String(bus.bus_id) === String(formData.bus_id) : bus.status === 'Active')
                    .map(bus => (
                      <option key={bus.bus_id} value={bus.bus_id}>
                        {bus.bus_name || bus.bus_model} - {bus.bus_type} ({bus.total_seats} seats)
                        {bus.status !== 'Active' ? ` [${bus.status}]` : ''}
                      </option>
                    ))}
                </select>
                {showEditModal && (
                  <small style={{ color: 'var(--text-secondary)' }}>
                    Route and bus cannot be changed. Cancel this trip and add a new one instead.
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>Departure Date & Time *</label>
                <input
                  type="datetime-local"
                  value={formData.departure_datetime}
                  onChange={(e) => handleDepartureChange(e.target.value)}
                  min={toLocalInput(new Date())}
                  required
                />
              </div>
              <div className="form-group">
                <label>Arrival Date & Time *</label>
                <input
                  type="datetime-local"
                  value={formData.arrival_datetime}
                  onChange={(e) => setFormData({ ...formData, arrival_datetime: e.target.value })}
                  min={formData.departure_datetime || toLocalInput(new Date())}
                  required
                />
                {selectedRoute?.approx_duration_min > 0 && (
                  <small style={{ color: 'var(--text-secondary)' }}>
                    Filled in from the route's usual journey time ({formatDuration(selectedRoute.approx_duration_min)}). You can change it.
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>Fare per Seat (PKR) *</label>
                <input
                  type="number"
                  value={formData.fare_pkr}
                  onChange={(e) => setFormData({ ...formData, fare_pkr: e.target.value })}
                  min="1"
                  step="0.01"
                  required
                />
                <small style={{ color: 'var(--text-secondary)' }}>
                  {selectedRoute
                    ? `This route's base fare is PKR ${parseFloat(selectedRoute.base_fare_pkr || 0).toLocaleString()}. You can charge more or less for this trip (for example a Sleeper bus or a busy date).`
                    : 'Pick a route first. Its base fare is filled in here, and you can change it for this trip.'}
                </small>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary">Save</button>
                <button type="button" className="btn" onClick={() => {
                  setShowAddModal(false)
                  setShowEditModal(false)
                }}>Cancel</button>
              </div>
            </form>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
      />

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

export default CompanyTripManagement

