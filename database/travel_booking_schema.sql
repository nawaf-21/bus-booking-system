-- Musafir bus booking DB (drops and recreates TravelBookingDB)

IF EXISTS (SELECT name FROM sys.databases WHERE name = 'TravelBookingDB')
BEGIN
    ALTER DATABASE TravelBookingDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE TravelBookingDB;
END
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'TravelBookingDB')
BEGIN
    CREATE DATABASE TravelBookingDB;
END
GO

USE TravelBookingDB;
GO

-- Cities
CREATE TABLE Cities (
    city_id INT IDENTITY(1,1) PRIMARY KEY,
    city_name VARCHAR(100) NOT NULL UNIQUE,
    province VARCHAR(50),
    created_at DATETIME DEFAULT GETDATE()
);
GO

-- Users
CREATE TABLE Users (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('Male', 'Female')) NULL,
    phone_no VARCHAR(20) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('Passenger', 'Admin', 'BusCompany')) NOT NULL DEFAULT 'Passenger',
    company_id INT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    is_active BIT DEFAULT 1
);
GO

-- Bus companies
CREATE TABLE BusCompanies (
    company_id INT IDENTITY(1,1) PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL UNIQUE,
    contact_email VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    office_city_id INT NOT NULL,
    logo_url VARCHAR(255) NULL,
    status VARCHAR(20) CHECK (status IN ('Active', 'Inactive', 'Suspended')) DEFAULT 'Active',
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (office_city_id) REFERENCES Cities(city_id)
);
GO

ALTER TABLE Users
ADD CONSTRAINT FK_Users_Company FOREIGN KEY (company_id) REFERENCES BusCompanies(company_id);
GO

-- Routes
CREATE TABLE Routes (
    route_id INT IDENTITY(1,1) PRIMARY KEY,
    from_city_id INT NOT NULL,
    to_city_id INT NOT NULL,
    distance_km DECIMAL(10,2) NULL,
    approx_duration_min INT NULL,
    base_fare_pkr DECIMAL(10,2) NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (from_city_id) REFERENCES Cities(city_id),
    FOREIGN KEY (to_city_id) REFERENCES Cities(city_id),
    CONSTRAINT CHK_Route_Different_Cities CHECK (from_city_id != to_city_id),
    CONSTRAINT UQ_Route_Unique UNIQUE (from_city_id, to_city_id)
);
GO

-- Buses
CREATE TABLE Buses (
    bus_id INT IDENTITY(1,1) PRIMARY KEY,
    company_id INT NOT NULL,
    bus_model VARCHAR(100) NULL,
    bus_name VARCHAR(100) NULL,
    bus_type VARCHAR(20) CHECK (bus_type IN ('AC', 'Non-AC', 'Sleeper', 'Seater')) NOT NULL,
    total_seats INT NOT NULL CHECK (total_seats > 0),
    status VARCHAR(20) CHECK (status IN ('Active', 'Inactive', 'Maintenance')) DEFAULT 'Active',
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (company_id) REFERENCES BusCompanies(company_id)
);
GO

-- Trips
CREATE TABLE Trips (
    trip_id INT IDENTITY(1,1) PRIMARY KEY,
    bus_id INT NOT NULL,
    route_id INT NOT NULL,
    departure_datetime DATETIME NOT NULL,
    arrival_datetime DATETIME NOT NULL,
    fare_pkr DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('Scheduled', 'InProgress', 'Completed', 'Cancelled')) DEFAULT 'Scheduled',
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (bus_id) REFERENCES Buses(bus_id),
    FOREIGN KEY (route_id) REFERENCES Routes(route_id),
    CONSTRAINT CHK_Trip_Valid_Datetime CHECK (arrival_datetime > departure_datetime)
);
GO

-- Seats
CREATE TABLE Seats (
    seat_id INT IDENTITY(1,1) PRIMARY KEY,
    bus_id INT NOT NULL,
    seat_number VARCHAR(10) NOT NULL,
    seat_row INT NOT NULL,
    seat_column INT NOT NULL,
    seat_type VARCHAR(20) CHECK (seat_type IN ('Window', 'Aisle', 'Middle')) NOT NULL,
    seat_gender_default VARCHAR(10) CHECK (seat_gender_default IN ('Male', 'Female', 'Neutral')) DEFAULT 'Neutral',
    FOREIGN KEY (bus_id) REFERENCES Buses(bus_id) ON DELETE CASCADE,
    CONSTRAINT UQ_Seat_Unique_Per_Bus UNIQUE (bus_id, seat_number)
);
GO

