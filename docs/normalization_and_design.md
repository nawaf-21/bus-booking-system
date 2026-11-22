# Database Normalization and Design Documentation

## 1. Initial Database Design (Deliverable I)

The initial database design included basic tables:
- **Users**: Passengers and Admin
- **Buses**: Directly stored operator name, cities, and schedule information
- **Seats**: Linked to buses
- **Bookings**: Simple booking records
- **Payments**: Payment information
- **Feedback**: User feedback

### Issues Identified:

1. **Redundancy**: Bus operator information was repeated in each bus record
2. **No Route Normalization**: Cities and routes were embedded in bus records
3. **Missing Relationships**: No proper separation between routes, trips, and buses
4. **Gender Rules**: No proper structure for gender-based seat adjacency
5. **Limited Features**: Missing promo codes, favorites, ratings per trip

---

## 2. Functional Dependencies Analysis

### Initial Issues:

1. **Partial Dependencies**:
   - In the original design, bus operator information depended on bus_id, but operator details should depend on company_id
   - Route information (from_city, to_city) was stored in Buses table, creating redundancy

2. **Transitive Dependencies**:
   - Company details (contact info, office city) were not properly separated
   - Route information was mixed with trip/schedule information

3. **Missing Normalization**:
   - Cities were stored as strings, not normalized
   - No proper route entity

---

## 3. Normalization Process

### Step 1: First Normal Form (1NF)

**Goal**: Eliminate repeating groups and ensure atomic values

**Changes**:
- Created separate **Cities** table to store city information
- Separated route information from bus records
- Ensured all attributes contain atomic values

### Step 2: Second Normal Form (2NF)

**Goal**: Remove partial dependencies

**Changes**:
- Created **BusCompanies** table to store company information separately
- Created **Routes** table to store route information (from_city_id, to_city_id)
- **Buses** table now only contains bus-specific information with foreign key to BusCompanies
- **Trips** table created to separate schedule information from bus information

**Functional Dependencies Identified**:
- `bus_id → company_id, bus_type, total_seats`
- `company_id → company_name, contact_email, contact_phone, office_city_id`
- `route_id → from_city_id, to_city_id, distance_km, base_fare_pkr`
- `trip_id → bus_id, route_id, departure_datetime, arrival_datetime, fare_pkr`

### Step 3: Third Normal Form (3NF)

**Goal**: Remove transitive dependencies

**Changes**:
- **Users** table: Removed any transitive dependencies by properly linking to BusCompanies via company_id
- **Routes** table: All attributes directly depend on route_id (no transitive dependencies)
- **Trips** table: All attributes directly depend on trip_id

**Verification**:
- No non-key attribute depends on another non-key attribute
- All attributes depend only on the primary key

### Step 4: Boyce-Codd Normal Form (BCNF)

**Goal**: Ensure every determinant is a candidate key

**Final Schema Verification**:

1. **Cities**: `city_id` is the only candidate key ✓
2. **Users**: `user_id` is the only candidate key, `email` is unique ✓
3. **BusCompanies**: `company_id` is the only candidate key, `company_name` is unique ✓
4. **Routes**: `route_id` is the only candidate key, `(from_city_id, to_city_id)` is unique ✓
5. **Buses**: `bus_id` is the only candidate key ✓
6. **Trips**: `trip_id` is the only candidate key ✓
7. **Seats**: `seat_id` is the only candidate key, `(bus_id, seat_number)` is unique ✓
8. **Bookings**: `booking_id` is the only candidate key ✓
9. **BookingDetails**: `booking_detail_id` is the only candidate key, `(booking_id, seat_id)` is unique ✓

**All tables are in BCNF** ✓

---

## 4. Final Normalized Schema

### Core Entities:

1. **Cities**: Normalized city information
2. **Users**: Supports Passengers, Admin, and BusCompany roles
3. **BusCompanies**: Separate entity for bus operators
4. **Routes**: Normalized route information (from_city → to_city)
5. **Buses**: Bus information linked to companies
6. **Trips**: Schedule information linking buses to routes
7. **Seats**: Seat layout per bus
8. **SeatAdjacency**: Adjacency relationships for gender rules
9. **Bookings**: Booking records
10. **BookingDetails**: Individual seat bookings with passenger info
11. **Payments**: Payment records
12. **Invoices**: Invoice information
13. **Feedback**: Trip ratings and comments
14. **PromoCodes**: Discount codes
15. **FavouriteRoutes**: User favorite routes
16. **AdminActions**: Audit log

### Key Design Decisions:

1. **Gender-based Seating**:
   - `Seats.seat_gender_default`: Default gender preference for a seat
   - `BookingDetails.passenger_gender`: Actual passenger gender
   - `SeatAdjacency`: Defines which seats are adjacent for rule enforcement
   - Backend logic validates that adjacent seats don't have opposite genders

2. **Pakistani Context**:
   - Cities: Lahore, Islamabad, Karachi, etc.
   - Currency: PKR (Pakistani Rupees)
   - Payment methods: JazzCash, Easypaisa, Card, CashOnCounter
   - Bus companies: Daewoo Express, Faisal Movers, Bilal Travels, etc.

3. **Multi-role Support**:
   - Users can be Passengers, Admin, or BusCompany
   - BusCompany users are linked to their company via `company_id`
   - Role-based access control in backend and frontend

4. **Flexible Pricing**:
   - Base fare stored in Routes
   - Trip-specific fare can override base fare
   - Promo codes can apply discounts

---

## 5. Benefits of Normalization

1. **Data Integrity**: No redundancy, updates are consistent
2. **Flexibility**: Easy to add new routes, cities, companies
3. **Query Efficiency**: Proper indexes on foreign keys
4. **Maintainability**: Clear separation of concerns
5. **Scalability**: Can handle large datasets efficiently

---

## 6. Views for Analytics

Created views to support dashboard analytics:
- **BookingSummaryView**: Complete booking information
- **TripOccupancyView**: Real-time occupancy calculations
- **RevenueByRouteView**: Route-wise revenue aggregation
- **CompanyRatingView**: Average ratings per company

These views are used by the backend APIs to power the React dashboards.

---

## Conclusion

The database is normalized to **BCNF** with:
- No redundancy
- Proper foreign key relationships
- Support for all required features
- Efficient querying through views
- Scalable design for future enhancements

