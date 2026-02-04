# ⚡ Commands Cheat Sheet

Quick reference for all commands needed to run and manage the application.

## 📥 Initial Setup

### Backend Setup
```powershell
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
```

### Frontend Setup
```powershell
cd frontend
npm install
cp .env.local.example .env.local
# Default config works, edit if needed
```

---

## 🚀 Running the Application

### Start Backend (Development)
```powershell
cd backend
npm run dev
```
**Output:** Server runs on http://localhost:5000

### Start Frontend (Development)
```powershell
cd frontend
npm run dev
```
**Output:** App runs on http://localhost:3000

### Start Both (Two Terminals)
**Terminal 1:**
```powershell
cd backend ; npm run dev
```

**Terminal 2:**
```powershell
cd frontend ; npm run dev
```

---

## 🏗️ Building for Production

### Build Backend
```powershell
cd backend
npm run build
```
**Output:** Compiled files in `dist/`

### Run Backend (Production)
```powershell
cd backend
npm start
```

### Build Frontend
```powershell
cd frontend
npm run build
```
**Output:** Optimized build in `.next/`

### Run Frontend (Production)
```powershell
cd frontend
npm start
```

---

## 🧪 Testing with cURL

### Health Check
```powershell
curl http://localhost:5000/health
```

### Signup
```powershell
curl -X POST http://localhost:5000/api/auth/signup `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"test@example.com\",\"password\":\"test123\"}'
```

### Login
```powershell
curl -X POST http://localhost:5000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"test@example.com\",\"password\":\"test123\"}'
```

### Get User (Replace YOUR_TOKEN)
```powershell
curl http://localhost:5000/api/auth/me `
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🧹 Cleanup

### Remove node_modules (Backend)
```powershell
cd backend
Remove-Item -Recurse -Force node_modules
```

### Remove node_modules (Frontend)
```powershell
cd frontend
Remove-Item -Recurse -Force node_modules
```

### Remove build artifacts
```powershell
# Backend
cd backend
Remove-Item -Recurse -Force dist

# Frontend
cd frontend
Remove-Item -Recurse -Force .next
```

### Fresh Install (Backend)
```powershell
cd backend
Remove-Item -Recurse -Force node_modules
npm install
```

### Fresh Install (Frontend)
```powershell
cd frontend
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force .next
npm install
```

---

## 🔧 Environment Variables

### Backend (.env)
```env
DATABASE_URL=mongodb://localhost:27017/auth_app
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=10
PORT=5000
ENABLED_MODULES=auth
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

---

## 🎛️ Feature Flags

### Disable Auth Module

**Backend:**
```env
# In backend/.env
ENABLED_MODULES=
```

**Frontend:**
```typescript
// In frontend/config/features.ts
export const FEATURES = {
  auth: false
};
```

### Enable Auth Module

**Backend:**
```env
# In backend/.env
ENABLED_MODULES=auth
```

**Frontend:**
```typescript
// In frontend/config/features.ts
export const FEATURES = {
  auth: true
};
```

---

## 🗄️ Database Commands

### Start MongoDB (Windows Service)
```powershell
net start MongoDB
```

### Stop MongoDB (Windows Service)
```powershell
net stop MongoDB
```

### Connect to MongoDB Shell
```powershell
mongosh
```

### View Users Collection
```javascript
// In mongosh
use auth_app
db.users.find()
```

### Drop Database (Reset)
```javascript
// In mongosh
use auth_app
db.dropDatabase()
```

---

## 📦 NPM Scripts Reference

### Backend Scripts
```powershell
npm run dev     # Start development server (ts-node-dev)
npm run build   # Compile TypeScript to JavaScript
npm start       # Run compiled JavaScript (production)
```

### Frontend Scripts
```powershell
npm run dev     # Start development server (hot reload)
npm run build   # Build optimized production bundle
npm start       # Run production build
npm run lint    # Run ESLint
```

---

## 🔍 Debugging

### Check Backend Logs
```powershell
cd backend
npm run dev
# Watch console output for errors
```

### Check Frontend Logs
```powershell
cd frontend
npm run dev
# Watch console output for errors
# Also check browser console (F12)
```

### Test Database Connection
```powershell
cd backend
# In server.ts, the connection logs will show:
# ✅ Database connected successfully
# OR
# ❌ Failed to start server: [error details]
```

### Verify Environment Variables
```powershell
# Backend
cd backend
cat .env

# Frontend
cd frontend
cat .env.local
```

---

## 🌐 URLs Reference

| Service  | Development URL            | Description          |
|----------|---------------------------|----------------------|
| Frontend | http://localhost:3000      | Next.js app          |
| Backend  | http://localhost:5000      | Express API          |
| Health   | http://localhost:5000/health | Health check        |
| Signup   | http://localhost:3000/signup | Signup page         |
| Login    | http://localhost:3000/login  | Login page          |

---

## 📱 Browser Testing

1. Open http://localhost:3000
2. Open browser DevTools (F12)
3. Go to Network tab to see API calls
4. Go to Console tab to see errors/logs
5. Go to Application → Local Storage to see auth token

---

## 🆘 Troubleshooting Commands

### Port Already in Use (Backend)
```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill process (replace PID)
taskkill /PID <PID> /F
```

### Port Already in Use (Frontend)
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process (replace PID)
taskkill /PID <PID> /F
```

### Clear npm Cache
```powershell
npm cache clean --force
```

### Check Node/npm Versions
```powershell
node --version    # Should be v18+
npm --version     # Should be v9+
```

---

## 📚 Quick Links

- [README.md](README.md) - Full documentation
- [QUICKSTART.md](QUICKSTART.md) - 5-minute setup guide
- [ARCHITECTURE.md](ARCHITECTURE.md) - Design patterns
- [DELIVERY.md](DELIVERY.md) - Project summary

---

**💡 Tip:** Keep this file open in a separate editor window for quick reference while developing!
