// Demo mode: an Axios adapter that answers API requests inside the browser
// using the sample data in demoData.js, so the app can be explored without the
// backend. It is only used when demo mode is switched on (see utils/api.js).
//
// Changes (bookings, new buses, ...) are kept in sessionStorage, so they
// survive a page reload but disappear when the browser tab is closed.

import { createSeedData, DEMO_STORAGE_KEY as STORAGE_KEY } from './demoData'

const load = () => {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {
    // sessionStorage unavailable: fall back to fresh data
  }
  return createSeedData()
}

let db = load()

const save = () => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // ignore: data just won't survive a reload
  }
}

// ---------- small helpers ----------

class DemoError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const fail = (status, message) => { throw new DemoError(status, message) }
const nextId = (list, key) => list.reduce((max, item) => Math.max(max, item[key]), 0) + 1
const num = (value) => (value === '' || value === null || value === undefined ? null : Number(value))
const sum = (list, fn) => list.reduce((total, item) => total + fn(item), 0)
const round1 = (value) => Math.round(value * 10) / 10
const sameDay = (iso, yyyyMmDd) => {
  const d = new Date(iso)
  const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return local === yyyyMmDd
}

const cityName = (id) => db.cities.find(c => c.city_id === id)?.city_name || 'Unknown'
const companyById = (id) => db.companies.find(c => c.company_id === id)
const routeById = (id) => db.routes.find(r => r.route_id === id)
const busById = (id) => db.buses.find(b => b.bus_id === id)
const tripById = (id) => db.trips.find(t => t.trip_id === id)
const userById = (id) => db.users.find(u => u.user_id === id)

const publicUser = (u) => ({ id: u.user_id, fullName: u.full_name, email: u.email, role: u.role, companyId: u.company_id })
const tokenFor = (u) => `demo-token-${u.user_id}`

// ---------- views (the shapes the pages expect) ----------

const routeView = (r) => ({
  ...r,
  from_city: cityName(r.from_city_id),
  to_city: cityName(r.to_city_id),
  route_name: `${cityName(r.from_city_id)} → ${cityName(r.to_city_id)}`,
  company_name: companyById(r.company_id)?.company_name
})

const bookedSeatIds = (tripId) => new Set(
  db.bookings
    .filter(b => b.trip_id === tripId && b.booking_status === 'Confirmed')
    .flatMap(b => b.seats.map(s => s.seat_id))
)

const companyRating = (companyId) => {
  const tripIds = new Set(db.trips.filter(t => routeById(t.route_id)?.company_id === companyId).map(t => t.trip_id))
  const ratings = db.feedback.filter(f => tripIds.has(f.trip_id)).map(f => f.rating)
  return { average: ratings.length ? round1(sum(ratings, r => r) / ratings.length) : null, count: ratings.length }
}

const tripView = (t) => {
  const route = routeById(t.route_id)
  const bus = busById(t.bus_id)
  if (!route || !bus) return null
  const booked = bookedSeatIds(t.trip_id).size
  const rating = companyRating(route.company_id)
  return {
    ...t,
    from_city: cityName(route.from_city_id),
    to_city: cityName(route.to_city_id),
    route_name: `${cityName(route.from_city_id)} → ${cityName(route.to_city_id)}`,
    company_id: route.company_id,
    company_name: companyById(route.company_id)?.company_name,
    bus_name: bus.bus_name,
    bus_type: bus.bus_type,
    total_seats: bus.total_seats,
    booked_seats: booked,
    seats_booked: booked,
    seats_available: bus.total_seats - booked,
    available_seats: bus.total_seats - booked,
    total_seats_available: bus.total_seats - booked,
    occupancy_pct: Math.round((booked / bus.total_seats) * 100),
    avg_rating: rating.average,
    total_ratings: rating.count
  }
}

const tripViews = (trips) => trips.map(tripView).filter(Boolean)

