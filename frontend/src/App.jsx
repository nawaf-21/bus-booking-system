import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Navbar from './components/Navbar'
import Chatbot from './components/Chatbot'

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

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminCompanies from './pages/admin/AdminCompanies'
import AdminTrips from './pages/admin/AdminTrips'
import AdminUsers from './pages/admin/AdminUsers'
import AdminBookings from './pages/admin/AdminBookings'
import AdminOverrides from './pages/admin/AdminOverrides'

// Bus Company pages
import CompanyDashboard from './pages/company/CompanyDashboard'
import CompanyTrips from './pages/company/CompanyTrips'
import CompanyBuses from './pages/company/CompanyBuses'
import CompanyFeedback from './pages/company/CompanyFeedback'
import CompanyRoutes from './pages/company/CompanyRoutes'
import CompanyTripManagement from './pages/company/CompanyTripManagement'

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
          <Route path="/checkout" element={<PrivateRoute role="Passenger"><Checkout /></PrivateRoute>} />
          <Route path="/booking/:id/confirmation" element={<PrivateRoute role="Passenger"><BookingConfirmation /></PrivateRoute>} />
          <Route path="/my-bookings" element={<PrivateRoute role="Passenger"><MyBookings /></PrivateRoute>} />
          <Route path="/favourites" element={<PrivateRoute role="Passenger"><Favourites /></PrivateRoute>} />

          {/* Admin routes */}
          <Route path="/admin" element={<PrivateRoute role="Admin"><AdminDashboard /></PrivateRoute>} />
          <Route path="/admin/users" element={<PrivateRoute role="Admin"><AdminUsers /></PrivateRoute>} />
          <Route path="/admin/companies" element={<PrivateRoute role="Admin"><AdminCompanies /></PrivateRoute>} />
          <Route path="/admin/bookings" element={<PrivateRoute role="Admin"><AdminBookings /></PrivateRoute>} />
          <Route path="/admin/trips" element={<PrivateRoute role="Admin"><AdminTrips /></PrivateRoute>} />
          <Route path="/admin/overrides" element={<PrivateRoute role="Admin"><AdminOverrides /></PrivateRoute>} />

          {/* Bus Company routes */}
          <Route path="/company" element={<PrivateRoute role="BusCompany"><CompanyDashboard /></PrivateRoute>} />
          <Route path="/company/routes" element={<PrivateRoute role="BusCompany"><CompanyRoutes /></PrivateRoute>} />
          <Route path="/company/buses" element={<PrivateRoute role="BusCompany"><CompanyBuses /></PrivateRoute>} />
          <Route path="/company/trips" element={<PrivateRoute role="BusCompany"><CompanyTrips /></PrivateRoute>} />
          <Route path="/company/trips/manage" element={<PrivateRoute role="BusCompany"><CompanyTripManagement /></PrivateRoute>} />
          <Route path="/company/feedback" element={<PrivateRoute role="BusCompany"><CompanyFeedback /></PrivateRoute>} />

          {/* Unknown URLs go back to the home page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Chatbot />
      </Router>
    </AuthProvider>
  )
}

export default App

