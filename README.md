# LoopCycle Waste Management MVP

A frontend-first Next.js MVP for a hackathon waste-management platform.

## What is included

### Citizen workspace

- Demo role switching for citizen and admin accounts
- Waste report flow with:
  - Plastic, Organic, E-waste, Glass, and Other categories
  - Photo upload state
  - Location, preferred date, quantity, and description
  - Rule-based waste classification guidance
- Pickup request tracking
- Status flow: Pending → Assigned → Collected → Completed
- Notifications inbox
- Profile and collection preferences
- Personal impact summary

### Admin workspace

- Operations dashboard
- Total reports, pending requests, collected waste, and active-user metrics
- Collection request table
- Status management for every request
- Waste-by-category analytics
- Live activity feed
- Admin/citizen workspace switching

## Project structure

```text
.
├── app/
│   ├── globals.css      # Complete design system and responsive layout
│   ├── layout.tsx       # Root metadata and app shell
│   └── page.tsx         # MVP screens, mock data, and client interactions
├── .gitignore
├── next-env.d.ts
├── package.json
├── package-lock.json
└── tsconfig.json
```

## MongoDB setup

Copy `.env.example` to `.env.local` and set:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/loopcycle
AUTH_SECRET=use-a-long-random-secret
```

Use a local MongoDB instance for development. Never commit `.env.local` or real credentials.

The authentication API provides:

- `POST /api/auth/register` — creates a Citizen account with a scrypt-hashed password
- `POST /api/auth/login` — verifies credentials and creates an HTTP-only signed session cookie
- `GET /api/auth/me` — returns the current session
- `POST /api/auth/logout` — clears the session

Public registration always creates a Citizen. Create Admin users directly in MongoDB or through a protected provisioning workflow; do not expose an open Admin registration form.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Use **Switch account** in the sidebar to explore the Admin workspace. Authentication and credentials are stored through MongoDB. Waste request data is still mock state in this MVP; the request types and update functions in `app/page.tsx` are ready to be replaced with MongoDB-backed API actions.

## Production validation

```bash
npm run build
```