-- Seat adjacency (gender rule)
CREATE TABLE SeatAdjacency (
    adjacency_id INT IDENTITY(1,1) PRIMARY KEY,
    seat_id INT NOT NULL,
    adjacent_seat_id INT NOT NULL,
    FOREIGN KEY (seat_id) REFERENCES Seats(seat_id) ON DELETE CASCADE,
    FOREIGN KEY (adjacent_seat_id) REFERENCES Seats(seat_id) ON DELETE NO ACTION,
    CONSTRAINT CHK_Adjacency_Different CHECK (seat_id != adjacent_seat_id),
    CONSTRAINT UQ_Adjacency_Unique UNIQUE (seat_id, adjacent_seat_id)
);
GO

-- Bookings
CREATE TABLE Bookings (
    booking_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    trip_id INT NOT NULL,
    booking_datetime DATETIME DEFAULT GETDATE(),
    total_amount_pkr DECIMAL(10,2) NOT NULL,
    discount_amount_pkr DECIMAL(10,2) DEFAULT 0,
    promo_code_used VARCHAR(50) NULL,
    status VARCHAR(20) CHECK (status IN ('Pending', 'Confirmed', 'Cancelled', 'Refunded')) DEFAULT 'Pending',
    cancellation_reason VARCHAR(255) NULL,
    cancelled_at DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (trip_id) REFERENCES Trips(trip_id)
);
GO

-- Booking details
CREATE TABLE BookingDetails (
    booking_detail_id INT IDENTITY(1,1) PRIMARY KEY,
    booking_id INT NOT NULL,
    seat_id INT NOT NULL,
    passenger_name VARCHAR(100) NOT NULL,
    passenger_gender VARCHAR(10) CHECK (passenger_gender IN ('Male', 'Female', 'Neutral')) NOT NULL,
    fare_pkr DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (seat_id) REFERENCES Seats(seat_id),
    CONSTRAINT UQ_Booking_Seat_Unique UNIQUE (booking_id, seat_id)
);
GO

-- Payments
CREATE TABLE Payments (
    payment_id INT IDENTITY(1,1) PRIMARY KEY,
    booking_id INT NOT NULL,
    amount_pkr DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) CHECK (payment_method IN ('Card', 'JazzCash', 'Easypaisa', 'CashOnCounter')) NOT NULL,
    transaction_ref VARCHAR(100) UNIQUE NULL,
    status VARCHAR(20) CHECK (status IN ('Pending', 'Success', 'Failed', 'Refunded')) DEFAULT 'Pending',
    paid_at DATETIME NULL,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id)
);
GO

-- Invoices
CREATE TABLE Invoices (
    invoice_id INT IDENTITY(1,1) PRIMARY KEY,
    booking_id INT NOT NULL UNIQUE,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    invoice_date DATETIME DEFAULT GETDATE(),
    invoice_pdf_path VARCHAR(255) NULL,
    FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id)
);
GO

-- Feedback
CREATE TABLE Feedback (
    feedback_id INT IDENTITY(1,1) PRIMARY KEY,
    booking_id INT NULL,
    trip_id INT NOT NULL,
    user_id INT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5) NOT NULL,
    comments VARCHAR(MAX) NULL,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id),
    FOREIGN KEY (trip_id) REFERENCES Trips(trip_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    CONSTRAINT UQ_Feedback_User_Trip UNIQUE (user_id, trip_id)
);
GO

-- Promo codes
CREATE TABLE PromoCodes (
    promo_id INT IDENTITY(1,1) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    discount_type VARCHAR(20) CHECK (discount_type IN ('Percentage', 'Fixed')) NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
    valid_from DATETIME NOT NULL,
    valid_to DATETIME NOT NULL,
    max_uses INT NULL,
    used_count INT DEFAULT 0,
    is_active BIT DEFAULT 1,
    applicable_route_id INT NULL,
    applicable_company_id INT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (applicable_route_id) REFERENCES Routes(route_id),
    FOREIGN KEY (applicable_company_id) REFERENCES BusCompanies(company_id),
    CONSTRAINT CHK_Promo_Valid_Dates CHECK (valid_to > valid_from)
);
GO

-- Favourite routes
CREATE TABLE FavouriteRoutes (
    fav_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    route_id INT NOT NULL,
    preferred_company_id INT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (route_id) REFERENCES Routes(route_id),
    FOREIGN KEY (preferred_company_id) REFERENCES BusCompanies(company_id),
    CONSTRAINT UQ_Favourite_Unique UNIQUE (user_id, route_id, preferred_company_id)
);
GO

-- Admin actions log
CREATE TABLE AdminActions (
    action_id INT IDENTITY(1,1) PRIMARY KEY,
    admin_id INT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    details VARCHAR(MAX) NULL,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (admin_id) REFERENCES Users(user_id)
);
GO

-- Indexes
CREATE INDEX IX_Users_Email ON Users(email);
CREATE INDEX IX_Users_Role ON Users(role);
CREATE INDEX IX_Trips_Route ON Trips(route_id);
CREATE INDEX IX_Trips_Departure ON Trips(departure_datetime);
CREATE INDEX IX_Bookings_User ON Bookings(user_id);
CREATE INDEX IX_Bookings_Trip ON Bookings(trip_id);
CREATE INDEX IX_BookingDetails_Seat ON BookingDetails(seat_id);
CREATE INDEX IX_Feedback_Trip ON Feedback(trip_id);
CREATE INDEX IX_PromoCodes_Code ON PromoCodes(code);
GO

