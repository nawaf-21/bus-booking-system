// made-up demo data (company names are real, everything else is fake)
// dates are relative to now so trips are always in the future

const at = (daysFromNow, hour, minute = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

const addMinutes = (iso, minutes) => new Date(new Date(iso).getTime() + minutes * 60000).toISOString()

// bump the version when the sample data changes
export const DEMO_STORAGE_KEY = 'musafir-demo-data-v3'

// all sample accounts use this password
export const SAMPLE_PASSWORD = 'Musafir123'

export const QUICK_LOGINS = [
  { label: 'Passenger', email: 'passenger@demo.test' },
  { label: 'Bus Company', email: 'company@demo.test' },
  { label: 'Admin', email: 'admin@demo.test' }
]

export function createSeedData() {
  const cities = [
    { city_id: 1, city_name: 'Lahore' },
    { city_id: 2, city_name: 'Islamabad' },
    { city_id: 3, city_name: 'Karachi' },
    { city_id: 4, city_name: 'Multan' },
    { city_id: 5, city_name: 'Faisalabad' },
    { city_id: 6, city_name: 'Peshawar' },
    { city_id: 7, city_name: 'Rawalpindi' },
    { city_id: 8, city_name: 'Abbottabad' },
    { city_id: 9, city_name: 'Sialkot' },
    { city_id: 10, city_name: 'Mianwali' }
  ]

  const company = (company_id, company_name, office_city_id, slug) => ({
    company_id, company_name, office_city_id, status: 'Active',
    contact_email: `info@${slug}.example`,
    contact_phone: `0300-00000${String(company_id).padStart(2, '0')}`
  })

  const companies = [
    company(1, 'Daewoo Express', 1, 'daewoo'),
    company(2, 'Faisal Movers', 5, 'faisalmovers'),
    company(3, 'Skyways', 7, 'skyways'),
    company(4, 'Road Master', 1, 'roadmaster'),
    company(5, 'Niazi Express', 1, 'niazi'),
    company(6, 'Kohistan Express', 7, 'kohistan'),
    company(7, 'Sania Express', 1, 'sania'),
    company(8, 'FMBT', 4, 'fmbt'),
    company(9, 'Q Connect', 1, 'qconnect')
  ]

  const users = [
    { user_id: 1, full_name: 'Ayesha Khan', email: 'passenger@demo.test', phone_no: '0300-1234567', gender: 'Female', role: 'Passenger', company_id: null, is_active: true },
    { user_id: 2, full_name: 'Daewoo Express Manager', email: 'company@demo.test', phone_no: '0301-2345678', gender: null, role: 'BusCompany', company_id: 1, is_active: true },
    { user_id: 3, full_name: 'System Admin', email: 'admin@demo.test', phone_no: '0302-3456789', gender: null, role: 'Admin', company_id: null, is_active: true },
    { user_id: 4, full_name: 'Bilal Ahmed', email: 'bilal@demo.test', phone_no: '0303-4567890', gender: 'Male', role: 'Passenger', company_id: null, is_active: true },
    { user_id: 5, full_name: 'Sana Iqbal', email: 'sana@demo.test', phone_no: '0304-5678901', gender: 'Female', role: 'Passenger', company_id: null, is_active: true },
    { user_id: 6, full_name: 'Faisal Movers Desk', email: 'faisal@demo.test', phone_no: '0305-6789012', gender: null, role: 'BusCompany', company_id: 2, is_active: true }
  ]

  const route = (route_id, company_id, from_city_id, to_city_id, distance_km, approx_duration_min, base_fare_pkr) =>
    ({ route_id, company_id, from_city_id, to_city_id, distance_km, approx_duration_min, base_fare_pkr })

  const routes = [
    route(1, 1, 1, 2, 375, 270, 2800),
    route(2, 1, 2, 1, 375, 270, 2800),
    route(3, 1, 1, 3, 1210, 1080, 7000),
    route(4, 2, 5, 1, 180, 150, 1300),
    route(5, 2, 1, 3, 1210, 1140, 6200),
    route(6, 3, 7, 1, 380, 300, 2400),
    route(7, 4, 1, 2, 375, 285, 2600),
    route(8, 5, 1, 10, 330, 330, 2000),
    route(9, 6, 7, 8, 125, 150, 900),
    route(10, 7, 1, 7, 380, 300, 2300),
    route(11, 8, 4, 1, 340, 300, 2200),
    route(12, 9, 1, 2, 375, 270, 3000),
    route(13, 1, 1, 4, 340, 300, 2500)
  ]

  const bus = (bus_id, company_id, bus_name, bus_model, bus_type, total_seats, status = 'Active') =>
    ({ bus_id, company_id, bus_name, bus_model, bus_type, total_seats, status })

  const buses = [
    bus(1, 1, 'DE-101', 'Yutong ZK6122', 'AC', 40),
    bus(2, 1, 'DE-205', 'Yutong ZK6122', 'Sleeper', 28),
    bus(3, 1, 'DE-310', 'Hino RK8', 'AC', 40, 'Maintenance'),
    bus(4, 2, 'FM-12', 'Yutong ZK6122', 'AC', 40),
    bus(5, 2, 'FM-18', 'Hino RK8', 'Seater', 36),
    bus(6, 3, 'SK-7', 'Yutong ZK6122', 'AC', 40),
    bus(7, 4, 'RM-3', 'Hino RK8', 'AC', 40),
    bus(8, 5, 'NE-21', 'Hino RK8', 'Non-AC', 36),
    bus(9, 6, 'KE-5', 'Hino RK8', 'Seater', 36),
    bus(10, 7, 'SE-9', 'Yutong ZK6122', 'AC', 40),
    bus(11, 8, 'FB-4', 'Hino RK8', 'Non-AC', 36),
    bus(12, 9, 'QC-1', 'Yutong ZK6122', 'Sleeper', 28)
  ]

  const trip = (trip_id, route_id, bus_id, departure, fare_pkr, trip_status = 'Scheduled') => {
    const r = routes.find(x => x.route_id === route_id)
    return { trip_id, route_id, bus_id, departure_datetime: departure, arrival_datetime: addMinutes(departure, r.approx_duration_min), fare_pkr, trip_status }
  }

  const trips = [
    trip(1, 1, 1, at(1, 8), 2800),
    trip(2, 12, 12, at(1, 10), 3000),
    trip(3, 7, 7, at(1, 13, 30), 2600),
    trip(4, 2, 1, at(2, 9), 2800),
    trip(5, 13, 2, at(2, 22), 2500),
    trip(6, 4, 4, at(1, 7), 1300),
    trip(7, 3, 2, at(3, 18), 7000),
    trip(8, 9, 9, at(2, 6, 30), 900),
    trip(9, 1, 1, at(4, 8), 2900),
    trip(10, 6, 6, at(3, 9), 2400),
    trip(11, 8, 8, at(2, 11), 2000),
    trip(12, 10, 10, at(3, 15), 2300),
    trip(13, 11, 11, at(4, 7), 2200),
    trip(14, 5, 5, at(5, 17), 6200),
    trip(15, 1, 1, at(-3, 8), 2800, 'Completed'),
    trip(16, 3, 2, at(-6, 18), 7000, 'Completed'),
    trip(17, 12, 12, at(-4, 10), 3000, 'Completed'),
    trip(18, 4, 4, at(-2, 7), 1300, 'Completed')
  ]

  const booking = (booking_id, user_id, trip_id, seatIndexes, payment_method, booking_status = 'Confirmed', discount = 0) => {
    const t = trips.find(x => x.trip_id === trip_id)
    const user = users.find(u => u.user_id === user_id)
    const total = t.fare_pkr * seatIndexes.length
    return {
      booking_id,
      user_id,
      trip_id,
      seats: seatIndexes.map((i, n) => ({
        seat_id: trip_id * 100 + i,
        passenger_name: n === 0 ? user.full_name : `${user.full_name.split(' ')[0]}'s companion`,
        passenger_gender: user.gender || 'Male'
      })),
      booking_status,
      total_amount_pkr: total,
      discount_amount_pkr: discount,
      final_amount_pkr: total - discount,
      payment_method,
      booking_datetime: at(-14 + booking_id, 12),
      invoice_number: `INV-DEMO-${String(booking_id).padStart(4, '0')}`
    }
  }

  const bookings = [
    booking(1, 1, 1, [1, 2], 'Card'),
    booking(2, 4, 1, [5], 'JazzCash'),
    booking(3, 5, 3, [3], 'Easypaisa'),
    booking(4, 1, 7, [9], 'Card', 'Cancelled'),
    booking(5, 4, 4, [10, 11], 'CashOnCounter'),
    booking(6, 1, 15, [4], 'Card'),
    booking(7, 5, 16, [7, 8], 'Card', 'Confirmed', 1400),
    booking(8, 4, 9, [1], 'JazzCash'),
    booking(9, 5, 2, [2], 'Card'),
    booking(10, 1, 6, [6], 'Easypaisa'),
    booking(11, 4, 17, [3], 'Card'),
    booking(12, 5, 18, [2], 'JazzCash'),
    // finished trip not rated yet
    booking(13, 1, 18, [12], 'Card')
  ]

  const feedback = [
    { feedback_id: 1, user_id: 1, trip_id: 15, rating: 5, comments: 'Left on time and the bus was clean.', created_at: at(-2, 19) },
    { feedback_id: 2, user_id: 5, trip_id: 16, rating: 4, comments: 'Comfortable sleeper seats. The rest stop felt a little long.', created_at: at(-5, 9) },
    { feedback_id: 3, user_id: 4, trip_id: 15, rating: 4, comments: 'Good journey overall.', created_at: at(-2, 21) },
    { feedback_id: 4, user_id: 4, trip_id: 17, rating: 5, comments: 'Smooth ride and helpful staff.', created_at: at(-3, 18) },
    { feedback_id: 5, user_id: 5, trip_id: 18, rating: 4, comments: 'Arrived as scheduled.', created_at: at(-1, 12) }
  ]

  const favourites = [
    { fav_id: 1, user_id: 1, route_id: 1, preferred_company_id: 1 },
    { fav_id: 2, user_id: 1, route_id: 5, preferred_company_id: 2 }
  ]

  const promoCodes = [
    { code: 'MUSAFIR10', discount_percent: 10 },
    { code: 'LAHORE20', discount_percent: 20 }
  ]

  return { cities, companies, users, routes, buses, trips, bookings, feedback, favourites, promoCodes }
}
