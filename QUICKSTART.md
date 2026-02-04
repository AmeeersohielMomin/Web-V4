# 🚀 Quick Start Guide

Get the authentication system running in under 5 minutes.

## Prerequisites

- Node.js v18+ installed
- MongoDB running locally (or a MongoDB Atlas connection string)

## Step-by-Step Setup

### 1. Install Backend Dependencies

```powershell
cd backend
npm install
```

### 2. Configure Backend Environment

```powershell
# Create .env file from example
cp .env.example .env
```

**Edit backend/.env:**
- Set `DATABASE_URL` to your MongoDB connection string
- Change `JWT_SECRET` to a secure random string
- Keep other defaults or customize as needed

### 3. Install Frontend Dependencies

```powershell
cd frontend
npm install
```

### 4. Configure Frontend Environment

```powershell
# Create .env.local file from example
cp .env.local.example .env.local
```

The default configuration should work. Edit only if you changed the backend port.

### 5. Start MongoDB

If using local MongoDB:

```powershell
# Make sure MongoDB is running
# For Windows: MongoDB should be running as a service
# Or start manually if needed
```

### 6. Start the Backend Server

Open a new terminal:

```powershell
cd backend
npm run dev
```

You should see:
```
✅ Database connected successfully
✅ Auth module enabled and routes registered
✅ Server running on port 5000
```

### 7. Start the Frontend

Open another terminal:

```powershell
cd frontend
npm run dev
```

You should see:
```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

### 8. Test the Application

1. Open http://localhost:3000
2. Click **"Sign Up"**
3. Enter an email and password (min 6 characters)
4. Submit - you should be redirected to home page showing your email
5. Click **"Logout"**
6. Click **"Login"** and sign in again

## Troubleshooting

### Backend won't start
- **Check MongoDB:** Ensure MongoDB is running
- **Check .env:** Verify all required variables are set
- **Check port:** Make sure port 5000 is not in use

### Frontend won't connect
- **Check backend:** Ensure backend is running on port 5000
- **Check .env.local:** Verify `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000`
- **Check CORS:** Backend has CORS enabled by default

### Database connection fails
- **MongoDB URL:** Verify your `DATABASE_URL` in backend/.env
- **MongoDB running:** Check if MongoDB service is active
- **Network:** Ensure no firewall blocking connections

### JWT errors
- **JWT_SECRET:** Must be set in backend/.env
- **Token expired:** Default is 7 days, check `JWT_EXPIRES_IN`

## Testing with Postman/cURL

### Signup
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Get User (replace TOKEN)
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Next Steps

- Read the full [README.md](README.md) for architecture details
- Explore the code to understand the module system
- Try disabling the auth feature using feature flags
- Consider adding more modules using the same pattern

---

**Everything working? You now have a fully functional auth system!** 🎉