-- View for admin dashboard (top rated companies)
CREATE VIEW CompanyRatingView AS
SELECT
    bc.company_id,
    bc.company_name,
    COUNT(DISTINCT f.feedback_id) AS total_ratings,
    AVG(CAST(f.rating AS DECIMAL(3,2))) AS average_rating,
    MIN(f.rating) AS min_rating,
    MAX(f.rating) AS max_rating
FROM BusCompanies bc
LEFT JOIN Buses bus ON bc.company_id = bus.company_id
LEFT JOIN Trips t ON bus.bus_id = t.bus_id
LEFT JOIN Feedback f ON t.trip_id = f.trip_id
GROUP BY bc.company_id, bc.company_name;
GO

-- Sample data. Company names are real, everything else is made up.
-- Trip dates are relative to today.

-- Cities
INSERT INTO Cities (city_name, province) VALUES
('Lahore', 'Punjab'),                 -- 1
('Islamabad', 'Islamabad'),           -- 2
('Karachi', 'Sindh'),                 -- 3
('Multan', 'Punjab'),                 -- 4
('Faisalabad', 'Punjab'),             -- 5
('Peshawar', 'Khyber Pakhtunkhwa'),   -- 6
('Rawalpindi', 'Punjab'),             -- 7
('Abbottabad', 'Khyber Pakhtunkhwa'), -- 8
('Sialkot', 'Punjab'),                -- 9
('Mianwali', 'Punjab');               -- 10
GO

-- Bus companies
INSERT INTO BusCompanies (company_name, contact_email, contact_phone, office_city_id) VALUES
('Daewoo Express', 'info@daewoo.example', '0300-0000001', 1),
('Faisal Movers', 'info@faisalmovers.example', '0300-0000002', 5),
('Skyways', 'info@skyways.example', '0300-0000003', 7),
('Road Master', 'info@roadmaster.example', '0300-0000004', 1),
('Niazi Express', 'info@niazi.example', '0300-0000005', 1),
('Kohistan Express', 'info@kohistan.example', '0300-0000006', 7),
('Sania Express', 'info@sania.example', '0300-0000007', 1),
('FMBT', 'info@fmbt.example', '0300-0000008', 4),
('Q Connect', 'info@qconnect.example', '0300-0000009', 1);
GO

-- Users
-- Every sample account uses the password: Musafir123
INSERT INTO Users (full_name, email, password_hash, gender, phone_no, role, company_id) VALUES
('Ayesha Khan', 'passenger@demo.test', '$2a$10$PBVrIbt7jHvf1dJkdsqyBuOONxXpS4vA1vUTSo99SoFoSUFM66qXy', 'Female', '0300-1234567', 'Passenger', NULL),
('Daewoo Express Manager', 'company@demo.test', '$2a$10$PBVrIbt7jHvf1dJkdsqyBuOONxXpS4vA1vUTSo99SoFoSUFM66qXy', NULL, '0301-2345678', 'BusCompany', 1),
('System Admin', 'admin@demo.test', '$2a$10$PBVrIbt7jHvf1dJkdsqyBuOONxXpS4vA1vUTSo99SoFoSUFM66qXy', NULL, '0302-3456789', 'Admin', NULL),
('Bilal Ahmed', 'bilal@demo.test', '$2a$10$PBVrIbt7jHvf1dJkdsqyBuOONxXpS4vA1vUTSo99SoFoSUFM66qXy', 'Male', '0303-4567890', 'Passenger', NULL),
('Sana Iqbal', 'sana@demo.test', '$2a$10$PBVrIbt7jHvf1dJkdsqyBuOONxXpS4vA1vUTSo99SoFoSUFM66qXy', 'Female', '0304-5678901', 'Passenger', NULL),
('Faisal Movers Desk', 'faisal@demo.test', '$2a$10$PBVrIbt7jHvf1dJkdsqyBuOONxXpS4vA1vUTSo99SoFoSUFM66qXy', NULL, '0305-6789012', 'BusCompany', 2),
('Usman Tariq', 'usman@demo.test', '$2a$10$PBVrIbt7jHvf1dJkdsqyBuOONxXpS4vA1vUTSo99SoFoSUFM66qXy', 'Male', '0306-1112233', 'Passenger', NULL),
('Hira Malik', 'hira@demo.test', '$2a$10$PBVrIbt7jHvf1dJkdsqyBuOONxXpS4vA1vUTSo99SoFoSUFM66qXy', 'Female', '0307-2223344', 'Passenger', NULL),
('Ahmed Raza', 'ahmed@demo.test', '$2a$10$PBVrIbt7jHvf1dJkdsqyBuOONxXpS4vA1vUTSo99SoFoSUFM66qXy', 'Male', '0308-3334455', 'Passenger', NULL),
('Zainab Ali', 'zainab@demo.test', '$2a$10$PBVrIbt7jHvf1dJkdsqyBuOONxXpS4vA1vUTSo99SoFoSUFM66qXy', 'Female', '0309-4445566', 'Passenger', NULL),
('Hamza Sheikh', 'hamza@demo.test', '$2a$10$PBVrIbt7jHvf1dJkdsqyBuOONxXpS4vA1vUTSo99SoFoSUFM66qXy', 'Male', '0310-5556677', 'Passenger', NULL),
('Maryam Noor', 'maryam@demo.test', '$2a$10$PBVrIbt7jHvf1dJkdsqyBuOONxXpS4vA1vUTSo99SoFoSUFM66qXy', 'Female', '0311-6667788', 'Passenger', NULL),
('Q Connect Desk', 'qconnect@demo.test', '$2a$10$PBVrIbt7jHvf1dJkdsqyBuOONxXpS4vA1vUTSo99SoFoSUFM66qXy', NULL, '0312-7778899', 'BusCompany', 9),
('Skyways Desk', 'skyways@demo.test', '$2a$10$PBVrIbt7jHvf1dJkdsqyBuOONxXpS4vA1vUTSo99SoFoSUFM66qXy', NULL, '0313-8889900', 'BusCompany', 3);
GO

