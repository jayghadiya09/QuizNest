# QuizNest 🚀

> **Secure, real-time examination, built for integrity.**

QuizNest is a production-grade, Zero-Trust online examination orchestration system designed for universities, coaching institutes, and organizations requiring airtight academic integrity, real-time monitoring, and a modern user experience.

---

## 🏗️ Technical Stack & Architecture

QuizNest is built as a modular monorepo containing two main packages:
1. **Frontend (`/frontend`)**: React 19 + TypeScript + Vite + Tailwind CSS + TanStack Query + React Router v6.
2. **Backend (`/backend`)**: Node.js + Express + TypeScript + MongoDB + Socket.IO for real-time telemetry.

### Tri-Node Architecture
The platform is organized into three role-based logical portals:
- **Student Examination Node (`/student/*`)**: Secure interface for taking exams with window-blur proctor locks.
- **Teacher Command Center (`/teacher/*`)**: Create subjects, configure exam templates, add questions manually or via automatic difficulty-bucket generators, and monitor ongoing exams in real-time.
- **Command Node (`/admin/*`)**: "God Mode" dashboard for user administration, audit logs, system configurations, and aggregate statistics.

---

## 🔒 Security & "Session Warden" Proctoring

- **Strike Detection**: The client-side warden tracks tab visibility and window focus changes.
- **Auto-Disqualification**: On the third focus loss event (strike), the exam is immediately finalized, the score is set to `0`, and a `cheatingDetected: true` flag is recorded.
- **Version Concurrency Guard**: Attempt logs are decoupled from Mongoose version checking (`versionKey: false`) to prevent version collisions during parallel socket/HTTP updates.

---

## 🚀 Getting Started

### 🐳 Setup via Docker (One-Click Deployment)
Ensure you have Docker and Docker Compose installed:

```bash
# Build and run all services (Mongo, Backend API, Nginx Frontend client)
docker-compose up -d --build
```
- **Vite Portal**: Access the user interface at [http://localhost:5173](http://localhost:5173)
- **Node API Service**: Access the backend endpoint at [http://localhost:5001](http://localhost:5001)

### 🛠️ Setup via Local Terminal
Ensure you have MongoDB running locally:

1. **Install root dependencies**:
   ```bash
   npm install
   ```
2. **Run Dev Servers Concurrently**:
   ```bash
   npm run dev
   ```
3. **Seed/Reset Database**:
   To drop the local database and re-seed all collections:
   ```bash
   npm run db:reset
   ```

---

## 🔑 Seeded Demo Credentials

On startup or database reset, the following credentials are automatically seeded:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@quiznest.com` | `password123` |
| **Teacher** | `teacher@quiznest.com` | `password123` |
| **Student** | `student@quiznest.com` | `password123` |

---

## ⚙️ Environment Variables

### Backend Configuration (`/backend/.env`)
- `PORT`: Port the Express API server listens on (default: `5001`).
- `MONGODB_URI`: Database connection URI (default: `mongodb://localhost:27017/quiznest`).
- `JWT_ACCESS_SECRET`: Signing secret for JWT access tokens.
- `JWT_REFRESH_SECRET`: Signing secret for JWT refresh tokens.
