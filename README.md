# ZingHR-Inspired HRMS Clone (Next.js Full Stack)

This project now runs on Next.js App Router (frontend + backend APIs in one app).

## Prerequisites

- Node.js 20+
- MongoDB (local or remote)

## Environment Variables

Create/update `.env` (or `.env.local`) with:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/admin
```

## Run Locally

1. Install dependencies:
   `npm install`
2. Start development server:
   `npm run dev`
3. Open:
   `http://localhost:3000`

## Build and Run Production

1. Build:
   `npm run build`
2. Start:
   `npm run start`

## API Endpoints

All APIs are served from Next route handlers under `/api/*`:

- `/api/health`
- `/api/auth/login`
- `/api/auth/register`
- `/api/dashboard`
- `/api/users`
- `/api/attendance`
- `/api/leave`
- `/api/payroll`
- `/api/settings`