-- Routes (shared by all companies)
INSERT INTO Routes (from_city_id, to_city_id, distance_km, approx_duration_min, base_fare_pkr) VALUES
(1, 2, 375, 270, 2800),    -- 1  Lahore -> Islamabad
(2, 1, 375, 270, 2800),    -- 2  Islamabad -> Lahore
(1, 3, 1210, 1080, 7000),  -- 3  Lahore -> Karachi
(5, 1, 180, 150, 1300),    -- 4  Faisalabad -> Lahore
(7, 1, 380, 300, 2400),    -- 5  Rawalpindi -> Lahore
(1, 10, 330, 330, 2000),   -- 6  Lahore -> Mianwali
(7, 8, 125, 150, 900),     -- 7  Rawalpindi -> Abbottabad
(1, 7, 380, 300, 2300),    -- 8  Lahore -> Rawalpindi
(4, 1, 340, 300, 2200),    -- 9  Multan -> Lahore
(1, 4, 340, 300, 2500),    -- 10 Lahore -> Multan
(1, 9, 135, 150, 1100),    -- 11 Lahore -> Sialkot
(2, 6, 185, 180, 1400),    -- 12 Islamabad -> Peshawar
(6, 2, 185, 180, 1400),    -- 13 Peshawar -> Islamabad
(3, 1, 1210, 1080, 7000),  -- 14 Karachi -> Lahore
(1, 5, 180, 150, 1300),    -- 15 Lahore -> Faisalabad
(8, 7, 125, 150, 900),     -- 16 Abbottabad -> Rawalpindi
(9, 1, 135, 150, 1100),    -- 17 Sialkot -> Lahore
(10, 1, 330, 330, 2000),   -- 18 Mianwali -> Lahore
(6, 1, 510, 420, 3200),    -- 19 Peshawar -> Lahore
(1, 6, 510, 420, 3200),    -- 20 Lahore -> Peshawar
(2, 3, 1410, 1260, 8000),  -- 21 Islamabad -> Karachi
(3, 4, 900, 840, 5500),    -- 22 Karachi -> Multan
(4, 3, 900, 840, 5500),    -- 23 Multan -> Karachi
(2, 4, 540, 480, 3300),    -- 24 Islamabad -> Multan
(5, 2, 300, 240, 2200),    -- 25 Faisalabad -> Islamabad
(2, 5, 300, 240, 2200),    -- 26 Islamabad -> Faisalabad
(3, 2, 1410, 1260, 8000),  -- 27 Karachi -> Islamabad
(4, 2, 540, 480, 3300);    -- 28 Multan -> Islamabad
GO

