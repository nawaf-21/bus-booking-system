import { useState, useEffect } from 'react'
import api, { getErrorMessage } from '../../utils/api'

const CompanyFeedback = () => {
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/company/feedback')
      .then(res => setFeedback(res.data.feedback))
      .catch(err => setError(getErrorMessage(err, 'Could not load feedback.')))
      .finally(() => setLoading(false))
  }, [])

  if (error) {
    return <div className="container"><div className="error">{error}</div></div>
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="container">
      <h1>Customer Feedback</h1>
      {feedback.length === 0 ? (
        <div className="card">
          <p>No feedback yet.</p>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Route</th>
              <th>Rating</th>
              <th>Comment</th>
              <th>Passenger</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {feedback.map(f => (
              <tr key={f.feedback_id}>
                <td>{f.route_name}</td>
                <td>{f.rating} / 5</td>
                <td>{f.comments}</td>
                <td>{f.passenger_name}</td>
                <td>{new Date(f.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default CompanyFeedback

