import React, { useState, useEffect } from 'react'

const Alert = ({ message, type = 'info', duration = 3000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        if (onClose) onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  if (!isVisible) return null

  const colors = {
    success: { bg: 'var(--success)', icon: '✅' },
    error: { bg: 'var(--danger)', icon: '❌' },
    warning: { bg: 'var(--warning)', icon: '⚠️' },
    info: { bg: 'var(--primary)', icon: 'ℹ️' }
  }

  const color = colors[type] || colors.info

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: color.bg,
        color: 'white',
        padding: '15px 20px',
        borderRadius: '8px',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 10001,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        minWidth: '300px',
        maxWidth: '500px',
        animation: 'slideIn 0.3s ease-out'
      }}
    >
      <span style={{ fontSize: '20px' }}>{color.icon}</span>
      <span style={{ flex: 1, fontWeight: '500' }}>{message}</span>
      <button
        onClick={() => {
          setIsVisible(false)
          if (onClose) onClose()
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'white',
          fontSize: '20px',
          cursor: 'pointer',
          padding: '0',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          transition: 'background 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
        onMouseLeave={(e) => e.target.style.background = 'transparent'}
      >
        ×
      </button>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

export default Alert