-- Buses
INSERT INTO Buses (company_id, bus_model, bus_name, bus_type, total_seats, status) VALUES
(1, 'Yutong ZK6122', 'DE-101', 'AC', 40, 'Active'),            -- 1
(1, 'Yutong ZK6122', 'DE-205', 'Sleeper', 28, 'Active'),       -- 2
(1, 'Hino RK8', 'DE-310', 'AC', 40, 'Maintenance'),            -- 3
(2, 'Yutong ZK6122', 'FM-12', 'AC', 40, 'Active'),             -- 4
(2, 'Hino RK8', 'FM-18', 'Seater', 36, 'Active'),              -- 5
(3, 'Yutong ZK6122', 'SK-7', 'AC', 40, 'Active'),              -- 6
(4, 'Hino RK8', 'RM-3', 'AC', 40, 'Active'),                   -- 7
(5, 'Hino RK8', 'NE-21', 'Non-AC', 36, 'Active'),              -- 8
(6, 'Hino RK8', 'KE-5', 'Seater', 36, 'Active'),               -- 9
(7, 'Yutong ZK6122', 'SE-9', 'AC', 40, 'Active'),              -- 10
(8, 'Hino RK8', 'FB-4', 'Non-AC', 36, 'Active'),               -- 11
(9, 'Yutong ZK6122', 'QC-1', 'Sleeper', 28, 'Active'),         -- 12
(2, 'Yutong ZK6122', 'FM-25', 'AC', 40, 'Active'),             -- 13
(3, 'Hino RK8', 'SK-11', 'Non-AC', 36, 'Active'),              -- 14
(4, 'Yutong ZK6122', 'RM-8', 'Sleeper', 28, 'Active'),         -- 15
(5, 'Yutong ZK6122', 'NE-30', 'AC', 40, 'Active'),             -- 16
(6, 'Hino RK8', 'KE-9', 'AC', 40, 'Active'),                   -- 17
(7, 'Hino RK8', 'SE-14', 'Seater', 36, 'Active'),              -- 18
(8, 'Yutong ZK6122', 'FB-10', 'AC', 40, 'Active'),             -- 19
(9, 'Yutong ZK6122', 'QC-6', 'AC', 40, 'Active'),              -- 20
(1, 'Yutong ZK6122', 'DE-412', 'AC', 40, 'Active'),            -- 21
(1, 'Yutong ZK6122', 'DE-520', 'Sleeper', 28, 'Active'),       -- 22
(2, 'Yutong ZK6122', 'FM-31', 'Sleeper', 28, 'Active'),        -- 23
(3, 'Yutong ZK6122', 'SK-15', 'AC', 40, 'Active'),             -- 24
(4, 'Hino RK8', 'RM-12', 'AC', 40, 'Active'),                  -- 25
(9, 'Hino RK8', 'QC-9', 'Seater', 36, 'Active');               -- 26
GO

-- Seats for every bus, 4 per row (1 and 4 are window)
DECLARE @BusId INT = 1;
DECLARE @MaxBus INT = (SELECT MAX(bus_id) FROM Buses);
DECLARE @Seats INT, @i INT, @Row INT, @Col INT;

WHILE @BusId <= @MaxBus
BEGIN
    SET @Seats = (SELECT total_seats FROM Buses WHERE bus_id = @BusId);
    SET @i = 1;
    WHILE @i <= @Seats
    BEGIN
        SET @Row = (@i - 1) / 4 + 1;
        SET @Col = (@i - 1) % 4 + 1;
        INSERT INTO Seats (bus_id, seat_number, seat_row, seat_column, seat_type, seat_gender_default)
        VALUES (
            @BusId,
            CHAR(64 + @Row) + CAST(@Col AS VARCHAR(2)),
            @Row,
            @Col,
            CASE WHEN @Col IN (1, 4) THEN 'Window' ELSE 'Aisle' END,
            'Neutral'
        );
        SET @i = @i + 1;
    END
    SET @BusId = @BusId + 1;
END
GO

-- Adjacent seats for the gender rule
INSERT INTO SeatAdjacency (seat_id, adjacent_seat_id)
SELECT s1.seat_id, s2.seat_id
FROM Seats s1
JOIN Seats s2 ON s1.bus_id = s2.bus_id
    AND s1.seat_row = s2.seat_row
    AND ((s1.seat_column = 1 AND s2.seat_column = 2) OR (s1.seat_column = 3 AND s2.seat_column = 4));
GO

-- Trips (day = days from today, negative = past)
DECLARE @Today DATETIME = CAST(CAST(GETDATE() AS DATE) AS DATETIME);
DECLARE @TripPlan TABLE (sort_order INT, bus_id INT, route_id INT, day INT, minute_of_day INT, fare DECIMAL(10,2), status VARCHAR(20));

INSERT INTO @TripPlan VALUES
(1, 1, 1, 1, 8*60, 2800, 'Scheduled'),
(2, 12, 1, 1, 10*60, 3000, 'Scheduled'),
(3, 7, 1, 1, 13*60+30, 2600, 'Scheduled'),
(4, 1, 2, 2, 9*60, 2800, 'Scheduled'),
(5, 2, 10, 2, 22*60, 2500, 'Scheduled'),
(6, 4, 4, 1, 7*60, 1300, 'Scheduled'),
(7, 2, 3, 3, 18*60, 7000, 'Scheduled'),
(8, 9, 7, 2, 6*60+30, 900, 'Scheduled'),
(9, 1, 1, 4, 8*60, 2900, 'Scheduled'),
(10, 6, 5, 3, 9*60, 2400, 'Scheduled'),
(11, 8, 6, 2, 11*60, 2000, 'Scheduled'),
(12, 10, 8, 3, 15*60, 2300, 'Scheduled'),
(13, 11, 9, 4, 7*60, 2200, 'Scheduled'),
(14, 5, 3, 5, 17*60, 6200, 'Scheduled'),
(15, 1, 1, -3, 8*60, 2800, 'Completed'),
(16, 2, 3, -6, 18*60, 7000, 'Completed'),
(17, 12, 1, -4, 10*60, 3000, 'Completed'),
(18, 4, 4, -2, 7*60, 1300, 'Completed');