const bookingView = (b) => {
  const trip = tripView(tripById(b.trip_id) || {})
  if (!trip) return null
  const user = userById(b.user_id) || {}
  return {
    ...b,
    route_name: trip.route_name,
    company_name: trip.company_name,
    company_id: trip.company_id,
    route_id: trip.route_id,
    departure_datetime: trip.departure_datetime,
    fare_pkr: trip.fare_pkr,
    total_seats: b.seats.length,
    total_seats_booked: b.seats.length,
    amount_paid_pkr: b.booking_status === 'Confirmed' ? b.final_amount_pkr : 0,
    payment_status: b.booking_status === 'Confirmed' ? 'Success' : 'Refunded',
    has_review: db.feedback.some(f => f.trip_id === b.trip_id && f.user_id === b.user_id) ? 1 : 0,
    payment_datetime: b.booking_datetime,
    passenger_name: user.full_name,
    passenger_email: user.email,
    passenger_phone: user.phone_no,
    user_name: user.full_name,
    user_email: user.email,
    user_phone: user.phone_no
  }
}

const bookingViews = (bookings) => bookings
  .map(bookingView)
  .filter(Boolean)
  .sort((a, b) => new Date(b.booking_datetime) - new Date(a.booking_datetime))

const feedbackView = (f) => {
  const trip = tripView(tripById(f.trip_id) || {})
  return { ...f, passenger_name: userById(f.user_id)?.full_name, route_name: trip?.route_name, company_id: trip?.company_id }
}

const seatsForTrip = (trip) => {
  const bus = busById(trip.bus_id)
  const booked = bookedSeatIds(trip.trip_id)
  // Gender of the passenger in each booked seat (for the pink/blue seats)
  const genders = {}
  db.bookings
    .filter(b => b.trip_id === trip.trip_id && b.booking_status === 'Confirmed')
    .forEach(b => b.seats.forEach(s => { genders[s.seat_id] = s.passenger_gender }))
  return Array.from({ length: bus.total_seats }, (_, i) => {
    const index = i + 1
    const row = Math.ceil(index / 4)
    const seatId = trip.trip_id * 100 + index
    return {
      seat_id: seatId,
      seat_row: row,
      seat_column: (i % 4) + 1,
      seat_number: `${String.fromCharCode(64 + row)}${(i % 4) + 1}`,
      seat_status: booked.has(seatId) ? 'Booked' : 'Available',
      booked_gender: genders[seatId] || null
    }
  })
}

const pricing = (trip, seatCount, promoCode) => {
  const baseAmount = trip.fare_pkr * seatCount
  let discountAmount = 0
  if (promoCode) {
    const promo = db.promoCodes.find(p => p.code === String(promoCode).trim().toUpperCase())
    if (!promo) fail(400, 'Invalid or expired promo code')
    discountAmount = Math.round(baseAmount * promo.discount_percent / 100)
  }
  return { baseAmount, discountAmount, finalAmount: baseAmount - discountAmount }
}

// ---------- auth ----------

const currentUser = (ctx) => {
  const match = /demo-token-(\d+)/.exec(ctx.token || '')
  const user = match && userById(Number(match[1]))
  if (!user || !user.is_active) fail(401, 'Please log in again')
  return user
}

const requireRole = (ctx, ...roles) => {
  const user = currentUser(ctx)
  if (!roles.includes(user.role)) fail(403, 'You do not have access to this action')
  return user
}

const companyOf = (ctx) => requireRole(ctx, 'BusCompany').company_id

// ---------- endpoints ----------

