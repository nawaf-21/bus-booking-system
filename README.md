# Musafir - Bus Booking System

This is our Web Programming project. Musafir is a website for booking intercity bus tickets in Pakistan. Passengers can search for buses and book seats, bus companies can manage their buses and trips, and the admin can manage the whole system.

The project has three parts:

- **frontend** - the website (React)
- **backend** - the API (Node.js and Express)
- **database** - SQL Server tables and sample data

## Features

**Passenger**
- Search buses by city, date, bus type and company
- Choose seats and book tickets (with the gender seat rule)
- Apply promo codes at checkout
- View, cancel and download invoices for bookings
- Save favourite routes and review past trips

**Bus Company**
- Dashboard with bookings, revenue and ratings
- Add and edit routes, buses and trips
- See customer feedback

**Admin**
- Dashboard with overall stats
- Manage users and bus companies
- Search all bookings and trips
- Cancel bookings, give refunds and reserve seats

There is also a support chatbot on every page. It needs an AI key in the backend to work (see below).

## Built with

- React, Vite, React Router, Axios, jsPDF
- Node.js, Express, JWT, bcrypt
- Microsoft SQL Server

## How to run

You need [Node.js](https://nodejs.org/) and SQL Server (for example SQL Server Express with SSMS).

### Quick look (website only, no database)

```bash
cd frontend
npm install
npm run demo
```

Then open http://localhost:3000. This uses sample data inside the website, so the backend is not needed. Click **Login as User** or **Login as Admin**.

### Full project

**1. Database**

Open `database/travel_booking_schema.sql` in SSMS and run it. It creates the `TravelBookingDB` database with sample data.

**2. Backend**

```bash
cd backend
npm install
```

Copy `backend/.env.example` to `backend/.env` and fill in your SQL Server login and a long random `JWT_SECRET`. Then:

```bash
npm start
```

The API runs on http://localhost:5000. You can check it at http://localhost:5000/api/health.

**3. Frontend**

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Then open http://localhost:3000.

### Sample accounts

All sample accounts use the password `Musafir123`. New passwords must be at least 8 characters with at least one letter and one number. While running `npm run dev` or `npm run demo`, the Login page also has quick-login buttons for a passenger, a bus company and the admin.

| Role | Email |
|------|-------|
| Passenger | passenger@demo.test |
| Bus company (Daewoo Express) | company@demo.test |
| Admin | admin@demo.test |

More passengers: `bilal@`, `sana@`, `usman@`, `hira@`, `ahmed@`, `zainab@`, `hamza@` and `maryam@demo.test`. More bus companies: `faisal@demo.test` (Faisal Movers), `skyways@demo.test` (Skyways) and `qconnect@demo.test` (Q Connect).

The sample data has 10 cities, 9 bus companies, 28 routes and 26 buses. Trips run every day from 10 days ago to 14 days from today, so there are always upcoming trips, past trips with reviews, and bookings for the dashboards.

Try searching **Lahore to Islamabad** and use the promo code `MUSAFIR10` at checkout. Other codes: `LAHORE20` (Lahore to Islamabad only), `KARACHI500` (Lahore to Karachi only), `DAEWOO200` and `QCONNECT15` (only for that company). `OLDOFFER` has expired, to show the error message.

> The bus company names in the sample data are real Pakistani companies, used only to make the project look realistic. The trips, prices, people, ratings and reviews are made up. Payments are simulated; no real money is involved.

### Chatbot

The chatbot works with any OpenAI-compatible AI service, including free ones like Groq or Google Gemini. Put the key in `backend/.env` (`AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`). Never put the key in the frontend. Without a key the chatbot just says it can't answer right now.

## Project structure

```
frontend/      React website
backend/
  controllers/ What each API request does
  routes/      API addresses
  middleware/  Login check
  config/      Database connection
database/      SQL Server schema, sample data and sample queries
docs/          API list and database design notes
```

## Team

- **Nawaf Ahmed**: project setup, login and register, passenger booking pages, sample data, database, backend for login, search and bookings
- **Syed Annas Ali**: admin dashboard, bus company dashboard, chatbot, backend for admin, company and chatbot, documentation