INSERT INTO Trips (bus_id, route_id, departure_datetime, arrival_datetime, fare_pkr, status)
SELECT p.bus_id, p.route_id,
       DATEADD(MINUTE, p.minute_of_day, DATEADD(DAY, p.day, @Today)),
       DATEADD(MINUTE, p.minute_of_day + r.approx_duration_min, DATEADD(DAY, p.day, @Today)),
       p.fare, p.status
FROM @TripPlan p
INNER JOIN Routes r ON p.route_id = r.route_id
ORDER BY p.sort_order;
GO

-- Extra trips: buses 13-26 go back and forth daily, -10 to +14 days
DECLARE @Today DATETIME = CAST(CAST(GETDATE() AS DATE) AS DATETIME);
DECLARE @BusPlan TABLE (bus_id INT, out_route INT, back_route INT, minute_of_day INT);

INSERT INTO @BusPlan VALUES
(13, 25, 26, 8*60),
(14, 12, 13, 7*60+30),
(15, 3, 14, 19*60),
(16, 6, 18, 10*60),
(17, 7, 16, 14*60),
(18, 11, 17, 12*60),
(19, 22, 23, 20*60),
(20, 20, 19, 9*60+30),
(21, 2, 1, 16*60),
(22, 21, 27, 17*60),
(23, 10, 9, 23*60),
(24, 8, 5, 7*60),
(25, 24, 28, 11*60),
(26, 15, 4, 18*60);

WITH Days AS (
    SELECT -10 AS day_no
    UNION ALL
    SELECT day_no + 1 FROM Days WHERE day_no < 14
),
NewTrips AS (
    SELECT p.bus_id, d.day_no,
           CASE WHEN ABS(d.day_no % 2) = 0 THEN p.out_route ELSE p.back_route END AS route_id,
           DATEADD(MINUTE, p.minute_of_day, DATEADD(DAY, d.day_no, @Today)) AS departure
    FROM @BusPlan p CROSS JOIN Days d
)
INSERT INTO Trips (bus_id, route_id, departure_datetime, arrival_datetime, fare_pkr, status)
SELECT pl.bus_id, pl.route_id, pl.departure,
       DATEADD(MINUTE, r.approx_duration_min, pl.departure),
       r.base_fare_pkr + CASE b.bus_type WHEN 'Sleeper' THEN 500 WHEN 'Non-AC' THEN -200 WHEN 'Seater' THEN -100 ELSE 0 END,
       CASE
           WHEN pl.bus_id = 14 AND pl.day_no = 6 THEN 'Cancelled'
           WHEN pl.departure < GETDATE() THEN 'Completed'
           ELSE 'Scheduled'
       END
FROM NewTrips pl
INNER JOIN Routes r ON pl.route_id = r.route_id
INNER JOIN Buses b ON pl.bus_id = b.bus_id
ORDER BY pl.departure, pl.bus_id;
GO

-- Bookings, seats, payments, invoices
DECLARE @BookingPlan TABLE (booking_no INT, user_id INT, trip_id INT, seat1 VARCHAR(10), seat2 VARCHAR(10), payment_method VARCHAR(20), status VARCHAR(20), discount DECIMAL(10,2), promo VARCHAR(50));

INSERT INTO @BookingPlan VALUES
(1, 1, 1, 'A1', 'A2', 'Card', 'Confirmed', 0, NULL),
(2, 4, 1, 'B1', NULL, 'JazzCash', 'Confirmed', 0, NULL),
(3, 5, 3, 'A3', NULL, 'Easypaisa', 'Confirmed', 0, NULL),
(4, 1, 7, 'C1', NULL, 'Card', 'Cancelled', 0, NULL),
(5, 4, 4, 'C3', 'C4', 'CashOnCounter', 'Confirmed', 0, NULL),
(6, 1, 15, 'A4', NULL, 'Card', 'Confirmed', 0, NULL),
(7, 5, 16, 'B3', 'B4', 'Card', 'Confirmed', 1400, 'MUSAFIR10'),
(8, 4, 9, 'A1', NULL, 'JazzCash', 'Confirmed', 0, NULL),
(9, 5, 2, 'A2', NULL, 'Card', 'Confirmed', 0, NULL),
(10, 1, 6, 'A2', NULL, 'Easypaisa', 'Confirmed', 0, NULL),
(11, 4, 17, 'A3', NULL, 'Card', 'Confirmed', 0, NULL),
(12, 5, 18, 'A2', NULL, 'JazzCash', 'Confirmed', 0, NULL);