const handlers = [
  // Auth
  ['post', '/auth/login', ({ body }) => {
    const user = db.users.find(u => u.email.toLowerCase() === String(body.email || '').toLowerCase())
    if (!user) fail(401, 'Invalid email or password')
    if (!user.is_active) fail(403, 'This account is deactivated')
    return { token: tokenFor(user), user: publicUser(user) }
  }],
  ['post', '/auth/register', ({ body }) => {
    if (db.users.some(u => u.email.toLowerCase() === String(body.email).toLowerCase())) fail(400, 'Email already registered')
    const user = {
      user_id: nextId(db.users, 'user_id'),
      full_name: body.full_name, email: body.email, phone_no: body.phone_no,
      gender: body.gender || null, role: body.role === 'BusCompany' ? 'BusCompany' : 'Passenger',
      company_id: num(body.company_id), is_active: true
    }
    db.users.push(user)
    return { token: tokenFor(user), user: publicUser(user) }
  }],
  ['get', '/auth/me', (ctx) => ({ user: publicUser(currentUser(ctx)) })],

  // Public lists
  ['get', '/cities', () => ({ cities: db.cities })],
  ['get', '/companies', () => ({
    companies: db.companies.map(c => ({ ...c, office_city: cityName(c.office_city_id) }))
  })],
  ['get', '/routes', () => ({ routes: db.routes.map(routeView) })],

  // Trips
  ['get', '/trips/search', ({ params }) => {
    const now = new Date()
    const trips = tripViews(db.trips.filter(t => t.trip_status === 'Scheduled' && new Date(t.departure_datetime) > now))
      .filter(t => !params.from_city_id || routeById(t.route_id).from_city_id === Number(params.from_city_id))
      .filter(t => !params.to_city_id || routeById(t.route_id).to_city_id === Number(params.to_city_id))
      .filter(t => !params.travel_date || sameDay(t.departure_datetime, params.travel_date))
      .filter(t => !params.bus_type || t.bus_type === params.bus_type)
      .filter(t => !params.company_id || t.company_id === Number(params.company_id))
      .sort((a, b) => new Date(a.departure_datetime) - new Date(b.departure_datetime))
    return { trips }
  }],
  ['get', '/trips/:id/seats', ({ id }) => {
    const trip = tripById(id) || fail(404, 'Trip not found')
    return { seats: seatsForTrip(trip) }
  }],
  ['get', '/trips/:id', ({ id }) => ({ trip: tripView(tripById(id) || fail(404, 'Trip not found')) })],
  ['post', '/trips', (ctx) => {
    const companyId = companyOf(ctx)
    const { body } = ctx
    const route = routeById(num(body.route_id))
    const bus = busById(num(body.bus_id))
    if (!route || route.company_id !== companyId || !bus || bus.company_id !== companyId) fail(400, 'Choose one of your own routes and buses')
    const trip = {
      trip_id: nextId(db.trips, 'trip_id'), route_id: route.route_id, bus_id: bus.bus_id,
      departure_datetime: body.departure_datetime, arrival_datetime: body.arrival_datetime,
      fare_pkr: num(body.fare_pkr) || route.base_fare_pkr, trip_status: 'Scheduled'
    }
    db.trips.push(trip)
    return { message: 'Trip created', tripId: trip.trip_id }
  }],
  ['put', '/trips/:id', (ctx) => {
    requireRole(ctx, 'BusCompany', 'Admin')
    const trip = tripById(ctx.id) || fail(404, 'Trip not found')
    const { body } = ctx
    if (body.route_id) trip.route_id = num(body.route_id)
    if (body.bus_id) trip.bus_id = num(body.bus_id)
    if (body.departure_datetime) trip.departure_datetime = body.departure_datetime
    if (body.arrival_datetime) trip.arrival_datetime = body.arrival_datetime
    if (body.fare_pkr) trip.fare_pkr = num(body.fare_pkr)
    return { message: 'Trip updated' }
  }],
  ['delete', '/trips/:id', (ctx) => {
    requireRole(ctx, 'BusCompany', 'Admin')
    const trip = tripById(ctx.id) || fail(404, 'Trip not found')
    trip.trip_status = 'Cancelled'
    db.bookings.filter(b => b.trip_id === trip.trip_id).forEach(b => { b.booking_status = 'Cancelled' })
    return { message: 'Trip cancelled' }
  }],

  // Booking flow
  ['post', '/promocodes/validate', ({ body }) => {
    const promo = db.promoCodes.find(p => p.code === String(body.code || '').trim().toUpperCase())
    if (!promo) fail(400, 'Invalid or expired promo code')
    return { valid: true, discountPercent: promo.discount_percent }
  }],
  ['post', '/bookings/preview', (ctx) => {
    currentUser(ctx)
    const { body } = ctx
    const trip = tripView(tripById(num(body.trip_id)) || fail(404, 'Trip not found'))
    const taken = bookedSeatIds(trip.trip_id)
    if (body.seat_ids.some(id => taken.has(id))) fail(400, 'One of the selected seats has just been booked')
    return {
      trip: { routeId: trip.route_id, fromCity: trip.from_city, toCity: trip.to_city, farePerSeat: trip.fare_pkr },
      seats: body.seat_ids.map((id, i) => ({
        seatId: id,
        seatNumber: seatsForTrip(trip).find(s => s.seat_id === id)?.seat_number,
        passengerName: body.passenger_names[i],
        passengerGender: body.passenger_genders[i]
      })),
      pricing: pricing(trip, body.seat_ids.length, body.promo_code)
    }
  }],
  ['post', '/bookings/confirm', (ctx) => {
    const user = currentUser(ctx)
    const { body } = ctx
    const trip = tripById(num(body.trip_id)) || fail(404, 'Trip not found')
    const taken = bookedSeatIds(trip.trip_id)
    if (body.seat_ids.some(id => taken.has(id))) fail(400, 'One of the selected seats has just been booked')
    const price = pricing(trip, body.seat_ids.length, body.promo_code)
    const booking = {
      booking_id: nextId(db.bookings, 'booking_id'), user_id: user.user_id, trip_id: trip.trip_id,
      seats: body.seat_ids.map((id, i) => ({ seat_id: id, passenger_name: body.passenger_names[i], passenger_gender: body.passenger_genders[i] })),
      booking_status: 'Confirmed',
      total_amount_pkr: price.baseAmount, discount_amount_pkr: price.discountAmount, final_amount_pkr: price.finalAmount,
      payment_method: body.payment_method, booking_datetime: new Date().toISOString(), invoice_number: ''
    }
    booking.invoice_number = `INV-DEMO-${String(booking.booking_id).padStart(4, '0')}`
    db.bookings.push(booking)
    return { bookingId: booking.booking_id, message: 'Booking confirmed' }
  }],
  ['get', '/bookings/my', (ctx) => {
    const user = currentUser(ctx)
    return { bookings: bookingViews(db.bookings.filter(b => b.user_id === user.user_id)) }
  }],
  ['get', '/bookings/:id', (ctx) => {
    const user = currentUser(ctx)
    const booking = db.bookings.find(b => b.booking_id === ctx.id)
    if (!booking || (booking.user_id !== user.user_id && user.role !== 'Admin')) fail(404, 'Booking not found')
    return { booking: bookingView(booking) }
  }],
  ['post', '/bookings/:id/cancel', (ctx) => {
    const user = currentUser(ctx)
    const booking = db.bookings.find(b => b.booking_id === ctx.id && b.user_id === user.user_id) || fail(404, 'Booking not found')
    booking.booking_status = 'Cancelled'
    return { message: 'Booking cancelled' }
  }],

  // Favourites
  ['get', '/favourites/routes', (ctx) => {
    const user = currentUser(ctx)
    const favouriteRoutes = db.favourites
      .filter(f => f.user_id === user.user_id && routeById(f.route_id))
      .map(f => {
        const route = routeView(routeById(f.route_id))
        return {
          fav_id: f.fav_id, route_name: route.route_name,
          from_city_id: route.from_city_id, to_city_id: route.to_city_id,
          preferred_company_id: f.preferred_company_id,
          preferred_company_name: companyById(f.preferred_company_id)?.company_name,
          base_fare_pkr: route.base_fare_pkr
        }
      })
    return { favouriteRoutes }
  }],
  ['post', '/favourites/routes', (ctx) => {
    const { body } = ctx
    const user = currentUser(ctx)
    const exists = db.favourites.some(f => f.user_id === user.user_id && f.route_id === num(body.route_id) &&
      f.preferred_company_id === num(body.preferred_company_id))
    if (exists) fail(400, 'Route is already in favourites')
    db.favourites.push({ fav_id: nextId(db.favourites, 'fav_id'), user_id: user.user_id,
      route_id: num(body.route_id), preferred_company_id: num(body.preferred_company_id) })
    return { message: 'Route added to favourites' }
  }],
  ['post', '/feedback/trips/:id', (ctx) => {
    const { body } = ctx
    const user = currentUser(ctx)
    if (db.feedback.some(f => f.trip_id === ctx.id && f.user_id === user.user_id)) {
      fail(400, 'You have already provided feedback for this trip')
    }
    db.feedback.push({ feedback_id: nextId(db.feedback, 'feedback_id'), user_id: user.user_id, trip_id: ctx.id,
      rating: num(body.rating), comments: body.comments || '', created_at: new Date().toISOString() })
    return { message: 'Feedback submitted successfully' }
  }],
  ['delete', '/favourites/routes/:id', (ctx) => {
    const user = currentUser(ctx)
    db.favourites = db.favourites.filter(f => !(f.fav_id === ctx.id && f.user_id === user.user_id))
    return { message: 'Removed from favourites' }
  }],

  // Bus company
  ['get', '/company/overview', (ctx) => {
    const companyId = companyOf(ctx)
    const trips = tripViews(db.trips).filter(t => t.company_id === companyId)
    const tripIds = new Set(trips.map(t => t.trip_id))
    const confirmed = db.bookings.filter(b => tripIds.has(b.trip_id) && b.booking_status === 'Confirmed')
    const upcoming = trips
      .filter(t => t.trip_status === 'Scheduled' && new Date(t.departure_datetime) > new Date())
      .sort((a, b) => new Date(a.departure_datetime) - new Date(b.departure_datetime))
    return {
      stats: {
        totalBookings: confirmed.length,
        totalRevenue: sum(confirmed, b => b.final_amount_pkr),
        averageRating: companyRating(companyId).average || 0,
        upcomingTrips: upcoming.length
      },
      upcomingTrips: upcoming.slice(0, 5),
      recentFeedback: db.feedback.map(feedbackView).filter(f => f.company_id === companyId).slice(0, 5)
    }
  }],
  ['get', '/company/routes', (ctx) => ({ routes: db.routes.filter(r => r.company_id === companyOf(ctx)).map(routeView) })],
  ['get', '/company/buses', (ctx) => ({ buses: db.buses.filter(b => b.company_id === companyOf(ctx)) })],
  ['get', '/company/trips', (ctx) => {
    const companyId = companyOf(ctx)
    return { trips: tripViews(db.trips).filter(t => t.company_id === companyId).sort((a, b) => new Date(b.departure_datetime) - new Date(a.departure_datetime)) }
  }],
  ['get', '/company/feedback', (ctx) => {
    const companyId = companyOf(ctx)
    return { feedback: db.feedback.map(feedbackView).filter(f => f.company_id === companyId) }
  }],
  ['post', '/routes', (ctx) => {
    const companyId = companyOf(ctx)
    const { body } = ctx
    if (num(body.from_city_id) === num(body.to_city_id)) fail(400, 'Origin and destination must be different')
    db.routes.push({
      route_id: nextId(db.routes, 'route_id'), company_id: companyId,
      from_city_id: num(body.from_city_id), to_city_id: num(body.to_city_id),
      distance_km: num(body.distance_km), approx_duration_min: num(body.approx_duration_min), base_fare_pkr: num(body.base_fare_pkr)
    })
    return { message: 'Route created' }
  }],
  ['put', '/routes/:id', (ctx) => {
    companyOf(ctx)
    const route = routeById(ctx.id) || fail(404, 'Route not found')
    for (const key of ['from_city_id', 'to_city_id', 'distance_km', 'approx_duration_min', 'base_fare_pkr']) {
      if (ctx.body[key] !== undefined && ctx.body[key] !== '') route[key] = num(ctx.body[key])
    }
    return { message: 'Route updated' }
  }],
  ['post', '/buses', (ctx) => {
    const companyId = companyOf(ctx)
    const { body } = ctx
    db.buses.push({
      bus_id: nextId(db.buses, 'bus_id'), company_id: companyId,
      bus_name: body.bus_name, bus_model: body.bus_model, bus_type: body.bus_type,
      total_seats: num(body.total_seats) || 40, status: 'Active'
    })
    return { message: 'Bus created' }
  }],
  ['put', '/buses/:id', (ctx) => {
    companyOf(ctx)
    const bus = busById(ctx.id) || fail(404, 'Bus not found')
    for (const key of ['bus_name', 'bus_model', 'bus_type', 'status']) if (ctx.body[key]) bus[key] = ctx.body[key]
    if (ctx.body.total_seats) bus.total_seats = num(ctx.body.total_seats)
    return { message: 'Bus updated' }
  }],
  ['delete', '/buses/:id', (ctx) => {
    companyOf(ctx)
    if (db.trips.some(t => t.bus_id === ctx.id && t.trip_status === 'Scheduled')) fail(400, 'This bus has scheduled trips. Cancel them first.')
    db.buses = db.buses.filter(b => b.bus_id !== ctx.id)
    return { message: 'Bus deleted' }
  }],

  // Admin
  ['get', '/admin/overview', (ctx) => {
    requireRole(ctx, 'Admin')
    const confirmed = bookingViews(db.bookings.filter(b => b.booking_status === 'Confirmed'))
    const byKey = (key, nameKey) => Object.values(confirmed.reduce((acc, b) => {
      acc[b[key]] = acc[b[key]] || { name: b[nameKey], total_bookings: 0, total_revenue_pkr: 0 }
      acc[b[key]].total_bookings += 1
      acc[b[key]].total_revenue_pkr += b.final_amount_pkr
      return acc
    }, {})).sort((a, b) => b.total_revenue_pkr - a.total_revenue_pkr).slice(0, 5)
    return {
      stats: { totalBookings: confirmed.length, totalRevenue: sum(confirmed, b => b.final_amount_pkr), totalUsers: db.users.length },
      topRoutes: byKey('route_id', 'route_name').map(r => ({ route_name: r.name, total_bookings: r.total_bookings, total_revenue_pkr: r.total_revenue_pkr })),
      topCompaniesByRevenue: byKey('company_id', 'company_name').map(c => ({
        company_name: c.name, total_bookings: c.total_bookings, total_revenue_pkr: c.total_revenue_pkr,
        avg_booking_value_pkr: Math.round(c.total_revenue_pkr / c.total_bookings)
      })),
      topCompaniesByRating: db.companies
        .map(c => ({ company_name: c.company_name, ...companyRating(c.company_id) }))
        .filter(c => c.count > 0)
        .sort((a, b) => b.average - a.average)
        .map(c => ({ company_name: c.company_name, average_rating: c.average, total_ratings: c.count }))
    }
  }],
  ['get', '/admin/bookings/search', (ctx) => {
    requireRole(ctx, 'Admin')
    const p = ctx.params
    const bookings = bookingViews(db.bookings)
      .filter(b => !p.status || b.booking_status === p.status)
      .filter(b => !p.route_id || b.route_id === Number(p.route_id))
      .filter(b => !p.user_id || b.user_id === Number(p.user_id))
      .filter(b => !p.company_id || b.company_id === Number(p.company_id))
      .filter(b => !p.from_date || b.booking_datetime.slice(0, 10) >= p.from_date)
      .filter(b => !p.to_date || b.booking_datetime.slice(0, 10) <= p.to_date)
    return { bookings }
  }],
  ['get', '/admin/bookings', (ctx) => {
    requireRole(ctx, 'Admin')
    return { bookings: bookingViews(db.bookings) }
  }],
  ['get', '/admin/trips', (ctx) => {
    requireRole(ctx, 'Admin')
    return { trips: tripViews(db.trips).sort((a, b) => new Date(b.departure_datetime) - new Date(a.departure_datetime)) }
  }],
  ['post', '/admin/bookings/:id/cancel', (ctx) => {
    requireRole(ctx, 'Admin')
    const booking = db.bookings.find(b => b.booking_id === ctx.id) || fail(404, 'Booking not found')
    booking.booking_status = 'Cancelled'
    return { message: 'Booking cancelled and refunded' }
  }],
  ['post', '/admin/bookings/:id/refund', (ctx) => {
    requireRole(ctx, 'Admin')
    const booking = db.bookings.find(b => b.booking_id === ctx.id) || fail(404, 'Booking not found')
    booking.refund_amount_pkr = num(ctx.body.amount) || booking.final_amount_pkr
    return { message: 'Refund recorded' }
  }],
  ['post', '/admin/seats/reserve', (ctx) => {
    const admin = requireRole(ctx, 'Admin')
    const { body } = ctx
    const trip = tripById(num(body.trip_id)) || fail(404, 'Trip not found')
    const seats = seatsForTrip(trip)
    const seat = seats.find(s => String(s.seat_id) === String(body.seat_id) || s.seat_number.toLowerCase() === String(body.seat_id).toLowerCase())
    if (!seat) fail(400, `Seat not found. Use a seat number such as 1A to ${seats[seats.length - 1].seat_number}`)
    if (seat.seat_status === 'Booked') fail(400, 'That seat is already booked')
    const booking = {
      booking_id: nextId(db.bookings, 'booking_id'), user_id: admin.user_id, trip_id: trip.trip_id,
      seats: [{ seat_id: seat.seat_id, passenger_name: body.passenger_name, passenger_gender: body.passenger_gender || 'Neutral' }],
      booking_status: 'Confirmed', total_amount_pkr: 0, discount_amount_pkr: 0, final_amount_pkr: 0,
      payment_method: 'Admin reservation', booking_datetime: new Date().toISOString(), invoice_number: ''
    }
    booking.invoice_number = `INV-DEMO-${String(booking.booking_id).padStart(4, '0')}`
    db.bookings.push(booking)
    return { message: 'Seat reserved' }
  }],

  // Admin: users
  ['get', '/users', (ctx) => {
    requireRole(ctx, 'Admin')
    return { users: db.users.map(u => ({ ...u, company_name: companyById(u.company_id)?.company_name || null })) }
  }],
  ['post', '/users', (ctx) => {
    requireRole(ctx, 'Admin')
    const { body } = ctx
    if (db.users.some(u => u.email.toLowerCase() === String(body.email).toLowerCase())) fail(400, 'Email already registered')
    db.users.push({
      user_id: nextId(db.users, 'user_id'), full_name: body.full_name, email: body.email, phone_no: body.phone_no,
      gender: body.gender || null, role: body.role, company_id: num(body.company_id), is_active: true
    })
    return { message: 'User created' }
  }],
  ['put', '/users/:id', (ctx) => {
    requireRole(ctx, 'Admin')
    const user = userById(ctx.id) || fail(404, 'User not found')
    for (const key of ['full_name', 'email', 'phone_no', 'gender', 'role']) if (ctx.body[key]) user[key] = ctx.body[key]
    if (ctx.body.company_id !== undefined) user.company_id = num(ctx.body.company_id)
    if (ctx.body.is_active !== undefined) user.is_active = Boolean(ctx.body.is_active)
    return { message: 'User updated' }
  }],
  ['delete', '/users/:id', (ctx) => {
    const admin = requireRole(ctx, 'Admin')
    if (admin.user_id === ctx.id) fail(400, 'You cannot delete your own account')
    db.users = db.users.filter(u => u.user_id !== ctx.id)
    db.bookings = db.bookings.filter(b => b.user_id !== ctx.id)
    db.feedback = db.feedback.filter(f => f.user_id !== ctx.id)
    db.favourites = db.favourites.filter(f => f.user_id !== ctx.id)
    return { message: 'User deleted' }
  }],

  // Admin: companies
  ['post', '/companies', (ctx) => {
    requireRole(ctx, 'Admin')
    const { body } = ctx
    db.companies.push({
      company_id: nextId(db.companies, 'company_id'), company_name: body.company_name,
      contact_email: body.contact_email, contact_phone: body.contact_phone,
      office_city_id: num(body.office_city_id), status: 'Active'
    })
    return { message: 'Company created' }
  }],
  ['delete', '/companies/:id', (ctx) => {
    requireRole(ctx, 'Admin')
    const routeIds = new Set(db.routes.filter(r => r.company_id === ctx.id).map(r => r.route_id))
    const tripIds = new Set(db.trips.filter(t => routeIds.has(t.route_id)).map(t => t.trip_id))
    db.bookings = db.bookings.filter(b => !tripIds.has(b.trip_id))
    db.feedback = db.feedback.filter(f => !tripIds.has(f.trip_id))
    db.trips = db.trips.filter(t => !tripIds.has(t.trip_id))
    db.routes = db.routes.filter(r => r.company_id !== ctx.id)
    db.buses = db.buses.filter(b => b.company_id !== ctx.id)
    db.favourites = db.favourites.filter(f => routeIds.has(f.route_id) === false)
    db.companies = db.companies.filter(c => c.company_id !== ctx.id)
    return { message: 'Company deleted' }
  }],

  // Chatbot: there is no AI behind demo mode, so reply honestly with a fixed message
  ['post', '/chatbot/chat', () => ({
    response: "Sorry, I can't answer questions right now. You can search trips from the home page, and the promo code MUSAFIR10 gives 10% off at checkout."
  })]
]

