import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Navbar from './components/Navbar'

// Auth pages
import Login from './pages/Login'
import Register from './pages/Register'

// Passenger pages
import Home from './pages/passenger/Home'
import TripResults from './pages/passenger/TripResults'
import SeatSelection from './pages/passenger/SeatSelection'
import Checkout from './pages/passenger/Checkout'
import BookingConfirmation from './pages/passenger/BookingConfirmation'
import MyBookings from './pages/passenger/MyBookings'
import Favourites from './pages/passenger/Favourites'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Passenger routes */}
          <Route path="/" element={<Home />} />
          <Route path="/trips/search" element={<TripResults />} />
          <Route path="/trips/:id/seats" element={<SeatSelection />} />
          <Route path="/checkout" element={<PrivateRoute><Checkout /></PrivateRoute>} />
          <Route path="/booking/:id/confirmation" element={<PrivateRoute><BookingConfirmation /></PrivateRoute>} />
          <Route path="/my-bookings" element={<PrivateRoute><MyBookings /></PrivateRoute>} />
          <Route path="/favourites" element={<PrivateRoute><Favourites /></PrivateRoute>} />

          {/* Unknown URLs go back to the home page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App