-- Extra bookings on the extra trips (window seats only)
DECLARE @Passengers TABLE (pos INT, user_id INT);
INSERT INTO @Passengers VALUES (0, 1), (1, 4), (2, 5), (3, 7), (4, 8), (5, 9), (6, 10), (7, 11), (8, 12);

INSERT INTO @BookingPlan
SELECT 12 + ROW_NUMBER() OVER (ORDER BY t.trip_id, k.n),
       p.user_id,
       t.trip_id,
       CHAR(64 + k.n) + CASE WHEN k.n % 2 = 1 THEN '1' ELSE '4' END,
       NULL,
       CASE (t.trip_id + k.n) % 4 WHEN 0 THEN 'Card' WHEN 1 THEN 'JazzCash' WHEN 2 THEN 'Easypaisa' ELSE 'CashOnCounter' END,
       CASE WHEN (t.trip_id + k.n) % 11 = 0 THEN 'Cancelled' ELSE 'Confirmed' END,
       CASE WHEN (t.trip_id + k.n) % 7 = 0 THEN t.fare_pkr * 0.10 ELSE 0 END,
       CASE WHEN (t.trip_id + k.n) % 7 = 0 THEN 'MUSAFIR10' END
FROM Trips t
CROSS JOIN (VALUES (1), (2), (3)) AS k(n)
INNER JOIN @Passengers p ON p.pos = (t.trip_id * 3 + k.n) % 9
WHERE t.trip_id > 18
  AND t.status <> 'Cancelled'
  AND k.n <= t.trip_id % 4;

DECLARE @No INT = 1, @BookingId INT, @BookedAt DATETIME;
DECLARE @UserId INT, @TripId INT, @Seat1 VARCHAR(10), @Seat2 VARCHAR(10), @Method VARCHAR(20),
        @Status VARCHAR(20), @Discount DECIMAL(10,2), @Promo VARCHAR(50),
        @Fare DECIMAL(10,2), @BusId INT, @Departure DATETIME, @SeatCount INT,
        @Name VARCHAR(100), @Gender VARCHAR(10);

