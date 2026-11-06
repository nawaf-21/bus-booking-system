import { useState, useEffect } from 'react'
import api from '../../utils/api'
import Modal from '../../components/Modal'
import Alert from '../../components/Alert'

const CompanyRoutes = () => {
  const [routes, setRoutes] = useState([])
  const [cities, setCities] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [formData, setFormData] = useState({
    from_city_id: '',
    to_city_id: '',
    distance_km: '',
    approx_duration_min: '',
    base_fare_pkr: ''
  })
  const [alert, setAlert] = useState({ isOpen: false, message: '', type: 'info' })

  useEffect(() => {
    loadRoutes()
    api.get('/cities').then(res => setCities(res.data.cities)).catch(() => {})
  }, [])

  const loadRoutes = () => {
    api.get('/company/routes')
      .then(res => {
        setRoutes(res.data.routes)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading routes:', err)
        setLoading(false)
      })
  }

  const handleAdd = () => {
    setFormData({
      from_city_id: '',
      to_city_id: '',
      distance_km: '',
      approx_duration_min: '',
      base_fare_pkr: ''
    })
    setShowAddModal(true)
  }

  const handleEdit = (route) => {
    setSelectedRoute(route)
    setFormData({
      from_city_id: route.from_city_id,
      to_city_id: route.to_city_id,
      distance_km: route.distance_km,
      approx_duration_min: route.approx_duration_min,
      base_fare_pkr: route.base_fare_pkr
    })
    setShowEditModal(true)
  }

  const showAlert = (message, type = 'info') => {
    setAlert({ isOpen: true, message, type })
    setTimeout(() => setAlert({ isOpen: false, message: '', type: 'info' }), 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (showAddModal) {
        await api.post('/routes', formData)
        showAlert('Route created successfully!', 'success')
      } else {
        await api.put(`/routes/${selectedRoute.route_id}`, formData)
        showAlert('Route updated successfully!', 'success')
      }
      setShowAddModal(false)
      setShowEditModal(false)
      loadRoutes()
    } catch (err) {
      showAlert(err.response?.data?.error || 'Operation failed', 'error')
    }
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Route Management</h1>
        <button className="btn btn-primary" onClick={handleAdd}>
          Add Route
        </button>
      </div>

      <div className="card fade-in">
        <table>
          <thead>
            <tr>
              <th>From</th>
              <th>To</th>
              <th>Distance (km)</th>
              <th>Duration (min)</th>
              <th>Base Fare (PKR)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {routes.map(route => (
              <tr key={route.route_id}>
                <td>{route.from_city}</td>
                <td>{route.to_city}</td>
                <td>{route.distance_km || '-'}</td>
                <td>{route.approx_duration_min || '-'}</td>
                <td>PKR {parseFloat(route.base_fare_pkr || 0).toLocaleString()}</td>
                <td>
                  <button className="btn btn-sm" onClick={() => handleEdit(route)}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal || showEditModal}
        onClose={() => {
          setShowAddModal(false)
          setShowEditModal(false)
        }}
        title={showAddModal ? 'Add Route' : 'Edit Route'}
        size="medium"
      >
        <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>From City *</label>
                <select
                  value={formData.from_city_id}
                  onChange={(e) => setFormData({ ...formData, from_city_id: e.target.value })}
                  required
                >
                  <option value="">Select City</option>
                  {cities.map(city => (
                    <option key={city.city_id} value={city.city_id}>{city.city_name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>To City *</label>
                <select
                  value={formData.to_city_id}
                  onChange={(e) => setFormData({ ...formData, to_city_id: e.target.value })}
                  required
                >
                  <option value="">Select City</option>
                  {cities.filter(c => c.city_id !== parseInt(formData.from_city_id)).map(city => (
                    <option key={city.city_id} value={city.city_id}>{city.city_name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Distance (km)</label>
                <input
                  type="number"
                  value={formData.distance_km}
                  onChange={(e) => setFormData({ ...formData, distance_km: e.target.value })}
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="form-group">
                <label>Duration (minutes)</label>
                <input
                  type="number"
                  value={formData.approx_duration_min}
                  onChange={(e) => setFormData({ ...formData, approx_duration_min: e.target.value })}
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Base Fare (PKR) *</label>
                <input
                  type="number"
                  value={formData.base_fare_pkr}
                  onChange={(e) => setFormData({ ...formData, base_fare_pkr: e.target.value })}
                  min="0"
                  step="0.01"
                  required
                />
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

export default CompanyRoutes

