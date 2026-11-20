import { useRef } from 'react'

const Invoice = ({ booking, onClose }) => {
  const invoiceRef = useRef(null)

  const generatePDF = async () => {
    // The PDF libraries are large, so they are only loaded when needed
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf')
    ])
    const element = invoiceRef.current
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    })
    
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const imgWidth = 210
    const pageHeight = 297
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight
    let position = 0

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    pdf.save(`Invoice-${booking.invoice_number || booking.booking_id}.pdf`)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toLocaleString('en-PK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(28, 28, 26, 0.45)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      overflow: 'auto'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative'
      }}>
        {/* Action Buttons */}
        <div style={{
          position: 'sticky',
          top: 0,
          backgroundColor: '#f8f9fa',
          padding: '15px 20px',
          borderBottom: '2px solid #e9ecef',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10
        }}>
          <h2 style={{ margin: 0, color: '#212529', fontSize: '20px', fontWeight: 600 }}>
            Invoice
          </h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={generatePDF}
              style={{
                padding: '10px 20px',
                backgroundColor: '#1f7a5a',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#18614a'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#1f7a5a'}
            >
              Download PDF
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px'
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div ref={invoiceRef} style={{
          padding: '40px',
          backgroundColor: '#ffffff',
          color: '#212529',
          fontFamily: 'Arial, sans-serif'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '40px',
            paddingBottom: '20px',
            borderBottom: '3px solid #1f7a5a'
          }}>
            <div>
              <h1 style={{
                margin: 0,
                fontSize: '32px',
                fontWeight: 800,
                color: '#1f7a5a',
                letterSpacing: '-0.02em'
              }}>
                Musafir
              </h1>
              <p style={{ margin: '5px 0 0 0', color: '#6c757d', fontSize: '14px' }}>
                Bus Booking System
              </p>
              <p style={{ margin: '10px 0 0 0', color: '#495057', fontSize: '13px' }}>
                Email: support@tbs.com
              </p>
              <p style={{ margin: '5px 0 0 0', color: '#495057', fontSize: '13px' }}>
                Phone: +92-300-1234567
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 700,
                color: '#212529',
                marginBottom: '10px'
              }}>
                INVOICE
              </h2>
              <p style={{ margin: '5px 0', color: '#6c757d', fontSize: '13px' }}>
                Invoice #: <strong style={{ color: '#212529' }}>{booking.invoice_number || `INV-${booking.booking_id}`}</strong>
              </p>
              <p style={{ margin: '5px 0', color: '#6c757d', fontSize: '13px' }}>
                Booking ID: <strong style={{ color: '#212529' }}>#{booking.booking_id}</strong>
              </p>
              <p style={{ margin: '5px 0', color: '#6c757d', fontSize: '13px' }}>
                Date: <strong style={{ color: '#212529' }}>{formatDate(booking.booking_datetime || new Date())}</strong>
              </p>
            </div>
          </div>

          {/* Customer & Trip Info */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '30px',
            marginBottom: '30px'
          }}>
            <div>
              <h3 style={{
                margin: '0 0 15px 0',
                fontSize: '16px',
                fontWeight: 700,
                color: '#212529',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Bill To:
              </h3>
              <p style={{ margin: '5px 0', color: '#495057', fontSize: '14px', lineHeight: '1.6' }}>
                <strong>{booking.user_name || booking.passenger_name || 'N/A'}</strong>
              </p>
              <p style={{ margin: '5px 0', color: '#495057', fontSize: '14px', lineHeight: '1.6' }}>
                {booking.user_email || booking.passenger_email || 'N/A'}
              </p>
              <p style={{ margin: '5px 0', color: '#495057', fontSize: '14px', lineHeight: '1.6' }}>
                Phone: {booking.user_phone || booking.passenger_phone || 'N/A'}
              </p>
            </div>
            <div>
              <h3 style={{
                margin: '0 0 15px 0',
                fontSize: '16px',
                fontWeight: 700,
                color: '#212529',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Trip Details:
              </h3>
              <p style={{ margin: '5px 0', color: '#495057', fontSize: '14px', lineHeight: '1.6' }}>
                <strong>Route:</strong> {booking.route_name || 'N/A'}
              </p>
              <p style={{ margin: '5px 0', color: '#495057', fontSize: '14px', lineHeight: '1.6' }}>
                <strong>Company:</strong> {booking.company_name || 'N/A'}
              </p>
              <p style={{ margin: '5px 0', color: '#495057', fontSize: '14px', lineHeight: '1.6' }}>
                <strong>Departure:</strong> {formatDate(booking.departure_datetime)}
              </p>
              <p style={{ margin: '5px 0', color: '#495057', fontSize: '14px', lineHeight: '1.6' }}>
                <strong>Seats:</strong> {booking.total_seats || 0}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div style={{ marginBottom: '30px' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginBottom: '20px'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#1f7a5a', color: '#ffffff' }}>
                  <th style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontSize: '13px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Description
                  </th>
                  <th style={{
                    padding: '12px',
                    textAlign: 'center',
                    fontSize: '13px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Quantity
                  </th>
                  <th style={{
                    padding: '12px',
                    textAlign: 'right',
                    fontSize: '13px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Unit Price
                  </th>
                  <th style={{
                    padding: '12px',
                    textAlign: 'right',
                    fontSize: '13px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e9ecef' }}>
                  <td style={{ padding: '15px', color: '#495057', fontSize: '14px' }}>
                    Bus Ticket - {booking.route_name || 'N/A'}
                    <br />
                    <span style={{ color: '#6c757d', fontSize: '12px' }}>
                      {booking.company_name || 'N/A'} • {formatDate(booking.departure_datetime)}
                    </span>
                  </td>
                  <td style={{
                    padding: '15px',
                    textAlign: 'center',
                    color: '#495057',
                    fontSize: '14px'
                  }}>
                    {booking.total_seats || 0}
                  </td>
                  <td style={{
                    padding: '15px',
                    textAlign: 'right',
                    color: '#495057',
                    fontSize: '14px'
                  }}>
                    PKR {formatCurrency(booking.fare_pkr || (booking.total_amount_pkr || 0) / (booking.total_seats || 1))}
                  </td>
                  <td style={{
                    padding: '15px',
                    textAlign: 'right',
                    color: '#495057',
                    fontSize: '14px',
                    fontWeight: 600
                  }}>
                    PKR {formatCurrency(booking.total_amount_pkr || 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: '30px'
          }}>
            <div style={{ width: '300px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid #e9ecef'
              }}>
                <span style={{ color: '#6c757d', fontSize: '14px' }}>Subtotal:</span>
                <span style={{ color: '#495057', fontSize: '14px', fontWeight: 600 }}>
                  PKR {formatCurrency(booking.total_amount_pkr || 0)}
                </span>
              </div>
              {(booking.discount_amount_pkr > 0) && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: '1px solid #e9ecef'
                }}>
                  <span style={{ color: '#6c757d', fontSize: '14px' }}>Discount:</span>
                  <span style={{ color: '#1f7a5a', fontSize: '14px', fontWeight: 600 }}>
                    - PKR {formatCurrency(booking.discount_amount_pkr || 0)}
                  </span>
                </div>
              )}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '15px 0',
                borderTop: '2px solid #1f7a5a',
                marginTop: '10px'
              }}>
                <span style={{
                  color: '#212529',
                  fontSize: '18px',
                  fontWeight: 700,
                  textTransform: 'uppercase'
                }}>
                  Total Amount:
                </span>
                <span style={{
                  color: '#1f7a5a',
                  fontSize: '20px',
                  fontWeight: 800
                }}>
                  PKR {formatCurrency((booking.total_amount_pkr || 0) - (booking.discount_amount_pkr || 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '20px',
            borderRadius: '6px',
            marginBottom: '30px'
          }}>
            <h3 style={{
              margin: '0 0 10px 0',
              fontSize: '14px',
              fontWeight: 700,
              color: '#212529',
              textTransform: 'uppercase'
            }}>
              Payment Information:
            </h3>
            <p style={{ margin: '5px 0', color: '#495057', fontSize: '13px' }}>
              <strong>Payment Method:</strong> {booking.payment_method || 'Online Payment'}
            </p>
            <p style={{ margin: '5px 0', color: '#495057', fontSize: '13px' }}>
              <strong>Payment Status:</strong> <span style={{
                color: booking.payment_status === 'Success' ? '#1f7a5a' : '#b42318',
                fontWeight: 600
              }}>
                {booking.payment_status === 'Success' ? 'Paid' : (booking.payment_status || 'Pending')}
              </span>
            </p>
            {(booking.payment_datetime || booking.booking_datetime) && (
              <p style={{ margin: '5px 0', color: '#495057', fontSize: '13px' }}>
                <strong>Payment Date:</strong> {formatDate(booking.payment_datetime || booking.booking_datetime)}
              </p>
            )}
          </div>

          {/* Footer */}
          <div style={{
            marginTop: '40px',
            paddingTop: '20px',
            borderTop: '2px solid #e9ecef',
            textAlign: 'center',
            color: '#6c757d',
            fontSize: '12px'
          }}>
            <p style={{ margin: '5px 0' }}>
              <strong>Thank you for travelling with Musafir!</strong>
            </p>
            <p style={{ margin: '5px 0' }}>
              This is a computer-generated invoice. No signature required.
            </p>
            <p style={{ margin: '5px 0' }}>
              For any queries, contact us at support@tbs.com or +92-300-1234567
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Invoice

