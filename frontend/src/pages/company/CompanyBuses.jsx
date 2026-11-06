import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { useAuth } from '../../context/AuthContext'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'
import Alert from '../../components/Alert'

const CompanyBuses = () => {
  const [buses, setBuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedBus, setSelectedBus] = useState(null)
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    bus_model: '',
    bus_name: '',
    bus_type: '',
    total_seats: ''
  })
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: 'warning', title: '', message: '', onConfirm: null })
  const [alert, setAlert] = useState({ isOpen: false, message: '', type: 'info' })

  useEffect(() => {
    loadBuses()
  }, [])

  const loadBuses = () => {
    api.get('/company/buses')
      .then(res => {
        setBuses(res.data.buses)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading buses:', err)
        setLoading(false)
      })
  }

  const handleAdd = () => {
    setFormData({
      bus_model: '',
      bus_name: '',
      bus_type: '',
      total_seats: ''
    })
    setShowAddModal(true)
  }

  const handleEdit = (bus) => {
    setSelectedBus(bus)
    setFormData({
      bus_model: bus.bus_model || '',
      bus_name: bus.bus_name || '',
      bus_type: bus.bus_type || '',
      total_seats: bus.total_seats || ''
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
        await api.post('/buses', {
          ...formData,
          company_id: user.companyId
        })
        showAlert('Bus created successfully!', 'success')
      } else {
        await api.put(`/buses/${selectedBus.bus_id}`, formData)
        showAlert('Bus updated successfully!', 'success')
      }
      setShowAddModal(false)
      setShowEditModal(false)
      loadBuses()
    } catch (err) {
      showAlert(err.response?.data?.error || 'Operation failed', 'error')
    }
  }

  const handleDelete = (busId) => {
    setConfirmDialog({
      isOpen: true,
      type: 'warning',
      title: 'Deactivate Bus',
      message: 'Are you sure you want to deactivate this bus?',
      onConfirm: async () => {
        try {
          await api.delete(`/buses/${busId}`)
          showAlert('Bus deactivated successfully!', 'success')
          loadBuses()
        } catch (err) {
          showAlert(err.response?.data?.error || 'Failed to deactivate bus', 'error')
        }
      }
    })
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Bus Management</h1>
        <button className="btn btn-primary" onClick={handleAdd}>
          Add Bus
        </button>
      </div>

      <div className="card fade-in">
        {buses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: 'var(--text-secondary)' }}>No buses found</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Bus Name</th>
                <th>Model</th>
                <th>Type</th>
                <th>Total Seats</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {buses.map(bus => (
                <tr key={bus.bus_id}>
                  <td>{bus.bus_name || '-'}</td>
                  <td>{bus.bus_model || '-'}</td>
                  <td>{bus.bus_type}</td>
                  <td>{bus.total_seats}</td>
                  <td>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: bus.status === 'Active' ? 'var(--success)' : 'var(--danger)',
                      color: 'white'
                    }}>
                      {bus.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-sm" onClick={() => handleEdit(bus)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(bus.bus_id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal || showEditModal}
        onClose={() => {
          setShowAddModal(false)
          setShowEditModal(false)
        }}
        title={showAddModal ? 'Add Bus' : 'Edit Bus'}
        size="medium"
      >
        <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Bus Name *</label>
                <input
                  type="text"
                  value={formData.bus_name}
                  onChange={(e) => setFormData({ ...formData, bus_name: e.target.value })}
                  placeholder="e.g., Express-001"
                  required
                />
              </div>
              <div className="form-group">
                <label>Bus Model</label>
                <input
                  type="text"
                  value={formData.bus_model}
                  onChange={(e) => setFormData({ ...formData, bus_model: e.target.value })}
                  placeholder="e.g., Hino, Volvo"
                />
              </div>
              <div className="form-group">
                <label>Bus Type *</label>
                <select
                  value={formData.bus_type}
                  onChange={(e) => setFormData({ ...formData, bus_type: e.target.value })}
                  required
                >
                  <option value="">Select Type</option>
                  <option value="AC">AC</option>
                  <option value="Non-AC">Non-AC</option>
                  <option value="Sleeper">Sleeper</option>
                  <option value="Seater">Seater</option>
                </select>
              </div>
              <div className="form-group">
                <label>Total Seats *</label>
                <input
                  type="number"
                  value={formData.total_seats}
                  onChange={(e) => setFormData({ ...formData, total_seats: e.target.value })}
                  min="1"
                  max="60"
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

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
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

export default CompanyBuses

