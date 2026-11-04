import React from 'react'

const Modal = ({ isOpen, onClose, title, children, size = 'medium' }) => {
  if (!isOpen) return null

  const sizeClasses = {
    small: { maxWidth: '400px' },
    medium: { maxWidth: '600px' },
    large: { maxWidth: '800px' }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(28, 28, 26, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        className="card fade-in"
        style={{
          ...sizeClasses[size],
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative',
          background: 'var(--surface)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-xl)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            paddingBottom: '15px',
            borderBottom: '1px solid var(--border-color)'
          }}>
            <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>{title}</h2>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                padding: '0',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'var(--danger)'
                e.target.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent'
                e.target.style.color = 'var(--text-secondary)'
              }}
            >
              ×
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export default Modal

