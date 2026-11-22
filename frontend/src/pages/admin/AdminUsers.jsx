import { useState, useEffect } from 'react'
import api from '../../utils/api'
import Modal from '../../components/Modal'
import { PASSWORD_RULES, passwordIsValid } from '../../utils/password'
import ConfirmDialog from '../../components/ConfirmDialog'
import Alert from '../../components/Alert'

const AdminUsers = () => {
  const [users, setUsers] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: 'warning', title: '', message: '', onConfirm: null })
  const [alert, setAlert] = useState({ isOpen: false, message: '', type: 'info' })
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    gender: '',
    phone_no: '',
    role: 'Passenger',
    company_id: ''
  })

  useEffect(() => {
    loadUsers()
    api.get('/companies').then(res => setCompanies(res.data.companies)).catch(() => {})
  }, [])

  const loadUsers = () => {
    api.get('/users')
      .then(res => {
        setUsers(res.data.users)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading users:', err)
        setLoading(false)
      })
  }

  const handleAdd = () => {
    setFormData({
      full_name: '',
      email: '',
      password: '',
      gender: '',
      phone_no: '',
      role: 'Passenger',
      company_id: ''
    })
    setShowAddModal(true)
  }

  const handleEdit = (user) => {
    setSelectedUser(user)
    setFormData({
      full_name: user.full_name,
      email: user.email,
      password: '',
      gender: user.gender || '',
      phone_no: user.phone_no,
      role: user.role,
      company_id: user.company_id || ''
    })
    setShowEditModal(true)
  }

  const showAlert = (message, type = 'info') => {
    setAlert({ isOpen: true, message, type })
    setTimeout(() => setAlert({ isOpen: false, message: '', type: 'info' }), 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // empty password on edit keeps the old one
    if ((showAddModal || formData.password) && !passwordIsValid(formData.password)) {
      showAlert('The password must be at least 8 characters, with at least one letter and one number', 'error')
      return
    }
    try {
      // only bus company users keep a company
      const submitData = {
        ...formData,
        company_id: formData.role === 'BusCompany' && formData.company_id ? parseInt(formData.company_id) : null,
        gender: formData.role === 'Passenger' ? formData.gender : undefined
      }
      
      if (showAddModal) {
        await api.post('/users', submitData)
        showAlert('User created successfully!', 'success')
      } else {
        await api.put(`/users/${selectedUser.user_id}`, submitData)
        showAlert('User updated successfully!', 'success')
      }
      setShowAddModal(false)
      setShowEditModal(false)
      loadUsers()
    } catch (err) {
      console.error('User creation error:', err)
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Operation failed'
      showAlert(errorMsg, 'error')
    }
  }

  const handleToggleActive = (user) => {
    const isActivating = !user.is_active
    setConfirmDialog({
      isOpen: true,
      type: isActivating ? 'info' : 'warning',
      title: isActivating ? 'Activate User' : 'Deactivate User',
      message: isActivating 
        ? 'Are you sure you want to activate this user?'
        : 'Are you sure you want to deactivate this user?',
      onConfirm: async () => {
        try {
          await api.put(`/users/${user.user_id}`, { is_active: isActivating })
          showAlert(`User ${isActivating ? 'activated' : 'deactivated'} successfully!`, 'success')
          loadUsers()
        } catch (err) {
          showAlert(err.response?.data?.error || `Failed to ${isActivating ? 'activate' : 'deactivate'} user`, 'error')
        }
      }
    })
  }

  const handleDelete = (userId) => {
    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: 'Permanently Delete User',
      message: 'WARNING: This will permanently delete this user and all their data (bookings, feedback, etc.)!\n\nThis action CANNOT be undone!\n\nAre you absolutely sure?',
      confirmText: 'Yes, Delete',
      onConfirm: async () => {
        try {
          const response = await api.delete(`/users/${userId}?hardDelete=true`)
          showAlert(response.data?.message || 'User deleted successfully!', 'success')
          loadUsers()
        } catch (err) {
          const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to delete user'
          showAlert(errorMsg, 'error')
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
        <h1>User Management</h1>
        <button className="btn btn-primary" onClick={handleAdd}>
          Add User
        </button>
      </div>

      <div className="card fade-in">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Company</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.user_id}>
                <td>{user.full_name}</td>
                <td>{user.email}</td>
                <td>{user.phone_no}</td>
                <td>{user.role}</td>
                <td>{user.company_name || '-'}</td>
                <td>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: user.is_active ? 'var(--success)' : 'var(--danger)',
                    color: 'white'
                  }}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-sm" onClick={() => handleEdit(user)}>Edit</button>
                    <button 
                      className={`btn btn-sm ${user.is_active ? 'btn-warning' : 'btn-success'}`}
                      onClick={() => handleToggleActive(user)}
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(user.user_id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showAddModal || showEditModal}
        onClose={() => {
          setShowAddModal(false)
          setShowEditModal(false)
        }}
        title={showAddModal ? 'Add User' : 'Edit User'}
        size="medium"
      >
        <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={showEditModal}
                />
              </div>
              <div className="form-group">
                <label>{showAddModal ? 'Password *' : 'New Password (leave blank to keep current)'}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={showAddModal}
                  maxLength={64}
                />
                <small style={{ color: 'var(--text-secondary)' }}>
                  {PASSWORD_RULES.map(rule => rule.label.toLowerCase()).join(', ')}
                </small>
              </div>
              <div className="form-group">
                <label>Phone *</label>
                <input
                  type="text"
                  value={formData.phone_no}
                  onChange={(e) => setFormData({ ...formData, phone_no: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value, company_id: e.target.value === 'BusCompany' ? formData.company_id : '' })}
                  required
                >
                  <option value="Passenger">Passenger</option>
                  <option value="BusCompany">Bus Company</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              {formData.role === 'Passenger' && (
                <div className="form-group">
                  <label>Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    required
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              )}
              {formData.role === 'BusCompany' && (
                <div className="form-group">
                  <label>Company *</label>
                  <select
                    value={formData.company_id}
                    onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                    required
                  >
                    <option value="">Select Company</option>
                    {companies.map(comp => (
                      <option key={comp.company_id} value={comp.company_id}>{comp.company_name}</option>
                    ))}
                  </select>
                </div>
              )}
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
        confirmText={confirmDialog.confirmText || 'Confirm'}
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

export default AdminUsers

