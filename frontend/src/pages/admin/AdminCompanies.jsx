import { useState, useEffect } from 'react'
import api from '../../utils/api'
import ConfirmDialog from '../../components/ConfirmDialog'
import Alert from '../../components/Alert'
import Modal from '../../components/Modal'

const AdminCompanies = () => {
  const [companies, setCompanies] = useState([])
  const [cities, setCities] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: 'danger', title: '', message: '', onConfirm: null })
  const [alert, setAlert] = useState({ isOpen: false, message: '', type: 'info' })
  const [formData, setFormData] = useState({
    company_name: '',
    contact_email: '',
    contact_phone: '',
    office_city_id: '',
    logo_url: ''
  })

  useEffect(() => {
    loadCompanies()
    api.get('/cities').then(res => setCities(res.data.cities)).catch(() => {})
  }, [])

  const loadCompanies = () => {
    api.get('/companies')
      .then(res => {
        setCompanies(res.data.companies)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading companies:', err)
        setLoading(false)
      })
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  const showAlert = (message, type = 'info') => {
    setAlert({ isOpen: true, message, type })
    setTimeout(() => setAlert({ isOpen: false, message: '', type: 'info' }), 3000)
  }

  const handleAdd = () => {
    setFormData({
      company_name: '',
      contact_email: '',
      contact_phone: '',
      office_city_id: '',
      logo_url: ''
    })
    setShowAddModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/companies', formData)
      showAlert('Company created successfully! You can now add a manager user from the Users page.', 'success')
      setShowAddModal(false)
      loadCompanies()
    } catch (err) {
      console.error('Create company error:', err)
      const errorMessage = err.response?.data?.details || err.response?.data?.message || err.response?.data?.error || 'Failed to create company'
      showAlert(errorMessage, 'error')
    }
  }

  const handleDelete = (companyId) => {
    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: 'PERMANENTLY DELETE COMPANY',
      message: 'This will PERMANENTLY delete the company and ALL its buses and seats!\n\nThis action CANNOT be undone. All data will be lost forever.\n\nAre you absolutely certain?',
      confirmText: 'Yes, Delete Everything',
      onConfirm: async () => {
        try {
          await api.delete(`/companies/${companyId}?hardDelete=true`)
          showAlert('Company and all associated data deleted successfully!', 'success')
          loadCompanies()
        } catch (err) {
          // e.g. 409 when the company still has trips or users
          showAlert(err.response?.data?.error || 'Failed to delete company', 'error')
        }
      }
    })
  }

  // Suspend an active company, or make a suspended/inactive one active again
  const handleToggleStatus = (company) => {
    const newStatus = company.status === 'Active' ? 'Suspended' : 'Active'
    setConfirmDialog({
      isOpen: true,
      type: 'warning',
      title: newStatus === 'Suspended' ? 'Suspend Company' : 'Activate Company',
      message: newStatus === 'Suspended'
        ? `Suspend ${company.company_name}? Its trips will no longer show in search.`
        : `Make ${company.company_name} active again?`,
      confirmText: newStatus === 'Suspended' ? 'Suspend' : 'Activate',
      onConfirm: async () => {
        try {
          await api.put(`/companies/${company.company_id}`, { status: newStatus })
          showAlert(`Company ${newStatus === 'Suspended' ? 'suspended' : 'activated'} successfully!`, 'success')
          loadCompanies()
        } catch (err) {
          showAlert(err.response?.data?.error || 'Failed to update company', 'error')
        }
      }
    })
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Manage Bus Companies</h1>
        <button className="btn btn-primary" onClick={handleAdd}>
          Add Company
        </button>
      </div>
      {companies.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            No companies found. Check backend terminal for errors.
          </p>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Company Name</th>
              <th>Contact Email</th>
              <th>Contact Phone</th>
              <th>Office City</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map(company => (
              <tr key={company.company_id}>
                <td>{company.company_name}</td>
                <td>{company.contact_email}</td>
                <td>{company.contact_phone}</td>
                <td>{company.office_city}</td>
                <td>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: company.status === 'Active' ? 'var(--success)' : 'var(--danger)',
                    color: 'white'
                  }}>
                    {company.status}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-sm"
                      onClick={() => handleToggleStatus(company)}
                    >
                      {company.status === 'Active' ? 'Suspend' : 'Activate'}
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(company.company_id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

      {/* Add Company Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Bus Company"
        size="medium"
      >
        <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Company Name *</label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="e.g., Faisal Movers"
                required
              />
            </div>
            <div className="form-group">
              <label>Contact Email *</label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="contact@company.com"
                required
              />
            </div>
            <div className="form-group">
              <label>Contact Phone *</label>
              <input
                type="text"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="+92-300-1234567"
                required
              />
            </div>
            <div className="form-group">
              <label>Office City *</label>
              <select
                value={formData.office_city_id}
                onChange={(e) => setFormData({ ...formData, office_city_id: e.target.value })}
                required
              >
                <option value="">Select City</option>
                {cities.map(city => (
                  <option key={city.city_id} value={city.city_id}>{city.city_name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Logo URL (optional)</label>
              <input
                type="url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                placeholder="https://example.com/logo.png"
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" className="btn btn-primary">Create Company</button>
              <button type="button" className="btn" onClick={() => setShowAddModal(false)}>Cancel</button>
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

export default AdminCompanies

