import { useState, useEffect } from 'react'
import api, { getErrorMessage } from '../../utils/api'
import ConfirmDialog from '../../components/ConfirmDialog'
import Alert from '../../components/Alert'
import Modal from '../../components/Modal'

// A date as YYYY-MM-DD in local time (what a date input needs)
const toDateInput = (value) => new Date(value).toLocaleDateString('en-CA')

const emptyForm = () => {
  const inAMonth = new Date()
  inAMonth.setDate(inAMonth.getDate() + 30)
  return {
    code: '',
    description: '',
    discount_type: 'Percentage',
    discount_value: '',
    valid_from: toDateInput(new Date()),
    valid_to: toDateInput(inAMonth),
    max_uses: '',
    applicable_route_id: '',
    applicable_company_id: ''
  }
}

const AdminPromoCodes = () => {
  const [promoCodes, setPromoCodes] = useState([])
  const [routes, setRoutes] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editPromo, setEditPromo] = useState(null) // the code being edited, or null
  const [formData, setFormData] = useState(emptyForm())
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null })
  const [alert, setAlert] = useState({ isOpen: false, message: '', type: 'info' })

  useEffect(() => {
    loadPromoCodes()
    api.get('/routes').then(res => setRoutes(res.data.routes)).catch(() => {})
    api.get('/companies').then(res => setCompanies(res.data.companies)).catch(() => {})
  }, [])

  const loadPromoCodes = () => {
    api.get('/promocodes')
      .then(res => setPromoCodes(res.data.promoCodes))
      .catch(err => setError(getErrorMessage(err, 'Could not load promo codes.')))
      .finally(() => setLoading(false))
  }

  const showAlert = (message, type = 'info') => {
    setAlert({ isOpen: true, message, type })
  }

  // Active, Expired, Not started, Used up or Off - worked out from the dates and counts
  const statusOf = (promo) => {
    const now = new Date()
    if (!promo.is_active) return 'Off'
    if (new Date(promo.valid_to) < now) return 'Expired'
    if (new Date(promo.valid_from) > now) return 'Not started'
    if (promo.max_uses && promo.used_count >= promo.max_uses) return 'Used up'
    return 'Active'
  }

  const handleAdd = () => {
    setFormData(emptyForm())
    setShowAddModal(true)
  }

  const handleEdit = (promo) => {
    setFormData({
      ...emptyForm(),
      code: promo.code,
      description: promo.description || '',
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      valid_from: toDateInput(promo.valid_from),
      valid_to: toDateInput(promo.valid_to),
      max_uses: promo.max_uses || ''
    })
    setEditPromo(promo)
  }

  const closeModal = () => {
    setShowAddModal(false)
    setEditPromo(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // The code stays valid until the end of its last day
    const validTo = `${formData.valid_to}T23:59:59`
    try {
      if (editPromo) {
        // The code, type, route and company can't change; only these fields
        await api.put(`/promocodes/${editPromo.promo_id}`, {
          description: formData.description,
          discount_value: formData.discount_value,
          valid_from: formData.valid_from,
          valid_to: validTo,
          max_uses: formData.max_uses
        })
        showAlert('Promo code updated', 'success')
      } else {
        await api.post('/promocodes', { ...formData, valid_to: validTo })
        showAlert('Promo code created', 'success')
      }
      closeModal()
      loadPromoCodes()
    } catch (err) {
      showAlert(getErrorMessage(err, 'Could not save the promo code'), 'error')
    }
  }

  const handleToggle = (promo) => {
    const turnOn = !promo.is_active
    setConfirmDialog({
      isOpen: true,
      type: 'warning',
      title: turnOn ? 'Turn On Promo Code' : 'Turn Off Promo Code',
      message: turnOn
        ? `Let passengers use ${promo.code} again?`
        : `Stop passengers using ${promo.code}? Old bookings keep their discount.`,
      confirmText: turnOn ? 'Turn On' : 'Turn Off',
      onConfirm: async () => {
        try {
          await api.put(`/promocodes/${promo.promo_id}`, { is_active: turnOn })
          showAlert(`${promo.code} turned ${turnOn ? 'on' : 'off'}`, 'success')
          loadPromoCodes()
        } catch (err) {
          showAlert(getErrorMessage(err, 'Could not update the promo code'), 'error')
        }
      }
    })
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  const statusColors = {
    Active: 'var(--success)',
    'Not started': 'var(--warning)',
    Expired: 'var(--text-muted)',
    'Used up': 'var(--text-muted)',
    Off: 'var(--danger)'
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Promo Codes</h1>
        <button className="btn btn-primary" onClick={handleAdd}>
          Add Promo Code
        </button>
      </div>
      {error && <div className="error">{error}</div>}

      {promoCodes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No promo codes yet.</p>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Discount</th>
              <th>Applies to</th>
              <th>Valid</th>
              <th>Used</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {promoCodes.map(promo => {
              const status = statusOf(promo)
              return (
                <tr key={promo.promo_id}>
                  <td>
                    <strong>{promo.code}</strong>
                    {promo.description && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{promo.description}</div>
                    )}
                  </td>
                  <td>
                    {promo.discount_type === 'Percentage'
                      ? `${Number(promo.discount_value)}%`
                      : `PKR ${Number(promo.discount_value).toLocaleString()}`}
                  </td>
                  <td>{promo.route_name || promo.company_name || 'All trips'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {new Date(promo.valid_from).toLocaleDateString()} to {new Date(promo.valid_to).toLocaleDateString()}
                  </td>
                  <td>{promo.used_count} / {promo.max_uses || 'no limit'}</td>
                  <td>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: statusColors[status],
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>
                      {status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-sm" onClick={() => handleEdit(promo)}>Edit</button>
                      <button
                        className={`btn btn-sm ${promo.is_active ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => handleToggle(promo)}
                      >
                        {promo.is_active ? 'Turn Off' : 'Turn On'}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        confirmText={confirmDialog.confirmText || 'Confirm'}
      />

      <Modal
        isOpen={showAddModal || editPromo !== null}
        onClose={closeModal}
        title={editPromo ? `Edit ${editPromo.code}` : 'Add Promo Code'}
        size="medium"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Code *</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g. EID25"
              pattern="[A-Za-z0-9]{3,20}"
              title="3 to 20 letters or numbers, no spaces"
              disabled={editPromo !== null}
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. 25% off for Eid"
              maxLength={255}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label>Discount Type *</label>
              <select
                value={formData.discount_type}
                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                disabled={editPromo !== null}
              >
                <option value="Percentage">Percentage (%)</option>
                <option value="Fixed">Fixed amount (PKR)</option>
              </select>
            </div>
            <div className="form-group">
              <label>{formData.discount_type === 'Percentage' ? 'Discount (%) *' : 'Discount (PKR) *'}</label>
              <input
                type="number"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                min="1"
                max={formData.discount_type === 'Percentage' ? 100 : undefined}
                required
              />
            </div>
            <div className="form-group">
              <label>Valid From *</label>
              <input
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Valid To *</label>
              <input
                type="date"
                value={formData.valid_to}
                onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                min={formData.valid_from}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label>Max Uses</label>
            <input
              type="number"
              value={formData.max_uses}
              onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
              min="1"
              placeholder="Leave empty for no limit"
            />
          </div>
          {!editPromo && (
            <>
              <div className="form-group">
                <label>Only for this route (optional)</label>
                <select
                  value={formData.applicable_route_id}
                  onChange={(e) => setFormData({ ...formData, applicable_route_id: e.target.value })}
                >
                  <option value="">Any route</option>
                  {routes.map(route => (
                    <option key={route.route_id} value={route.route_id}>
                      {route.from_city} → {route.to_city}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Only for this company (optional)</label>
                <select
                  value={formData.applicable_company_id}
                  onChange={(e) => setFormData({ ...formData, applicable_company_id: e.target.value })}
                >
                  <option value="">Any company</option>
                  {companies.map(company => (
                    <option key={company.company_id} value={company.company_id}>
                      {company.company_name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          {editPromo && (
            <small style={{ color: 'var(--text-secondary)' }}>
              The code, discount type, route and company can't be changed. Turn this code off and add a new one instead.
            </small>
          )}
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary">{editPromo ? 'Save Changes' : 'Create Promo Code'}</button>
            <button type="button" className="btn" onClick={closeModal}>Cancel</button>
          </div>
        </form>
      </Modal>

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

export default AdminPromoCodes
