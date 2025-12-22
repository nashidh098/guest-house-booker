# MOONLIGHT INN - Room Booking System

## Overview
A complete guest house room booking web application for MOONLIGHT INN in Maldives. The system allows customers to book rooms, upload payment slips, and receive invoices. Administrators can view and manage all bookings.

## Tech Stack
- **Frontend**: React with TypeScript, Vite, TailwindCSS, Shadcn/UI components
- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Drizzle ORM
- **File Upload**: Multer for payment slip handling

## Features
- Customer booking form with room selection and date pickers
- Automatic price calculation (600 MVR/night, USD conversion at 19.50 rate)
- Room availability checking (prevents double bookings)
- Bank transfer details with copy-to-clipboard
- Payment slip image upload
- Invoice generation with PDF download and share options
- Admin dashboard with booking management

## Project Structure
```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── pages/         # Route pages (home, invoice, admin)
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and query client
├── server/                 # Backend Express server
│   ├── routes.ts          # API endpoints
│   ├── storage.ts         # Database storage layer
│   ├── db.ts              # PostgreSQL connection
│   └── replit_integrations/  # Replit integrations
│       └── object_storage/   # Object storage for gallery images
├── shared/                 # Shared types and schemas
│   └── schema.ts          # Drizzle models and Zod validation
└── uploads/               # Uploaded payment slip files (legacy)
```

## File Storage
- **Gallery images**: Stored in Replit Object Storage (persists across deployments)
- **Payment slips**: Stored locally in `/uploads` directory

## API Endpoints
- `GET /api/bookings` - Get all bookings
- `GET /api/bookings/:id` - Get single booking
- `POST /api/bookings` - Create new booking (multipart/form-data)
- `PATCH /api/bookings/:id/confirm` - Confirm a booking
- `GET /api/bookings/check-availability` - Check room availability

## Routes
- `/` - Home page with booking form
- `/invoice/:id` - Invoice view with PDF download
- `/admin` - Admin dashboard

## Database Schema
### Bookings Table
- id (UUID, primary key)
- fullName, idNumber (guest details)
- roomNumber (1-4, currently only 1-2 available)
- checkInDate, checkOutDate
- totalNights, totalMVR, totalUSD
- paymentSlip (filename)
- status (Pending/Confirmed)
- bookingDate

## Running the Project
The application runs with `npm run dev` which starts:
- Express server on port 5000
- Vite dev server for frontend

## Environment Variables
- DATABASE_URL - PostgreSQL connection string (auto-configured)
- SESSION_SECRET - Session encryption key

## Location & Contact
- **Location**: Sh.Maaungoodhoo, Maldives
- **Contact**: 9994026

## Bank Account Details
- **Bank of Maldives (USD)**: 7730000528706 - Account Name: MOHAMED I WAHEED
- **Bank of Maldives (MVR)**: 7770000168454 - Account Name: W COLLECTION
- **Maldives Islamic Bank (MVR)**: 90501400043381000 - Account Name: W COLLECTION

## Pricing
- Daily room rate: 600 MVR / $30 USD per night
- USD Exchange rate: 1 USD = 20 MVR
