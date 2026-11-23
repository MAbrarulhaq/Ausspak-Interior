# Auspak Interior – Website (React frontend + FastAPI backend)

Website for **AUSPAK INTERIOR** (Golra Road, Islamabad): design gallery, enquiries with reference images, verified customer
order tracking, customer accounts with favourites, and an admin area for staff.

* **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router, React Hook Form, Zod, Axios, Lucide icons (`frontend/`)
* **Backend:** FastAPI, SQLAlchemy 2, Alembic, PostgreSQL, JWT + Argon2 (`backend/`). Full API documentation: `backend/README.md`
* The two parts run separately. In development the frontend proxies `/api` and `/media` to the backend.

## Pages

| Route | Who | What |
|---|---|---|
| `/`, `/services`, `/about` | everyone | Marketing pages |
| `/projects`, `/projects/:slug` | everyone | Design gallery from the database: category filter, search, paging, image gallery, related designs, favourite heart |
| `/contact` | everyone | Enquiry form with up to 5 reference images, "question about my order", business WhatsApp/email |
| `/track-order` | everyone | Order number + phone: 5-stage timeline, delay reason, date changes, commitments |
| `/login`, `/signup` | everyone | Customer accounts (signup always creates a customer) |
| `/account` | customer | Favourite designs and order notifications |
| `/admin` | staff, admin | Dashboard (limited for staff) |
| `/admin/orders`, `/admin/orders/new`, `/admin/orders/:id` | staff, admin | Create/edit orders, post updates, delays, date revisions, commitments, manual messages |
| `/admin/enquiries`, `/admin/enquiries/:id` | staff, admin | Enquiries, private reference images, create an order from an enquiry |
| `/admin/notifications` | staff, admin | Notification history, retry, WhatsApp click-to-chat links |
| `/admin/designs`, `/admin/designs/:id` | **admin only** | Categories, designs, publish/archive, image upload |
| `/admin/users` | **admin only** | Create staff/admin accounts, change roles, deactivate |

## Required software (Windows)
Node.js 20+, Python 3.11+, Docker Desktop (for PostgreSQL), VS Code.

## Run it locally (3 terminals, from the `auspak-interior` folder)

**1. Database**
```powershell
docker compose up -d
```

**2. Backend** (first time)
```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```
Open `backend\.env` and set `JWT_SECRET` (generate one with `python -c "import secrets; print(secrets.token_urlsafe(48))"`), then:
```powershell
alembic upgrade head
python -m app.seed
python -m app.cli create-admin --email you@yourdomain.com --name "Your Name"
uvicorn app.main:app --reload --port 8000
```
(`create-admin` asks for the password. Reserved email domains such as `.test` are rejected.)

**3. Frontend**
```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

| What | URL |
|---|---|
| Website | http://localhost:5173 |
| Admin area | http://localhost:5173/admin (log in with the admin you created) |
| API docs (Swagger) | http://localhost:8000/docs |

Demo data for testing the public tracking page: order `AUS-DEMO0001` with phone `0300 0000001` (in progress, delayed, date revised, one commitment),
`AUS-DEMO0002` / `0300 0000002` (completed), `AUS-DEMO0003` / `0300 0000003` (designing). The 9 seeded designs are labelled "Sample project".

## Company contact details
Business WhatsApp, email, address and Facebook are set in `backend/.env` (`BUSINESS_*`) and served by `GET /api/v1/site/contact`.
`frontend/src/data/siteConfig.ts` keeps the same values as a fallback. Office phone numbers are not set yet (placeholders).

## Tests
```powershell
# Backend: 95 tests against a separate database
docker exec -it auspak-postgres psql -U auspak -d auspak -c "CREATE DATABASE auspak_test;"   # once
cd backend ; venv\Scripts\activate ; pytest -q

# Frontend type check + production build
cd ..\frontend ; npm run typecheck ; npm run build

# Browser test of the whole site (185 checks). Needs both servers running and `pip install playwright psycopg[binary] httpx pillow`, `playwright install chromium`.
# Start the backend with high rate limits first (the test logs in many times):
#   set LOGIN_RATE_LIMIT=2000 & set ENQUIRY_RATE_LIMIT=2000 & set TRACK_RATE_LIMIT=2000 & set SIGNUP_RATE_LIMIT=2000
set ADMIN_EMAIL=you@yourdomain.com & set ADMIN_PASSWORD=your-password & python ..\qa\e2e_frontend.py
```
The browser test creates records named "E2E ..." in your development database; run it on a throw-away database.

## Notifications (what is and is not automatic)
* Every order event creates a notification record per channel. Nothing is reported as "sent" unless a real provider accepted it.
* **Email:** set `EMAIL_PROVIDER=smtp` and a Gmail *App Password* in `backend/.env` (see `backend/README.md`). Not yet tested against Gmail.
* **WhatsApp:** not automatic yet (needs the WhatsApp Business API). The admin Notifications page gives a click-to-chat link per message so staff can send it by hand.

## Troubleshooting
| Problem | Fix |
|---|---|
| Backend will not start: "JWT_SECRET must be..." | Set `JWT_SECRET` in `backend/.env` (32+ random characters) |
| Site shows "Cannot reach the server" | Backend not running on port 8000 |
| Gallery is empty | Run `python -m app.seed`, or publish designs in `/admin/designs` |
| Design images missing | The backend serves them from `backend/storage`; keep that folder. The vite proxy forwards `/media` |
| Cannot log in as admin | Create one with `python -m app.cli create-admin ...` |
| "Too many attempts" | Rate limit (login 10 / tracking 10 per 5 minutes per IP). Wait, or restart the backend |
| Port 5432/5173/8000 in use | Stop the other program or change the port (`VITE_PROXY_TARGET` in `frontend/.env` if the backend port changes) |

## Before going live (not done)
Real office phone numbers and business hours; real project photographs (replace the sample designs); real customer reviews (the Home page testimonials are still labelled samples);
OTP verification for order tracking; automatic WhatsApp; production hosting (HTTPS, database credentials, CORS, shared rate-limit store); privacy policy and terms pages if required.