// Turn "/trips/:id/seats" into a regex once
const compiled = handlers.map(([method, path, handler]) => ({
  method,
  regex: new RegExp('^' + path.replace(/:id/g, '(\\d+)') + '$'),
  handler
}))

const readToken = (headers) => {
  if (!headers) return ''
  const value = typeof headers.get === 'function' ? headers.get('Authorization') : headers.Authorization
  return String(value || '').replace('Bearer ', '')
}

export default async function demoAdapter(config) {
  // Short delay so loading states behave like a real network
  await new Promise(resolve => setTimeout(resolve, 150))

  const [path, query = ''] = config.url.split('?')
  const method = (config.method || 'get').toLowerCase()
  const params = { ...Object.fromEntries(new URLSearchParams(query)), ...(config.params || {}) }
  let body = {}
  try {
    body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {})
  } catch {
    body = {}
  }

  const respond = (status, data) => ({ data, status, statusText: String(status), headers: {}, config, request: {} })

  const route = compiled.find(r => r.method === method && r.regex.test(path))
  try {
    if (!route) fail(404, 'This feature is not available right now')
    const id = Number(route.regex.exec(path)[1])
    const data = route.handler({ id, params, body, token: readToken(config.headers) })
    if (method !== 'get') save()
    return respond(200, data)
  } catch (err) {
    const status = err instanceof DemoError ? err.status : 500
    const message = err instanceof DemoError ? err.message : 'Demo data error'
    const error = new Error(message)
    error.isAxiosError = true
    error.config = config
    error.response = respond(status, { error: message, message })
    throw error
  }
}
