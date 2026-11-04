import React from 'react'
import Modal from './Modal'

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'warning' }) => {
  if (!isOpen) return null

  const colors = {
    warning: { bg: 'var(--warning)', text: 'white' },
    danger: { bg: 'var(--danger)', text: 'white' },
    info: { bg: 'var(--primary)', text: 'white' },
    success: { bg: 'var(--success)', text: 'white' }
  }

  const color = colors[type] || colors.warning

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="small">
      <div style={{ padding: '20px 0' }}>
        <p style={{ 
          color: 'var(--text-primary)', 
          fontSize: '16px', 
          lineHeight: '1.6',
          marginBottom: '30px',
          whiteSpace: 'pre-line'
        }}>
          {message}
        </p>
        <div style={{ 
          display: 'flex', 
          gap: '15px', 
          justifyContent: 'flex-end',
          marginTop: '30px'
        }}>
          <button
            className="btn"
            onClick={onClose}
            style={{
              background: 'var(--surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--surface)'
            }}
          >
            {cancelText}
          </button>
          <button
            className="btn"
            onClick={() => {
              onConfirm()
              onClose()
            }}
            style={{
              background: color.bg,
              color: color.text,
              border: 'none',
              fontWeight: '600'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default ConfirmDialog

