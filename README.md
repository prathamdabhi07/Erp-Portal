# EduSphere ERP Portal

A web-based **Education Resource Planning (ERP) System** designed to simplify academic and administrative activities in educational institutions. The portal provides role-based dashboards for administrators, staff, and students.

## 🌐 Live Demo

**Website Link:https://eduspehere-erp-production.up.railway.app/**  

## 📌 Project Overview

EduSphere ERP is a full-stack web application developed to manage essential educational workflows through a centralized portal. It includes authentication, student and staff management, attendance tracking, academic results, fee records, assignments, notices, and downloadable resources.

This project was built as a portfolio project to demonstrate full-stack web development, REST API integration, database management, and role-based access control.

## ✨ Key Features

- **Role-Based Login:** Separate access for Admin, Staff, and Students.
- **Admin Dashboard:** Overview of students, staff, and academic records.
- **Student Management:** Manage student information and academic details.
- **Staff Management:** Maintain staff profiles and related responsibilities.
- **Attendance Management:** Record and view student attendance.
- **Results Management:** Store examination marks and academic results.
- **Fee Management:** Maintain fee records and payment status.
- **Assignment Management:** Create assignments and allow student submissions.
- **Notice Board:** Publish and manage important announcements.
- **Download Center:** Upload and access educational resources.
- **Secure Authentication:** Password hashing, authenticated API requests, and protected routes.

## 🛠️ Technology Stack

**Frontend**
- HTML5
- CSS3
- JavaScript

**Backend**
- Node.js
- Express.js
- REST APIs

**Database**
- SQLite

**Security**
- bcryptjs for password hashing
- JSON Web Tokens (JWT) for authentication
- Helmet for HTTP security headers
- Express Rate Limit for request limiting

## 🔑 Demo Login Credentials

Use the following accounts to explore the demo website.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@edusphere.com` | `Admin@123` |
| Student | `gamingmind761@gmail.com` | Not verified — set a demo password |
| Staff | `akparmar7359@gmail.com` | Not verified — set a demo password |

**Important:** The Admin password above is the default password configured in the backend for first-time database initialization. Student and Staff passwords are stored as password hashes and have not been verified. Configure working demo accounts before publishing the live website.

These are demo credentials, not real user credentials intended for production use. Change default passwords and never publish private production credentials.

## 💻 Run the Project Locally

### Prerequisites

- Node.js 22.5 or newer
- npm
- Git (optional)

### Installation

**1. Clone the repository**

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

Alternatively, download the repository ZIP and extract it.

**2. Open the project directory**

```bash
cd Erp-Portal-main
```

**3. Install dependencies**

```bash
npm install
```

If PowerShell blocks `npm.ps1` on Windows, use:

```powershell
npm.cmd install
```

**4. Start the server**

```bash
npm start
```

On Windows PowerShell, you can also run:

```powershell
npm.cmd start
```

**5. Open the website**

```text
http://localhost:3000
```

Keep the terminal open while using the local website.

## 📂 Project Structure

```text
Erp-Portal-main/
├── public/
│   └── index.html
├── data/
│   ├── erp.db
│   ├── secret.key
│   └── uploads/
├── server.js
├── package.json
└── README.md
```

- `public/index.html` — Frontend interface
- `server.js` — Express server and API endpoints
- `data/erp.db` — SQLite database
- `data/secret.key` — JWT signing secret
- `data/uploads/` — Uploaded files
- `package.json` — Dependencies and start script

## 🔒 Security Notes

- Passwords are hashed using bcryptjs rather than stored as plain text.
- Protected API endpoints use authentication and role-based authorization.
- Never commit private keys, production databases, real user data, or uploaded confidential files to a public repository.
- Change the default Admin password before deploying the application publicly.
- Use environment variables or a secure secret-management solution for production secrets.

## 🎯 Project Objectives

- Build a functional full-stack web application.
- Implement role-based authentication and authorization.
- Integrate a relational database with backend APIs.
- Organize academic and administrative workflows.
- Demonstrate practical software development skills for interviews and portfolio review.

## 🚀 Future Enhancements

- Email notifications and password recovery.
- Improved analytics and reporting.
- Online fee payment integration.
- Automated testing and deployment.
- Enhanced mobile responsiveness and accessibility.


⭐ If you find this project useful, consider starring the repository.
