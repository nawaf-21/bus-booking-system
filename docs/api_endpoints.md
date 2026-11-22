# API Endpoints Documentation

Base URL: `http://localhost:5000/api`

All endpoints require authentication unless specified. Include JWT token in Authorization header: `Bearer <token>`

---

## Authentication

### POST /api/auth/register
Register a new passenger account. Bus company and admin accounts are created by the admin (`POST /api/users`).

**Request Body:**
```json
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone_no": "03001234567",
  "gender": "Male"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "userId": 1,
    "fullName": "John Doe",
    "email": "john@example.com",
    "role": "Passenger"
  },
  "token": "jwt_token_here"
}
```

### POST /api/auth/login
Login user

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": { ... },
  "token": "jwt_token_here"
}
```

### GET /api/auth/me
Get current user info (requires auth)

---

## Cities

### GET /api/cities
Get all cities (public)

**Response:**
```json
{
  "cities": [
    {
      "city_id": 1,
      "city_name": "Lahore",
      "province": "Punjab"
    }
  ]
}
```

---

## Bus Companies

### GET /api/companies
Get all companies (requires auth)

### GET /api/companies/:id
Get company by ID

### POST /api/companies
Create company (Admin only)

### PUT /api/companies/:id
Update company (Admin only)

### DELETE /api/companies/:id
Delete company (Admin only)

---

## Routes

### GET /api/routes
Get all routes (public)

### GET /api/routes/:id
Get route by ID

### POST /api/routes
Create route (Admin only)

### PUT /api/routes/:id
Update route (Admin only)

---

## Buses

### GET /api/buses
Get all buses (optional query: `company_id`, `status`)

### GET /api/buses/:id
Get bus by ID

### POST /api/buses
Create bus (Admin or BusCompany)

### PUT /api/buses/:id
Update bus (Admin or BusCompany - can only update own company's buses)

### DELETE /api/buses/:id
Delete bus (Admin or BusCompany)

---

## Trips

### GET /api/trips/search
Search trips (public)

**Query Parameters:**
- `from_city_id` (required)
- `to_city_id` (required)
- `travel_date` (optional)
- `bus_type` (optional)
- `company_id` (optional)

**Response:**
```json
{
  "trips": [
    {
      "trip_id": 1,
      "route_id": 1,
      "from_city": "Lahore",
      "to_city": "Islamabad",
      "company_name": "Daewoo Express",
      "departure_datetime": "2025-12-20T09:00:00",
      "arrival_datetime": "2025-12-20T13:00:00",
      "fare_pkr": 1500,
      "seats_available": 35,
      "total_seats": 40,
      "avg_rating": 4.5
    }
  ]
}
```

### GET /api/trips/:id
Get trip by ID

### GET /api/trips/:id/seats
Get seat map for a trip

**Response:**
```json
{
  "tripId": 1,
  "busId": 1,
  "totalSeats": 40,
  "seats": [
    {
      "seat_id": 1,
      "seat_number": "A1",
      "seat_row": 1,
      "seat_column": 1,
      "seat_type": "Window",
      "seat_status": "Available",
      "booked_gender": null
    }
  ]
}
```

### POST /api/trips
Create trip (Admin or BusCompany)

### PUT /api/trips/:id
Update trip (Admin or BusCompany)

### DELETE /api/trips/:id
Cancel trip (Admin or BusCompany)

---

## Bookings

### POST /api/bookings/preview
Preview booking with pricing (requires auth)

**Request Body:**
```json
{
  "trip_id": 1,
  "seat_ids": [1, 2, 3],
  "passenger_names": ["John Doe", "Jane Doe", "Bob Smith"],
  "passenger_genders": ["Male", "Female", "Male"],
  "promo_code": "LAHORE20"  // optional
}
```

**Response:**
```json
{
  "trip": {
    "tripId": 1,
    "fromCity": "Lahore",
    "toCity": "Islamabad",
    "farePerSeat": 1500
  },
  "seats": [...],
  "pricing": {
    "baseAmount": 4500,
    "discountAmount": 200,
    "finalAmount": 4300,
    "promoCode": "LAHORE20"
  }
}
```

### POST /api/bookings/confirm
Confirm booking (requires auth)

**Request Body:**
```json
{
  "trip_id": 1,
  "seat_ids": [1, 2],
  "passenger_names": ["John Doe", "Jane Doe"],
  "passenger_genders": ["Male", "Female"],
  "promo_code": "LAHORE20",  // optional
  "payment_method": "JazzCash"
}
```

**Response:**
```json
{
  "message": "Booking confirmed successfully",
  "bookingId": 1,
  "totalAmount": 4300
}
```

### GET /api/bookings/my
Get user's bookings (requires auth)

### GET /api/bookings/:id
Get booking details (requires auth)

### POST /api/bookings/:id/cancel
Cancel booking (requires auth)

---

## Promo Codes

### POST /api/promocodes/validate
Validate promo code (public)

**Request Body:**
```json
{
  "code": "LAHORE20",
  "route_id": 1
}
```

### GET /api/promocodes
Get all promo codes (Admin only)

### POST /api/promocodes
Create promo code (Admin only)

### PUT /api/promocodes/:id
Update promo code (Admin only)

### DELETE /api/promocodes/:id
Delete promo code (Admin only)

---

## Feedback

### POST /api/feedback/trips/:tripId
Submit feedback (requires auth)

**Request Body:**
```json
{
  "rating": 5,
  "comments": "Great service!",
  "booking_id": 1  // optional
}
```

### GET /api/feedback/trips/:tripId
Get feedback for a trip (public)

### GET /api/feedback/my
Get user's feedback (requires auth)

---

## Favourites

### GET /api/favourites/routes
Get user's favourite routes (requires auth)

### POST /api/favourites/routes
Add favourite route (requires auth)

**Request Body:**
```json
{
  "route_id": 1,
  "preferred_company_id": 1  // optional
}
```

### DELETE /api/favourites/routes/:id
Remove favourite route (requires auth)

---

## Admin Dashboard

### GET /api/admin/overview
Get admin dashboard overview (Admin only)

**Response:**
```json
{
  "stats": {
    "totalBookings": 150,
    "totalRevenue": 225000,
    "totalUsers": 50
  },
  "topRoutes": [...],
  "topCompaniesByRevenue": [...],
  "topCompaniesByRating": [...]
}
```

### GET /api/admin/bookings
Get all bookings with filters (Admin only)

**Query Parameters:**
- `status` (optional)
- `from_date` (optional)
- `to_date` (optional)

### GET /api/admin/trips
Get all trips with filters (Admin only)

---

## Bus Company Dashboard

### GET /api/company/overview
Get company dashboard overview (BusCompany only)

**Response:**
```json
{
  "stats": {
    "totalBookings": 50,
    "totalRevenue": 75000,
    "upcomingTrips": 10,
    "averageRating": 4.5,
    "totalRatings": 30
  },
  "upcomingTrips": [...],
  "recentFeedback": [...]
}
```

### GET /api/company/trips
Get company's trips (BusCompany only)

### GET /api/company/bookings
Get bookings for company's trips (BusCompany only)

### GET /api/company/feedback
Get feedback for company's trips (BusCompany only)

---

## Error Responses

All endpoints may return error responses:

```json
{
  "error": "Error message"
}
```

Internal error details are only written to the server log, never sent to the browser.

**Status Codes:**
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict (e.g. deleting a company that still has trips)
- 429: Too many chatbot messages
- 500: Internal Server Error

---

## Chatbot

### POST /api/chatbot/chat
Ask the support chatbot a question. Works only when `AI_API_KEY` (or a local `AI_BASE_URL`) is set in `backend/.env`; otherwise returns 503. Limited to 20 messages per 10 minutes per user.

**Request Body:**
```json
{
  "message": "How do I cancel a booking?",
  "conversationHistory": []
}
```
