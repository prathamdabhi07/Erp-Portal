# EduSphere ERP

## How to run (Windows / Mac / Linux)
1. Install Node.js 22.5 or newer (LTS 24 is fine): https://nodejs.org
2. In this folder, open Command Prompt (or the VS Code terminal) and run:
   npm install
   npm start
3. Open http://localhost:3000 in your browser.

If PowerShell blocks npm, use Command Prompt or run `npm.cmd start`.

## Roles
- Admin: add / edit / delete staff and students, routines, fees, everything
- Staff: add / edit students, attendance, marks, notices, exams, assignments, downloads
- Student: view own data, submit assignments, send feedback
- Profile photo is optional everywhere

## Data
- Database: data/erp.db (SQLite) - back this file up regularly
- Uploaded files: data/uploads/
- Passwords are stored hashed (bcrypt) and cannot be read back; admin can reset a user's password with Edit.
- The data folder in this zip already contains the users you added earlier.
