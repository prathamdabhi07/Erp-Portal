# Erp-Portal
Role-based college ERP (Admin / Staff / Student) built with Node.js, Express, SQLite and JWT auth
# EduSphere ERP

A role-based college management system (ERP) with separate dashboards for Admin, Staff and Students. Built with Node.js, Express and SQLite.

## Live Demo
🔗 <aapki live site ka link>

> Note: Hosted on a free tier, so the first load may take up to a minute. This is a demo project, not for real use.

## Demo Logins
| Role | Email | Password |
|---------|--------------------------|-------------|
| Admin | admin@edusphere.com | Admin@123 |
| Staff | <ashvinkparmar7359@gmail.com> | <123456> |
| Student | <gamingmind761@gmail.com> | <password> |

## Features
**Admin**
- Add, edit and delete staff and students
- Manage class routines and exam schedules
- Fee management with payment receipts
- Full access to all modules

**Staff**
- Add and edit students
- Mark attendance
- Enter marks and results
- Post notices, create assignments, upload downloads

**Student**
- View own profile, attendance, results, fees and routine
- Submit assignments (file upload)
- Send feedback and ratings

**Common**
- Optional profile photo
- Change password
- Secure file uploads (type and size restricted)

## Tech Stack
- **Backend:** Node.js, Express
- **Database:** SQLite (`node:sqlite`)
- **Auth:** JWT, bcrypt password hashing
- **Security:** Helmet, login rate limiting, role-based access control
- **File uploads:** Multer
- **Frontend:** HTML, CSS, JavaScript (single page)

## Run Locally
Requires Node.js 22.5 or newer.

```bash
npm install
npm start
```
Open http://localhost:3000

On first run a default admin is created: `admin@edusphere.com` / `Admin@123`.

## Project Structure
```
edusphere-erp/
├── server.js        # API, auth, database setup
├── public/
│   └── index.html   # Frontend
├── data/            # SQLite DB and uploads (created at runtime)
└── package.json
```

## Possible Improvements
- Move to PostgreSQL and cloud storage (S3) for production
- Email notifications and password reset
- Automated tests and CI
