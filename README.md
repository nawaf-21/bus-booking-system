# Musafir - Bus Booking System

This is our Web Programming project. Musafir is a website for booking intercity bus tickets in Pakistan. Passengers can search for buses and book seats, bus companies can manage their buses and trips, and the admin can manage the whole system.

Right now this repo only has the **frontend**. We will add the backend and database later.

## Features

**Passenger**
- Search buses by city, date, bus type and company
- Choose seats and book tickets
- Apply promo codes at checkout
- View, cancel and download invoices for bookings
- Save favourite routes

**Bus Company**
- Dashboard with bookings, revenue and ratings
- Add and edit routes, buses and trips
- See customer feedback

**Admin**
- Dashboard with overall stats
- Manage users and bus companies
- Search all bookings and trips
- Cancel bookings, give refunds and reserve seats

There is also a chatbot on every page. It will work once the backend is added.

## Built with

- React
- Vite
- React Router
- Axios
- jsPDF (for invoices)

## How to run

You need [Node.js](https://nodejs.org/) installed.

```bash
cd frontend
npm install
npm run demo
```

Then open http://localhost:3000.

`npm run demo` runs the website with sample data, so it works without the backend. On the login page click **Login as User** or **Login as Admin**. To log in as a bus company, use `company@demo.test` with any password.

Try searching **Lahore to Islamabad** and use the promo code `MUSAFIR10` at checkout.

When the backend is ready, use `npm run dev` instead and it will connect to the backend on port 5000.

> The bus company names in the sample data are real Pakistani companies, used only to make the demo look realistic. The trips, prices, ratings and reviews are made up.

## Project structure

```
frontend/
  src/
    components/   Navbar, Chatbot, Invoice, popups
    context/      Login state
    demo/         Sample data for demo mode
    pages/
      passenger/  Passenger pages
      company/    Bus company pages
      admin/      Admin pages
    utils/        API setup
```

## Team

- **Nawaf Ahmed**: project setup, login and register, passenger booking pages, sample data
- **Syed Annas Ali**: admin dashboard, bus company dashboard, chatbot, README
