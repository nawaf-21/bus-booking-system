import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_LINKS = {
  Passenger: [
    { to: '/', label: 'Home', end: true },
    { to: '/my-bookings', label: 'My Bookings' },
    { to: '/favourites', label: 'Favourites' }
  ]
}

const Navbar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const links = user ? NAV_LINKS[user.role] || [] : []

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-links">
          <Link to="/" className="logo">Musafir</Link>
          {links.map(link => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              {link.label}
            </NavLink>
          ))}
        </div>
        <div className="navbar-user">
          {user ? (
            <>
              <span className="navbar-username">{user.fullName}</span>
              <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Login</NavLink>
              <NavLink to="/register">Register</NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