WHILE @No <= (SELECT MAX(booking_no) FROM @BookingPlan)
BEGIN
    SELECT @UserId = user_id, @TripId = trip_id, @Seat1 = seat1, @Seat2 = seat2, @Method = payment_method,
           @Status = status, @Discount = discount, @Promo = promo
    FROM @BookingPlan WHERE booking_no = @No;

    SELECT @Fare = fare_pkr, @BusId = bus_id, @Departure = departure_datetime FROM Trips WHERE trip_id = @TripId;
    SELECT @Name = full_name, @Gender = gender FROM Users WHERE user_id = @UserId;
    SET @SeatCount = CASE WHEN @Seat2 IS NULL THEN 1 ELSE 2 END;

    SET @BookedAt = DATEADD(DAY, -2, @Departure);
    IF @BookedAt > GETDATE() SET @BookedAt = DATEADD(HOUR, -(@No % 48 + 1), GETDATE());

    INSERT INTO Bookings (user_id, trip_id, booking_datetime, total_amount_pkr, discount_amount_pkr, promo_code_used, status, cancellation_reason, cancelled_at)
    VALUES (@UserId, @TripId, @BookedAt, @Fare * @SeatCount, @Discount, @Promo, @Status,
            CASE WHEN @Status = 'Cancelled' THEN 'Cancelled by user' END,
            CASE WHEN @Status = 'Cancelled' THEN DATEADD(HOUR, 1, @BookedAt) END);
    SET @BookingId = SCOPE_IDENTITY();

    INSERT INTO BookingDetails (booking_id, seat_id, passenger_name, passenger_gender, fare_pkr)
    SELECT @BookingId, seat_id,
           CASE WHEN seat_number = @Seat1 THEN @Name ELSE LEFT(@Name, CHARINDEX(' ', @Name + ' ') - 1) + '''s companion' END,
           @Gender, @Fare
    FROM Seats
    WHERE bus_id = @BusId AND seat_number IN (@Seat1, @Seat2);

    INSERT INTO Payments (booking_id, amount_pkr, payment_method, transaction_ref, status, paid_at)
    VALUES (@BookingId, @Fare * @SeatCount - @Discount, @Method, 'TXN-SEED-' + RIGHT('0000' + CAST(@BookingId AS VARCHAR(4)), 4),
            CASE WHEN @Status = 'Cancelled' THEN 'Refunded' ELSE 'Success' END, @BookedAt);

    INSERT INTO Invoices (booking_id, invoice_number, invoice_date)
    VALUES (@BookingId, 'INV-SEED-' + RIGHT('0000' + CAST(@BookingId AS VARCHAR(4)), 4), @BookedAt);

    SET @No = @No + 1;
END
GO

-- Reviews
INSERT INTO Feedback (booking_id, trip_id, user_id, rating, comments, created_at)
SELECT b.booking_id, b.trip_id, b.user_id, r.rating, r.comments, DATEADD(HOUR, 12, t.arrival_datetime)
FROM (VALUES
    (1, 15, 5, 'Left on time and the bus was clean.'),
    (5, 16, 4, 'Comfortable sleeper seats. The rest stop felt a little long.'),
    (4, 17, 5, 'Smooth ride and helpful staff.'),
    (5, 18, 4, 'Arrived as scheduled.')
) AS r(user_id, trip_id, rating, comments)
INNER JOIN Bookings b ON b.user_id = r.user_id AND b.trip_id = r.trip_id
INNER JOIN Trips t ON t.trip_id = b.trip_id;
GO

-- More reviews for the extra past trips
WITH Reviews AS (
    SELECT b.booking_id, b.trip_id, b.user_id, t.arrival_datetime,
           CASE (b.booking_id * 7 + b.trip_id) % 10
               WHEN 0 THEN 1
               WHEN 1 THEN 2
               WHEN 2 THEN 3 WHEN 3 THEN 3
               WHEN 4 THEN 4 WHEN 5 THEN 4 WHEN 6 THEN 4
               ELSE 5
           END AS rating
    FROM Bookings b
    INNER JOIN Trips t ON t.trip_id = b.trip_id
    WHERE b.trip_id > 18
      AND b.status = 'Confirmed'
      AND t.status = 'Completed'
      AND t.arrival_datetime < DATEADD(HOUR, -12, GETDATE())
      AND b.booking_id % 3 <> 0
)
INSERT INTO Feedback (booking_id, trip_id, user_id, rating, comments, created_at)
SELECT booking_id, trip_id, user_id, rating,
       CASE rating
           WHEN 1 THEN 'Bus was two hours late and nobody told us why.'
           WHEN 2 THEN 'AC was not working for most of the trip.'
           WHEN 3 THEN CASE WHEN booking_id % 2 = 0 THEN 'Average experience.' ELSE 'The bus left a bit late but the ride was fine.' END
           WHEN 4 THEN CASE WHEN booking_id % 2 = 0 THEN 'Comfortable seats and on time.' ELSE 'Clean bus and polite hostess.' END
           ELSE CASE WHEN booking_id % 2 = 0 THEN 'Excellent service, will travel again.' ELSE 'Very smooth ride, left exactly on time.' END
       END,
       DATEADD(HOUR, 12, arrival_datetime)
FROM Reviews;
GO

-- Promo codes
INSERT INTO PromoCodes (code, description, discount_type, discount_value, valid_from, valid_to, max_uses, used_count, applicable_route_id, applicable_company_id) VALUES
('MUSAFIR10', '10% off any trip', 'Percentage', 10, DATEADD(MONTH, -1, GETDATE()), DATEADD(YEAR, 1, GETDATE()), 500, 0, NULL, NULL),
('LAHORE20', '20% off Lahore to Islamabad', 'Percentage', 20, DATEADD(MONTH, -1, GETDATE()), DATEADD(YEAR, 1, GETDATE()), 100, 0, 1, NULL),
('DAEWOO200', 'PKR 200 off Daewoo Express trips', 'Fixed', 200, DATEADD(MONTH, -1, GETDATE()), DATEADD(YEAR, 1, GETDATE()), 200, 0, NULL, 1),
('KARACHI500', 'PKR 500 off Lahore to Karachi', 'Fixed', 500, DATEADD(MONTH, -1, GETDATE()), DATEADD(YEAR, 1, GETDATE()), 100, 0, 3, NULL),
('QCONNECT15', '15% off Q Connect trips', 'Percentage', 15, DATEADD(MONTH, -1, GETDATE()), DATEADD(YEAR, 1, GETDATE()), 150, 0, NULL, 9),
('OLDOFFER', 'Expired offer (for testing)', 'Percentage', 25, DATEADD(MONTH, -3, GETDATE()), DATEADD(MONTH, -1, GETDATE()), 100, 0, NULL, NULL);

-- Update MUSAFIR10 used count
UPDATE PromoCodes
SET used_count = (SELECT COUNT(*) FROM Bookings WHERE promo_code_used = 'MUSAFIR10')
WHERE code = 'MUSAFIR10';
GO

-- Favourite routes
INSERT INTO FavouriteRoutes (user_id, route_id, preferred_company_id) VALUES
(1, 1, 1),
(1, 3, 2),
(4, 2, 1),
(4, 20, 9),
(5, 11, 7),
(7, 12, 3),
(8, 25, 2);
GO

PRINT 'Musafir database and sample data created successfully!';
GO
